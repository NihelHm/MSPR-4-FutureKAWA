import json
import paho.mqtt.publish as publish

data = {
    "temperature": 23.0,
    "humidite": 70,
    "capteur_temp_id": 1,
    "capteur_hum_id": 2
}

publish.single(
    "equateur/mesures",
    payload=json.dumps(data),
    hostname="localhost",
    port=1885
)

print("Message Équateur envoyé")