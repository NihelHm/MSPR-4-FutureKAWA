import json
import psycopg2
import paho.mqtt.client as mqtt

def get_connection():
    return psycopg2.connect(
        dbname="bdd_equateur",
        user="user",
        password="password",
        host="localhost",
        port="5435"
    )

def on_connect(client, userdata, flags, rc):
    print("Connecté à MQTT Équateur")
    client.subscribe("equateur/mesures")

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())

    temperature = data.get("temperature")
    humidite = data.get("humidite")
    capteur_temp_id = data.get("capteur_temp_id")
    capteur_hum_id = data.get("capteur_hum_id")

    conn = get_connection()
    cursor = conn.cursor()

    if temperature is not None:
        cursor.execute(
            "INSERT INTO temperature (valeur, capteur_id) VALUES (%s, %s)",
            (temperature, capteur_temp_id)
        )

    if humidite is not None:
        cursor.execute(
            "INSERT INTO humidite (valeur, capteur_id) VALUES (%s, %s)",
            (humidite, capteur_hum_id)
        )

    conn.commit()
    cursor.close()
    conn.close()

    print("Mesure Équateur insérée en base")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect("localhost", 1885, 60)
client.loop_forever()