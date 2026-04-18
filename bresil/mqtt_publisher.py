import json
import paho.mqtt.publish as publish

data = {
    "temperature": 35,
    "humidite": 60,
    "capteur_temp_id": 1,
    "capteur_hum_id": 2
}

publish.single(
    "bresil/mesures",
    payload=json.dumps(data),
    hostname="localhost",
    port=1883
)

print("Message envoyé")