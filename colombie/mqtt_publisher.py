import json
import random
import time
import paho.mqtt.publish as publish


MQTT_TOPIC = "colombie/mesures"

MQTT_PORT = 1884


while True:


    data = {

        "pays":"colombie",

        "entrepot":"1",

        "temperature":
        round(
            random.uniform(
                22,
                28
            ),
            1
        ),

        "humidite":
        round(
            random.uniform(
                65,
                85
            ),
            1
        ),

        "capteur_temp_id":
        1,

        "capteur_hum_id":
        2

    }


    data["alerte"] = (

        data["temperature"] > 26

        or

        data["humidite"] > 80

    )


    publish.single(

        MQTT_TOPIC,

        payload=json.dumps(
            data
        ),

        hostname="localhost",

        port=MQTT_PORT

    )


    print(
        "[COLOMBIE]",
        data
    )


    time.sleep(
        10
    )