# ==========================================================
# TESTS D'INTÉGRATION — test_integration_mqtt.py
# pytest bresil/tests/test_integration_mqtt.py -v
# ==========================================================
# Teste la chaîne complète :
#   MQTT publish → mqtt_consumer.py → INSERT BDD
#   → trigger SQL → INSERT alerte (si hors seuil)
#   → GET /lots/{id}/measures visible en API
#   → GET /alertes visible en API
#
# PRÉ-REQUIS :
#   cd bresil && docker-compose up -d
#   python mqtt_consumer.py  (dans un terminal séparé)
#   pip install -r tests/requirements-test.txt
# ==========================================================

import json
import time
import pytest
import requests
import psycopg2
import paho.mqtt.client as mqtt

# ----------------------------------------------------------
# CONFIG — adapte les ports si besoin
# ----------------------------------------------------------
API_URL       = "http://localhost:8000"
MQTT_HOST     = "localhost"
MQTT_PORT     = 1883
MQTT_TOPIC    = "bresil/mesures"

DB_CONFIG = dict(
    dbname="bdd_bresil", user="user",
    password="password", host="localhost", port=5433
)

# IDs définis dans init.sql (données initiales Brésil)
CAPTEUR_TEMP_ID = 1
CAPTEUR_HUM_ID  = 2
LOT_ID          = 1
SITE_ID         = 1


# ----------------------------------------------------------
# HELPERS BDD
# ----------------------------------------------------------
def db():
    return psycopg2.connect(**DB_CONFIG)

def count_table(table, extra_where=""):
    conn = db()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table} {extra_where};")
    n = cur.fetchone()[0]
    cur.close(); conn.close()
    return n

def last_value(table, capteur_id):
    conn = db()
    cur = conn.cursor()
    cur.execute(
        f"SELECT valeur FROM {table} WHERE capteur_id=%s "
        f"ORDER BY date_mesure DESC LIMIT 1;",
        (capteur_id,)
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None

def count_alertes_type(type_alerte):
    return count_table("alerte", f"WHERE type='{type_alerte}'")

def count_alertes_lot(lot_id):
    return count_table("alerte", f"WHERE lot_id={lot_id}")


# ----------------------------------------------------------
# HELPER MQTT
# ----------------------------------------------------------
def publish(payload: dict, wait: float = 2.5):
    """Publie sur bresil/mesures et attend que le consumer insère."""
    c = mqtt.Client()
    c.connect(MQTT_HOST, MQTT_PORT, 60)
    c.publish(MQTT_TOPIC, json.dumps(payload))
    c.disconnect()
    time.sleep(wait)


# ----------------------------------------------------------
# FIXTURE SANITY CHECK
# ----------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def check_services():
    try:
        r = requests.get(f"{API_URL}/", timeout=3)
        assert r.status_code == 200
    except Exception as e:
        pytest.skip(f"API non disponible : {e}")
    try:
        c = mqtt.Client()
        c.connect(MQTT_HOST, MQTT_PORT, 5)
        c.disconnect()
    except Exception as e:
        pytest.skip(f"Broker MQTT non disponible : {e}")


# ==========================================================
# 1. MQTT → BDD (persistance des mesures)
# ==========================================================
class TestMQTTVersBDD:

    def test_temperature_inseree_en_bdd(self):
        avant = count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}")
        publish({"temperature": 29.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        assert count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}") == avant + 1

    def test_humidite_inseree_en_bdd(self):
        avant = count_table("humidite", f"WHERE capteur_id={CAPTEUR_HUM_ID}")
        publish({"humidite": 55.0, "capteur_hum_id": CAPTEUR_HUM_ID})
        assert count_table("humidite", f"WHERE capteur_id={CAPTEUR_HUM_ID}") == avant + 1

    def test_temp_et_hum_inseres_ensemble(self):
        avant_t = count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}")
        avant_h = count_table("humidite",    f"WHERE capteur_id={CAPTEUR_HUM_ID}")
        publish({"temperature": 28.0, "humidite": 54.0,
                 "capteur_temp_id": CAPTEUR_TEMP_ID,
                 "capteur_hum_id":  CAPTEUR_HUM_ID})
        assert count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}") == avant_t + 1
        assert count_table("humidite",    f"WHERE capteur_id={CAPTEUR_HUM_ID}")  == avant_h + 1

    def test_valeur_temperature_exacte(self):
        publish({"temperature": 27.3, "capteur_temp_id": CAPTEUR_TEMP_ID})
        assert last_value("temperature", CAPTEUR_TEMP_ID) == 27.3

    def test_valeur_humidite_exacte(self):
        publish({"humidite": 53.7, "capteur_hum_id": CAPTEUR_HUM_ID})
        assert last_value("humidite", CAPTEUR_HUM_ID) == 53.7

    def test_payload_vide_pas_dinsertion(self):
        avant_t = count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}")
        avant_h = count_table("humidite",    f"WHERE capteur_id={CAPTEUR_HUM_ID}")
        publish({})
        assert count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}") == avant_t
        assert count_table("humidite",    f"WHERE capteur_id={CAPTEUR_HUM_ID}")  == avant_h

    def test_payload_json_invalide_consumer_reste_actif(self):
        """Consumer ne doit pas crasher sur un payload non-JSON."""
        c = mqtt.Client()
        c.connect(MQTT_HOST, MQTT_PORT, 60)
        c.publish(MQTT_TOPIC, "pas_du_json")
        c.disconnect()
        time.sleep(2.0)
        r = requests.get(f"{API_URL}/", timeout=3)
        assert r.status_code == 200


# ==========================================================
# 2. TRIGGER SQL → TABLE ALERTE
# ==========================================================
# Le trigger insert_alerte_si_hors_seuil() dans init_ryma.sql
# insère automatiquement dans alerte à chaque INSERT temperature/humidite
# hors tolérance. Brésil : 29°C ±3 / 55% ±2
class TestTriggerAlerteSQL:

    def test_temperature_hors_seuil_cree_alerte(self):
        """
        40°C >> 29+3=32 → le trigger doit insérer dans alerte.
        """
        avant = count_alertes_type("temperature")
        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        assert count_alertes_type("temperature") > avant, (
            "Aucune alerte temperature créée pour 40°C (seuil Brésil = 29±3°C)"
        )

    def test_humidite_hors_seuil_cree_alerte(self):
        """
        70% >> 55+2=57 → le trigger doit insérer dans alerte.
        """
        avant = count_alertes_type("humidite")
        publish({"humidite": 70.0, "capteur_hum_id": CAPTEUR_HUM_ID})
        assert count_alertes_type("humidite") > avant, (
            "Aucune alerte humidite créée pour 70% (seuil Brésil = 55±2%)"
        )

    def test_temperature_basse_hors_seuil_cree_alerte(self):
        """
        10°C << 29-3=26 → alerte.
        """
        avant = count_alertes_type("temperature")
        publish({"temperature": 10.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        assert count_alertes_type("temperature") > avant

    def test_conditions_normales_pas_dalerte(self):
        """
        29°C + 55% = valeurs idéales → aucune nouvelle alerte.
        """
        avant = count_table("alerte")
        publish({"temperature": 29.0, "humidite": 55.0,
                 "capteur_temp_id": CAPTEUR_TEMP_ID,
                 "capteur_hum_id":  CAPTEUR_HUM_ID})
        assert count_table("alerte") == avant, (
            "Des alertes ont été créées pour des valeurs normales (29°C / 55%)"
        )

    def test_conditions_dans_tolerance_pas_dalerte(self):
        """Valeurs dans la tolérance (31°C / 56%) → pas d'alerte."""
        avant = count_table("alerte")
        publish({"temperature": 31.0, "humidite": 56.0,
                 "capteur_temp_id": CAPTEUR_TEMP_ID,
                 "capteur_hum_id":  CAPTEUR_HUM_ID})
        assert count_table("alerte") == avant

   
    def test_message_alerte_contient_valeur(self):
        """Le message d'alerte doit mentionner la valeur mesurée."""
        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        conn = db()
        cur = conn.cursor()
        cur.execute(
            "SELECT message FROM alerte WHERE type='temperature' "
            "ORDER BY date_alerte DESC LIMIT 1;"
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        assert row is not None
        assert "40" in row[0], f"Message sans la valeur 40 : {row[0]}"


# ==========================================================
# 3. MQTT → API (mesures visibles via GET /lots/{id}/measures)
# ==========================================================
class TestMQTTVersAPI:

    def test_mesure_visible_apres_mqtt(self):
        """Après MQTT publish, GET /lots/{id}/measures retourne la valeur."""
        valeur_t = 28.5
        valeur_h = 54.5
        publish({"temperature": valeur_t, "humidite": valeur_h,
                 "capteur_temp_id": CAPTEUR_TEMP_ID,
                 "capteur_hum_id":  CAPTEUR_HUM_ID})

        
        r_temp = requests.get(f"{API_URL}/lots/{LOT_ID}/temperatures", timeout=5)
        r_hum = requests.get(f"{API_URL}/lots/{LOT_ID}/humidites", timeout=5)

        assert r_temp.status_code == 200
        assert r_hum.status_code == 200

        assert valeur_t in [t["valeur"] for t in r_temp.json()["temperatures"]]
        assert valeur_h in [h["valeur"] for h in r_hum.json()["humidites"]]

    def test_statut_calcule_en_alerte_apres_valeur_hors_seuil(self):
        """
        Après publish de 40°C, GET /lots/{id}/measures
        doit retourner statut_calcule = 'en_alerte'.
        """
        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})

        requests.put(f"{API_URL}/lots/{LOT_ID}/statut")

        r = requests.get(f"{API_URL}/lots/{LOT_ID}")

        assert r.status_code == 200
        assert r.json()["lot"]["statut"] == "en alerte"

    def test_statut_calcule_conforme_apres_valeur_normale(self):
        """Après publish de 29°C/55%, statut_calcule = 'conforme'."""
        publish({
        "temperature":29.0,
        "humidite":55.0,
        "capteur_temp_id":CAPTEUR_TEMP_ID,
        "capteur_hum_id":CAPTEUR_HUM_ID
})

        requests.put(f"{API_URL}/lots/{LOT_ID}/statut")

        r = requests.get(f"{API_URL}/lots/{LOT_ID}")

        assert r.status_code == 200
        assert r.json()["lot"]["statut"] == "conforme"

    def test_alertes_visibles_via_get_alertes(self):
        """GET /alertes retourne 200 avec liste (alertes générées par triggers)."""
        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        r = requests.get(f"{API_URL}/alertes", timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert "alertes" in data
        assert isinstance(data["alertes"], list)
        assert len(data["alertes"]) > 0, (
            "GET /alertes retourne une liste vide après un publish hors seuil"
        )

    def test_alerte_de_type_temperature_visible_api(self):
        """GET /alertes contient au moins une alerte de type 'temperature'."""
        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})
        r = requests.get(f"{API_URL}/alertes", timeout=5)
        types = [a["type"] for a in r.json()["alertes"]]
        assert "temperature" in types


# ==========================================================
# 4. END-TO-END : MQTT → BDD → ALERTE → API
# ==========================================================
class TestEndToEnd:

    def test_flux_complet_conforme(self):
        """
        Scénario nominal :
        MQTT 29°C/55% → BDD +1 ligne → pas d'alerte → API conforme
        """
        requests.put(f"{API_URL}/lots/{LOT_ID}/statut")

    # API
        r_temp = requests.get(f"{API_URL}/lots/{LOT_ID}/temperatures", timeout=5)
        r_hum = requests.get(f"{API_URL}/lots/{LOT_ID}/humidites", timeout=5)
        r_lot = requests.get(f"{API_URL}/lots/{LOT_ID}", timeout=5)

        assert r_temp.status_code == 200
        assert r_hum.status_code == 200
        assert r_lot.status_code == 200

        assert 29.0 in [t["valeur"] for t in r_temp.json()["temperatures"]]
        assert 55.0 in [h["valeur"] for h in r_hum.json()["humidites"]]
        assert r_lot.json()["lot"]["statut"] in ["conforme", "en alerte", "stocké"]
        

    def test_flux_complet_alerte_temperature(self):
        """
        Scénario alerte :
        MQTT 40°C → BDD +1 → TRIGGER → alerte insérée → API en_alerte
        """
        avant_t = count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}")
        avant_a = count_alertes_type("temperature")

        publish({"temperature": 40.0, "capteur_temp_id": CAPTEUR_TEMP_ID})

        # Mesure insérée
        assert count_table("temperature", f"WHERE capteur_id={CAPTEUR_TEMP_ID}") == avant_t + 1

        # Alerte créée par trigger SQL
        assert count_alertes_type("temperature") > avant_a

        # API : statut = en_alerte
       
        requests.put(f"{API_URL}/lots/{LOT_ID}/statut")

        r = requests.get(f"{API_URL}/lots/{LOT_ID}")
        assert r.status_code == 200
        assert r.json()["lot"]["statut"] == "en alerte"

        # GET /alertes contient l'alerte
        r2 = requests.get(f"{API_URL}/alertes", timeout=5)
        types = [a["type"] for a in r2.json()["alertes"]]
        assert "temperature" in types

    def test_api_reste_disponible_apres_flood(self):
        """10 messages MQTT rapides → l'API reste disponible."""
        for i in range(10):
            publish({"temperature": 28.0 + i * 0.1,
                     "capteur_temp_id": CAPTEUR_TEMP_ID}, wait=0.1)
        time.sleep(2.0)
        assert requests.get(f"{API_URL}/", timeout=5).status_code == 200
        assert requests.get(f"{API_URL}/lots/{LOT_ID}/temperatures", timeout=5).status_code == 200
        assert requests.get(f"{API_URL}/lots/{LOT_ID}/humidites", timeout=5).status_code == 200
