# ==========================================================
# MQTT PUBLISHER - BRÉSIL
# ==========================================================
# Ce script simule un capteur IoT.
# Il envoie des mesures vers le broker MQTT du Brésil.
# ==========================================================

import json
import paho.mqtt.publish as publish


data = {
    "temperature": 26.5,
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

print("Message MQTT Brésil envoyé")