"""
mqtt_consumer.py — Brésil
Souscrit au topic MQTT local, insère les mesures en BDD
et déclenche creer_alerte_si_hors_plage() si hors seuil.
"""
import json
import os
import psycopg2
import paho.mqtt.client as mqtt

# ── Config via variables d'environnement (plus de valeurs hardcodées) ─────────
DB_CONFIG = {
    "dbname":   os.getenv("DB_NAME",     "bdd_bresil"),
    "user":     os.getenv("DB_USER",     "user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host":     os.getenv("DB_HOST",     "db"),
    "port":     os.getenv("DB_PORT",     "5432"),
}
MQTT_HOST  = os.getenv("MQTT_HOST", "mqtt")
MQTT_PORT  = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "bresil/mesures")

# ── Seuils (identiques à main.py) ─────────────────────────────────────────────
SEUILS = {"Brésil": {"temperature": 29, "humidite": 55}}
TOLERANCE_TEMPERATURE = 3
TOLERANCE_HUMIDITE    = 2


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def get_pays_local(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT nom FROM pays LIMIT 1;")
        row = cur.fetchone()
    return row[0] if row else "Brésil"


def creer_alerte_si_hors_plage(conn, type_mesure: str, valeur: float, capteur_id: int):
    seuil     = SEUILS["Brésil"][type_mesure]
    tolerance = TOLERANCE_TEMPERATURE if type_mesure == "temperature" else TOLERANCE_HUMIDITE
    mini, maxi = seuil - tolerance, seuil + tolerance

    if valeur < mini or valeur > maxi:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO alerte (type, message, valeur, seuil, capteur_id)
                VALUES (%s, %s, %s, %s, %s);
            """, (
                type_mesure,
                f"{type_mesure} hors plage : {valeur} (attendu {mini}–{maxi})",
                valeur, maxi, capteur_id
            ))
        print(f"[BRESIL] Alerte {type_mesure} : {valeur} hors [{mini}, {maxi}]")


def on_connect(client, userdata, flags, rc):
    print(f"[BRESIL] Connecté au broker MQTT (rc={rc})")
    client.subscribe(MQTT_TOPIC)


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        temperature    = data.get("temperature")
        humidite       = data.get("humidite")
        capteur_temp_id = data.get("capteur_temp_id", 1)
        capteur_hum_id  = data.get("capteur_hum_id",  2)

        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                if temperature is not None:
                    cur.execute(
                        "INSERT INTO temperature (valeur, capteur_id) VALUES (%s, %s);",
                        (temperature, capteur_temp_id)
                    )
                    creer_alerte_si_hors_plage(conn, "temperature",
                                               temperature, capteur_temp_id)

                if humidite is not None:
                    cur.execute(
                        "INSERT INTO humidite (valeur, capteur_id) VALUES (%s, %s);",
                        (humidite, capteur_hum_id)
                    )
                    creer_alerte_si_hors_plage(conn, "humidite",
                                               humidite, capteur_hum_id)

        conn.close()
        print(f"[BRESIL] Mesure insérée : {data}")

    except Exception as exc:
        print(f"[BRESIL] Erreur : {exc}")


client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_forever()
