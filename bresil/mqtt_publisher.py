import json
import random
import time
import paho.mqtt.publish as publish


MQTT_HOST = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "bresil/mesures"


while True:

    temperature = round(
        random.uniform(
            24,
            31.5
        ),
        1
    )


    humidite = round(
        random.uniform(
            45,
            65
        ),
        1
    )


    data = {

        "pays":
        "bresil",

        "entrepot":
        "1",

        "temperature":
        temperature,

        "humidite":
        humidite,

        "capteur_temp_id":
        1,

        "capteur_hum_id":
        2,

        "alerte":

        (
            temperature > 29

            or

            humidite > 55
        )

    }


    publish.single(

        MQTT_TOPIC,

        payload=json.dumps(
            data
        ),

        hostname=MQTT_HOST,

        port=MQTT_PORT

    )


    print(

        "[BRESIL] MQTT envoyé :",

        data

    )


    time.sleep(
        10
    )