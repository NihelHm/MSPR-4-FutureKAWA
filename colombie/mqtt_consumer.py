"""
mqtt_consumer.py — Colombie
"""
import json
import os
import psycopg2
import paho.mqtt.client as mqtt

DB_CONFIG = {
    "dbname":   os.getenv("DB_NAME",     "bdd_colombie"),
    "user":     os.getenv("DB_USER",     "user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host":     os.getenv("DB_HOST",     "db"),
    "port":     os.getenv("DB_PORT",     "5432"),
}
MQTT_HOST  = os.getenv("MQTT_HOST", "mqtt")
MQTT_PORT  = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "colombie/mesures")

SEUILS = {"Colombie": {"temperature": 26, "humidite": 80}}
TOLERANCE_TEMPERATURE = 3
TOLERANCE_HUMIDITE    = 2


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def creer_alerte_si_hors_plage(conn, type_mesure, valeur, capteur_id):
    seuil     = SEUILS["Colombie"][type_mesure]
    tolerance = TOLERANCE_TEMPERATURE if type_mesure == "temperature" else TOLERANCE_HUMIDITE
    mini, maxi = seuil - tolerance, seuil + tolerance
    if valeur < mini or valeur > maxi:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO alerte (type, message, valeur, seuil, capteur_id)
                VALUES (%s, %s, %s, %s, %s);
            """, (type_mesure,
                  f"{type_mesure} hors plage : {valeur} (attendu {mini}–{maxi})",
                  valeur, maxi, capteur_id))
        print(f"[COLOMBIE] Alerte {type_mesure} : {valeur}")


def on_connect(client, userdata, flags, rc):
    print(f"[COLOMBIE] Connecté au broker MQTT (rc={rc})")
    client.subscribe(MQTT_TOPIC)


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                if data.get("temperature") is not None:
                    cur.execute(
                        "INSERT INTO temperature (valeur, capteur_id) VALUES (%s, %s);",
                        (data["temperature"], data.get("capteur_temp_id", 1))
                    )
                    creer_alerte_si_hors_plage(conn, "temperature",
                        data["temperature"], data.get("capteur_temp_id", 1))
                if data.get("humidite") is not None:
                    cur.execute(
                        "INSERT INTO humidite (valeur, capteur_id) VALUES (%s, %s);",
                        (data["humidite"], data.get("capteur_hum_id", 2))
                    )
                    creer_alerte_si_hors_plage(conn, "humidite",
                        data["humidite"], data.get("capteur_hum_id", 2))
        conn.close()
        print(f"[COLOMBIE] Mesure insérée : {data}")
    except Exception as exc:
        print(f"[COLOMBIE] Erreur : {exc}")


client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_forever()
