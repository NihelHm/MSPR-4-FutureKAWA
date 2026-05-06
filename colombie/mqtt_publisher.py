import json
import paho.mqtt.publish as publish

data = {
    "temperature": 24.5,
    "humidite": 65,
    "capteur_temp_id": 1,
    "capteur_hum_id": 2
}

publish.single(
    "colombie/mesures",
    payload=json.dumps(data),
    hostname="localhost",
    port=1884
)

print("Message Colombie envoyé")