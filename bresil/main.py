from fastapi import FastAPI, HTTPException
import psycopg2
import psycopg2.extras
import os

app = FastAPI(title="FutureKawa API - Brésil")


def get_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "bdd_bresil"),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASSWORD", "password"),
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432")
    )


@app.get("/")
def read_root():
    return {"message": "API FutureKawa Brésil opérationnelle"}


@app.get("/pays")
def get_pays():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT id, nom FROM pays ORDER BY id;")
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"pays": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sites")
def get_sites():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT id, nom, localisation, pays_id FROM site ORDER BY id;")
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"sites": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/lots")
def get_lots():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT id, reference, date_reception, date_stockage, statut, site_id
            FROM lot
            ORDER BY id;
        """)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"lots": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/capteurs")
def get_capteurs():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT id, nom, type_capteur, site_id
            FROM capteur
            ORDER BY id;
        """)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"capteurs": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/temperature")
def get_temperature():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT t.id,
                   t.valeur,
                   t.date_mesure,
                   t.capteur_id,
                   c.nom AS capteur_nom,
                   c.site_id
            FROM temperature t
            JOIN capteur c ON t.capteur_id = c.id
            ORDER BY t.date_mesure DESC;
        """)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"temperature": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/humidite")
def get_humidite():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT h.id,
                   h.valeur,
                   h.date_mesure,
                   h.capteur_id,
                   c.nom AS capteur_nom,
                   c.site_id
            FROM humidite h
            JOIN capteur c ON h.capteur_id = c.id
            ORDER BY h.date_mesure DESC;
        """)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"humidite": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))