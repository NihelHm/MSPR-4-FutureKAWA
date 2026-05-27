"""
alerting_engine.py — Moteur d'alerting FutureKawa
Compatible avec le schéma init.sql existant (tables : temperature, humidite, alerte, lot)
Tourne en service indépendant dans Docker Compose, partage la même BDD que le backend.

Règles (CDC §III.4) :
  - Alerte si température ou humidité hors seuil ± tolérance par pays
  - Alerte si lot stocké depuis > 365 jours
  - Email au responsable d'exploitation du pays concerné
  - Vérification toutes les CHECK_INTERVAL secondes (défaut : 300)
"""

import logging
import os
import time
import smtplib
import psycopg2
import psycopg2.extras
from datetime import date, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── Configuration BDD (mêmes variables que le backend) ───────────────────────
DB_CONFIG = {
    "dbname":   os.getenv("DB_NAME",     "bdd_bresil"),
    "user":     os.getenv("DB_USER",     "user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host":     os.getenv("DB_HOST",     "db"),
    "port":     os.getenv("DB_PORT",     "5432"),
}

# ── Configuration SMTP ────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST",     "smtp.futurekawa.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",     "alerting@futurekawa.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = "FutureKawa Alerting <alerting@futurekawa.com>"

# ── Responsable par pays (injecté via Docker Compose) ─────────────────────────
COUNTRY_MANAGERS = {
    "Brésil":   os.getenv("MANAGER_EMAIL", "responsable.bresil@futurekawa.com"),
    "Équateur": os.getenv("MANAGER_EMAIL", "responsable.equateur@futurekawa.com"),
    "Colombie": os.getenv("MANAGER_EMAIL", "responsable.colombie@futurekawa.com"),
}

# ── Seuils par pays — identiques à main.py ────────────────────────────────────
SEUILS = {
    "Brésil":   {"temperature": 29, "humidite": 55},
    "Équateur": {"temperature": 31, "humidite": 60},
    "Colombie": {"temperature": 26, "humidite": 80},
}
TOLERANCE_TEMPERATURE = 3
TOLERANCE_HUMIDITE    = 2
LOT_MAX_DAYS          = 365
CHECK_INTERVAL        = int(os.getenv("CHECK_INTERVAL", "300"))


# ── Connexion BDD ─────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(**DB_CONFIG)


# ── Récupération du pays local (même logique que get_pays_local() dans main.py)
def get_pays_local(conn) -> str:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT nom FROM pays LIMIT 1;")
        row = cur.fetchone()
    if not row:
        raise RuntimeError("Table pays vide — init.sql non exécuté ?")
    return row["nom"]


# ── Vérification hors plage (identique à est_hors_plage() dans main.py) ──────
def est_hors_plage(pays: str, type_mesure: str, valeur: float):
    seuil     = SEUILS[pays][type_mesure]
    tolerance = TOLERANCE_TEMPERATURE if type_mesure == "temperature" else TOLERANCE_HUMIDITE
    mini, maxi = seuil - tolerance, seuil + tolerance
    return valeur < mini or valeur > maxi, mini, maxi


# ── Anti-doublon : alerte déjà enregistrée dans les 24 dernières heures ───────
def alerte_recente(cur, type_alerte: str, capteur_id=None, lot_id=None) -> bool:
    if capteur_id:
        cur.execute("""
            SELECT 1 FROM alerte
            WHERE type = %s AND capteur_id = %s
              AND date_alerte > NOW() - INTERVAL '24 hours'
            LIMIT 1;
        """, (type_alerte, capteur_id))
    elif lot_id:
        cur.execute("""
            SELECT 1 FROM alerte
            WHERE type = %s AND lot_id = %s
              AND date_alerte > NOW() - INTERVAL '24 hours'
            LIMIT 1;
        """, (type_alerte, lot_id))
    else:
        return False
    return cur.fetchone() is not None


# ── Insertion alerte dans la table existante ──────────────────────────────────
def inserer_alerte(cur, type_a, message, valeur, seuil, capteur_id=None, lot_id=None):
    cur.execute("""
        INSERT INTO alerte (type, message, valeur, seuil, capteur_id, lot_id)
        VALUES (%s, %s, %s, %s, %s, %s);
    """, (type_a, message, valeur, seuil, capteur_id, lot_id))


# ── Envoi email ───────────────────────────────────────────────────────────────
def envoyer_email(pays: str, sujet: str, corps_html: str):
    destinataire = COUNTRY_MANAGERS.get(pays)
    if not destinataire:
        logger.warning("Pas de responsable configuré pour '%s'", pays)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = sujet
    msg["From"]    = SMTP_FROM
    msg["To"]      = destinataire
    msg.attach(MIMEText(corps_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as srv:
            srv.ehlo()
            srv.starttls()
            srv.ehlo()
            srv.login(SMTP_USER, SMTP_PASSWORD)
            srv.sendmail(SMTP_FROM, [destinataire], msg.as_string())
        logger.info("Email '%s' envoyé à %s", sujet, destinataire)
    except Exception as exc:
        logger.error("Échec envoi email : %s", exc)


# ── Contrôle des conditions (température + humidité) ─────────────────────────
def check_conditions(conn, pays: str):
    alertes = 0
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

        for type_mesure, table in [("temperature", "temperature"), ("humidite", "humidite")]:
            cur.execute(f"""
                SELECT DISTINCT ON (capteur_id)
                    capteur_id, valeur
                FROM {table}
                ORDER BY capteur_id, date_mesure DESC;
            """)
            mesures = cur.fetchall()

            for m in mesures:
                valeur, capteur_id = m["valeur"], m["capteur_id"]
                hors_plage, mini, maxi = est_hors_plage(pays, type_mesure, valeur)

                if not hors_plage:
                    continue
                if alerte_recente(cur, type_mesure, capteur_id=capteur_id):
                    continue

                unite = "°C" if type_mesure == "temperature" else "%"
                message = (
                    f"{type_mesure.capitalize()} hors plage : {valeur}{unite} "
                    f"(attendu {mini}–{maxi}{unite}) — capteur {capteur_id}"
                )
                inserer_alerte(cur, type_mesure, message, valeur, maxi,
                               capteur_id=capteur_id)

                label = "Température" if type_mesure == "temperature" else "Humidité"
                envoyer_email(pays,
                    f"[FutureKawa ALERTE] {label} hors seuil — {pays}",
                    f"""<html><body style="font-family:Arial,sans-serif">
                    <h2 style="color:#c0392b">⚠️ {label} hors plage</h2>
                    <p><b>Pays :</b> {pays}<br>
                    <b>Capteur :</b> #{capteur_id}<br>
                    <b>Valeur mesurée :</b> <span style="color:#c0392b;font-size:1.2em">
                      <b>{valeur}{unite}</b></span><br>
                    <b>Plage acceptable :</b> {mini}–{maxi}{unite}</p>
                    <p>Vérifiez les équipements de l'entrepôt.</p>
                    </body></html>"""
                )
                alertes += 1
                logger.info("[%s] Alerte %s capteur %s : %.1f%s",
                            pays, type_mesure, capteur_id, valeur, unite)
    return alertes


# ── Contrôle péremption des lots (> 365 jours) ───────────────────────────────
def check_peremption(conn, pays: str):
    alertes = 0
    cutoff = date.today() - timedelta(days=LOT_MAX_DAYS + 1)

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, reference, date_stockage
            FROM lot
            WHERE date_stockage IS NOT NULL
              AND date_stockage <= %s
              AND statut != 'périmé';
        """, (cutoff,))
        lots = cur.fetchall()

        for lot in lots:
            lot_id    = lot["id"]
            reference = lot["reference"]
            jours     = (date.today() - lot["date_stockage"]).days

            if alerte_recente(cur, "peremption", lot_id=lot_id):
                continue

            message = (
                f"Lot {reference} stocké depuis {jours} jours "
                f"(seuil : {LOT_MAX_DAYS} jours). Expédition prioritaire (FIFO)."
            )
            inserer_alerte(cur, "peremption", message, float(jours),
                           float(LOT_MAX_DAYS), lot_id=lot_id)

            # Mise à jour statut — même logique que calculer_statut_lot()
            cur.execute("UPDATE lot SET statut = 'périmé' WHERE id = %s;", (lot_id,))

            envoyer_email(pays,
                f"[FutureKawa ALERTE] Lot périmé — {reference} ({pays})",
                f"""<html><body style="font-family:Arial,sans-serif">
                <h2 style="color:#e67e22">⏰ Lot stocké depuis plus de 365 jours</h2>
                <p><b>Pays :</b> {pays}<br>
                <b>Référence :</b> <code>{reference}</code><br>
                <b>Durée :</b> <span style="color:#e67e22;font-size:1.2em">
                  <b>{jours} jours</b></span> (seuil : {LOT_MAX_DAYS} j)</p>
                <p>Planifiez l'expédition prioritaire conformément à la règle FIFO.</p>
                </body></html>"""
            )
            alertes += 1
            logger.info("[%s] Alerte péremption lot %s (%d j)", pays, reference, jours)
    return alertes


# ── Cycle complet ─────────────────────────────────────────────────────────────
def run_cycle():
    logger.info("── Cycle alerting ──")
    conn = get_conn()
    try:
        pays = get_pays_local(conn)
        with conn:
            nb_cond  = check_conditions(conn, pays)
            nb_peres = check_peremption(conn, pays)
        total = nb_cond + nb_peres
        if total:
            logger.info("Cycle : %d alerte(s) (%d conditions, %d péremptions)",
                        total, nb_cond, nb_peres)
        else:
            logger.info("Cycle : aucune alerte")
    except Exception as exc:
        logger.error("Erreur cycle : %s", exc, exc_info=True)
        conn.rollback()
    finally:
        conn.close()


# ── Boucle principale ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("FutureKawa Alerting Engine démarré (intervalle : %ds)", CHECK_INTERVAL)
    while True:
        run_cycle()
        time.sleep(CHECK_INTERVAL)
