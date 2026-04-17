from fastapi import FastAPI, HTTPException
import psycopg2
import psycopg2.extras

app = FastAPI(title="FutureKawa API - Brésil")


def get_connection():
    return psycopg2.connect(
        dbname="bdd_bresil",
        user="user",
        password="password",
        host="localhost",
        port="5432"
    )


@app.get("/")
def read_root():
    return {"message": "API FutureKawa Brésil opérationnelle"}


@app.get("/pays")
def get_pays():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT id, nom
            FROM pays
            ORDER BY id;
        """)

        pays = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"pays": pays}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sites")
def get_sites():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT id, nom, localisation, pays_id
            FROM site
            ORDER BY id;
        """)

        sites = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"sites": sites}

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

        lots = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"lots": lots}

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

        capteurs = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"capteurs": capteurs}

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

        temperatures = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"temperature": temperatures}

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

        humidites = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"humidite": humidites}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sites/{site_id}/lots")
def get_lots_by_site(site_id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT id, reference, date_reception, date_stockage, statut, site_id
            FROM lot
            WHERE site_id = %s
            ORDER BY id;
        """, (site_id,))

        lots = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"site_id": site_id, "lots": lots}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sites/{site_id}/capteurs")
def get_capteurs_by_site(site_id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT id, nom, type_capteur, site_id
            FROM capteur
            WHERE site_id = %s
            ORDER BY id;
        """, (site_id,))

        capteurs = cursor.fetchall()

        cursor.close()
        conn.close()

        return {"site_id": site_id, "capteurs": capteurs}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))