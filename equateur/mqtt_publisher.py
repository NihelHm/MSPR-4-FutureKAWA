# ==========================================================
# MQTT PUBLISHER - EQUATEUR (Arduino réel)
# ==========================================================

import json
import serial
import time
import paho.mqtt.publish as publish


# Arduino
arduino = serial.Serial(
    "COM5",
    9600,
    timeout=1
)

time.sleep(2)


while True:

    ligne = arduino.readline() \
        .decode(
            "utf-8",
            errors="ignore"
        ) \
        .strip()


    if not ligne:
        continue


    try:

        data = json.loads(
            ligne
        )


        publish.single(

            "equateur/mesures",

            payload=json.dumps(
                data
            ),

            hostname="localhost",

            port=1885

        )


        print(
            "MQTT envoyé :",
            data
        )


    except:

        print(
            "Erreur :",
            ligne
        )