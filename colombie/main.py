# ==========================================================
# FUTUREKAWA - BACKEND PAYS
# ==========================================================
# Ce backend représente l'API locale d'un pays producteur.
#
# Rôle :
# - gérer les sites de stockage
# - gérer les lots de café
# - gérer les capteurs IoT
# - stocker les mesures de température/humidité
# - gérer les alertes locales
#
# Architecture :
# Chaque pays possède :
# - sa propre base PostgreSQL
# - son propre backend FastAPI
# - son propre broker MQTT
#
# Le backend central pourra ensuite agréger les données
# de tous les pays.
# ==========================================================

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import psycopg2
import psycopg2.extras
import os
from datetime import date

from fastapi.middleware.cors import CORSMiddleware


# ==========================================================
# VARIABLES D'ENVIRONNEMENT
# ==========================================================
# COUNTRY_NAME :
# Nom du pays injecté via Docker Compose.
#
# DB_NAME :
# Nom de la base PostgreSQL du pays.
# ==========================================================

COUNTRY_NAME = os.getenv("COUNTRY_NAME", "Pays")
DB_NAME = os.getenv("DB_NAME", "bdd_pays")


# ==========================================================
# INITIALISATION FASTAPI
# ==========================================================

app = FastAPI(
    title=f"FutureKawa API - Backend Pays {COUNTRY_NAME}"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# CONNEXION POSTGRESQL
# ==========================================================
# Cette fonction ouvre une connexion vers PostgreSQL.
#
# Les informations sont récupérées depuis Docker Compose
# grâce aux variables d'environnement.
# ==========================================================

def get_connection():

    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", DB_NAME),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASSWORD", "password"),
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432")
    )


# ==========================================================
# MODELES PYDANTIC
# ==========================================================
# Les modèles Pydantic servent à :
# - valider les données reçues
# - typer les données
# - générer automatiquement Swagger
# ==========================================================

class SiteCreate(BaseModel):
    nom: str
    localisation: Optional[str] = None
    pays_id: int


class SiteUpdate(BaseModel):
    nom: Optional[str] = None
    localisation: Optional[str] = None
    pays_id: Optional[int] = None


class LotCreate(BaseModel):
    reference: str
    date_reception: Optional[str] = None
    date_stockage: Optional[str] = None
    statut: Optional[str] = "stocké"
    site_id: int


class LotUpdate(BaseModel):
    reference: Optional[str] = None
    date_reception: Optional[str] = None
    date_stockage: Optional[str] = None
    statut: Optional[str] = None
    site_id: Optional[int] = None


class CapteurCreate(BaseModel):
    nom: str
    type_capteur: str
    site_id: int


class CapteurUpdate(BaseModel):
    nom: Optional[str] = None
    type_capteur: Optional[str] = None
    site_id: Optional[int] = None


class TemperatureCreate(BaseModel):
    valeur: float
    date_mesure: Optional[str] = None
    capteur_id: int


class TemperatureUpdate(BaseModel):
    valeur: Optional[float] = None
    date_mesure: Optional[str] = None
    capteur_id: Optional[int] = None


class HumiditeCreate(BaseModel):
    valeur: float
    date_mesure: Optional[str] = None
    capteur_id: int


class HumiditeUpdate(BaseModel):
    valeur: Optional[float] = None
    date_mesure: Optional[str] = None
    capteur_id: Optional[int] = None


class AlerteCreate(BaseModel):
    type: str
    message: str
    valeur: Optional[float] = None
    seuil: Optional[float] = None
    capteur_id: Optional[int] = None
    lot_id: Optional[int] = None


class AlerteUpdate(BaseModel):
    type: Optional[str] = None
    message: Optional[str] = None
    valeur: Optional[float] = None
    seuil: Optional[float] = None
    capteur_id: Optional[int] = None
    lot_id: Optional[int] = None


# ==========================================================
# SECURITE DES TABLES
# ==========================================================
# Comme le CRUD est générique, on limite les tables
# accessibles afin d'éviter des requêtes SQL non prévues.
# ==========================================================

TABLES_AUTORISEES = {
    "pays",
    "site",
    "lot",
    "capteur",
    "temperature",
    "humidite",
    "alerte"
}


def verifier_table(table: str):

    if table not in TABLES_AUTORISEES:
        raise HTTPException(
            status_code=400,
            detail="Table non autorisée"
        )


# ==========================================================
# CRUD GENERIQUE
# ==========================================================
# Ces fonctions permettent :
# - d'éviter la duplication de code
# - d'améliorer la maintenabilité
# - de rendre l'architecture scalable
# ==========================================================

def get_all(table: str, order_by: str = "id"):

    # Vérification de la table demandée
    verifier_table(table)

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    # Récupération des données de la table
    cursor.execute(
        f"SELECT * FROM {table} ORDER BY {order_by};"
    )

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return data


def get_by_id(table: str, item_id: int):

    verifier_table(table)

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    cursor.execute(
        f"SELECT * FROM {table} WHERE id = %s;",
        (item_id,)
    )

    item = cursor.fetchone()

    cursor.close()
    conn.close()

    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"{table} introuvable"
        )

    return item


def create_item(table: str, data: dict):

    # Vérification de la table
    verifier_table(table)

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    # Récupération des colonnes
    columns = list(data.keys())

    # Récupération des valeurs
    values = list(data.values())

    # Création des placeholders SQL
    placeholders = ", ".join(["%s"] * len(columns))

    # Construction dynamique de la requête SQL
    query = f"""
        INSERT INTO {table} ({", ".join(columns)})
        VALUES ({placeholders})
        RETURNING *;
    """

    cursor.execute(query, values)

    new_item = cursor.fetchone()

    conn.commit()

    cursor.close()
    conn.close()

    return new_item


def update_item(table: str, item_id: int, data: dict):

    verifier_table(table)

    # Suppression des champs None
    data = {
        key: value
        for key, value in data.items()
        if value is not None
    }

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Aucune donnée à modifier"
        )

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    # Construction dynamique du UPDATE SQL
    set_clause = ", ".join([
        f"{key} = %s"
        for key in data.keys()
    ])

    values = list(data.values())

    values.append(item_id)

    query = f"""
        UPDATE {table}
        SET {set_clause}
        WHERE id = %s
        RETURNING *;
    """

    cursor.execute(query, values)

    updated_item = cursor.fetchone()

    conn.commit()

    cursor.close()
    conn.close()

    if not updated_item:
        raise HTTPException(
            status_code=404,
            detail=f"{table} introuvable"
        )

    return updated_item


def delete_item(table: str, item_id: int):

    # Vérification de la table
    verifier_table(table)

    conn = get_connection()

    cursor = conn.cursor()

    # Suppression d'une ligne
    cursor.execute(
        f"DELETE FROM {table} WHERE id = %s;",
        (item_id,)
    )

    deleted = cursor.rowcount

    conn.commit()

    cursor.close()
    conn.close()

    if deleted == 0:
        raise HTTPException(
            status_code=404,
            detail=f"{table} introuvable"
        )

    return {
        "message": f"{table} supprimé avec succès"
    }
# ==========================================================
# SEUILS METIER PAR PAYS
# ==========================================================

SEUILS = {
    "Brésil": {
        "temperature": 29,
        "humidite": 55
    },
    "Équateur": {
        "temperature": 31,
        "humidite": 60
    },
    "Colombie": {
        "temperature": 26,
        "humidite": 80
    }
}

TOLERANCE_TEMPERATURE = 3
TOLERANCE_HUMIDITE = 2


def get_pays_local():
    pays = get_all("pays")

    if not pays:
        raise HTTPException(status_code=404, detail="Aucun pays trouvé en base")

    return pays[0]["nom"]


def get_lot_pays(lot_id: int):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        SELECT p.nom AS pays
        FROM lot l
        JOIN site s ON l.site_id = s.id
        JOIN pays p ON s.pays_id = p.id
        WHERE l.id = %s;
    """, (lot_id,))

    data = cursor.fetchone()

    cursor.close()
    conn.close()

    if not data:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    return data["pays"]


def est_hors_plage(pays: str, type_mesure: str, valeur: float):
    seuil = SEUILS[pays][type_mesure]

    if type_mesure == "temperature":
        tolerance = TOLERANCE_TEMPERATURE
    else:
        tolerance = TOLERANCE_HUMIDITE

    minimum = seuil - tolerance
    maximum = seuil + tolerance

    return valeur < minimum or valeur > maximum, minimum, maximum


def creer_alerte_si_hors_plage(type_mesure: str, valeur: float, capteur_id: int):
    pays = get_pays_local()

    hors_plage, minimum, maximum = est_hors_plage(pays, type_mesure, valeur)

    if hors_plage:
        return create_item("alerte", {
            "type": type_mesure,
            "message": f"{type_mesure} hors plage acceptable : {valeur} pour une plage attendue entre {minimum} et {maximum}",
            "valeur": valeur,
            "seuil": maximum,
            "capteur_id": capteur_id,
            "lot_id": None
        })

    return None


def calculer_statut_lot(lot_id: int):
    pays = get_lot_pays(lot_id)

    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        SELECT
            l.id,
            l.date_stockage,

            (
                SELECT t.valeur
                FROM temperature t
                JOIN capteur c ON t.capteur_id = c.id
                WHERE c.site_id = l.site_id
                ORDER BY t.date_mesure DESC
                LIMIT 1
            ) AS derniere_temperature,

            (
                SELECT h.valeur
                FROM humidite h
                JOIN capteur c ON h.capteur_id = c.id
                WHERE c.site_id = l.site_id
                ORDER BY h.date_mesure DESC
                LIMIT 1
            ) AS derniere_humidite

        FROM lot l
        WHERE l.id = %s;
    """, (lot_id,))

    lot = cursor.fetchone()

    if not lot:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Lot introuvable")

    statut = "conforme"

    if lot["date_stockage"] is not None:
        anciennete = (date.today() - lot["date_stockage"]).days

        if anciennete > 365:
            statut = "périmé"

    if statut != "périmé":
        temperature = lot["derniere_temperature"]
        humidite = lot["derniere_humidite"]

        if temperature is not None:
            hors_plage_temp, _, _ = est_hors_plage(pays, "temperature", temperature)

            if hors_plage_temp:
                statut = "en alerte"

        if humidite is not None:
            hors_plage_hum, _, _ = est_hors_plage(pays, "humidite", humidite)

            if hors_plage_hum:
                statut = "en alerte"

    cursor.execute("""
        UPDATE lot
        SET statut = %s
        WHERE id = %s
        RETURNING *;
    """, (statut, lot_id))

    lot_updated = cursor.fetchone()

    conn.commit()
    cursor.close()
    conn.close()

    return lot_updated


# ==========================================================
# ROUTE RACINE
# ==========================================================
# Permet de vérifier rapidement que l'API fonctionne.
# ==========================================================

@app.get("/")
def read_root():

    return {
        "message": f"API FutureKawa {COUNTRY_NAME} opérationnelle"
    }



# ==========================================================
# CRUD SITE
# ==========================================================
# Gestion des sites logistiques
# ==========================================================

@app.get("/sites")
def list_sites():

    return {
        "sites": get_all("site")
    }


@app.get("/sites/{site_id}")
def read_site(site_id: int):

    return {
        "site": get_by_id("site", site_id)
    }


@app.post("/sites")
def create_site(site: SiteCreate):

    return {
        "message": "Site créé avec succès",
        "site": create_item("site", site.dict())
    }


@app.put("/sites/{site_id}")
def update_site(site_id: int, site: SiteUpdate):

    return {
        "message": "Site modifié avec succès",
        "site": update_item(
            "site",
            site_id,
            site.dict()
        )
    }


@app.delete("/sites/{site_id}")
def delete_site(site_id: int):

    return delete_item("site", site_id)


# ==========================================================
# CRUD LOT
# ==========================================================
# Gestion des lots de café
# ==========================================================

@app.get("/lots")
def list_lots():
    return {"lots": get_all("lot", "date_stockage ASC")}


@app.get("/lots/{lot_id}")
def read_lot(lot_id: int):

    return {
        "lot": get_by_id("lot", lot_id)
    }


@app.post("/lots")
def create_lot(lot: LotCreate):

    return {
        "message": "Lot créé avec succès",
        "lot": create_item("lot", lot.dict())
    }


@app.put("/lots/{lot_id}")
def update_lot(lot_id: int, lot: LotUpdate):

    return {
        "message": "Lot modifié avec succès",
        "lot": update_item(
            "lot",
            lot_id,
            lot.dict()
        )
    }


@app.delete("/lots/{lot_id}")
def delete_lot(lot_id: int):

    return delete_item("lot", lot_id)
# ==========================================================
# RECALCUL STATUT LOT
# ==========================================================

@app.put("/lots/{lot_id}/statut")
def recalculer_statut_lot(lot_id: int):
    lot = calculer_statut_lot(lot_id)

    return {
        "message": "Statut du lot recalculé avec succès",
        "lot": lot
    }


# ==========================================================
# CRUD CAPTEUR
# ==========================================================
# Gestion des capteurs IoT
# ==========================================================

@app.get("/capteurs")
def list_capteurs():

    return {
        "capteurs": get_all("capteur")
    }


@app.get("/capteurs/{capteur_id}")
def read_capteur(capteur_id: int):

    return {
        "capteur": get_by_id("capteur", capteur_id)
    }


@app.post("/capteurs")
def create_capteur(capteur: CapteurCreate):

    return {
        "message": "Capteur créé avec succès",
        "capteur": create_item(
            "capteur",
            capteur.dict()
        )
    }


@app.put("/capteurs/{capteur_id}")
def update_capteur(
    capteur_id: int,
    capteur: CapteurUpdate
):

    return {
        "message": "Capteur modifié avec succès",
        "capteur": update_item(
            "capteur",
            capteur_id,
            capteur.dict()
        )
    }


@app.delete("/capteurs/{capteur_id}")
def delete_capteur(capteur_id: int):

    return delete_item("capteur", capteur_id)


# ==========================================================
# CRUD TEMPERATURE
# ==========================================================
# Gestion des mesures de température
# ==========================================================

@app.get("/temperature")
def list_temperature():

    return {
        "temperature": get_all(
            "temperature",
            "date_mesure DESC"
        )
    }


@app.get("/temperature/{temperature_id}")
def read_temperature(temperature_id: int):

    return {
        "temperature": get_by_id(
            "temperature",
            temperature_id
        )
    }


@app.post("/temperature")
def create_temperature(
    temperature: TemperatureCreate
):

    return {
        "message": "Température créée avec succès",
        "temperature": create_item(
            "temperature",
            temperature.dict()
        )
    }


@app.put("/temperature/{temperature_id}")
def update_temperature(
    temperature_id: int,
    temperature: TemperatureUpdate
):

    return {
        "message": "Température modifiée avec succès",
        "temperature": update_item(
            "temperature",
            temperature_id,
            temperature.dict()
        )
    }


@app.delete("/temperature/{temperature_id}")
def delete_temperature(temperature_id: int):

    return delete_item(
        "temperature",
        temperature_id
    )

# ==========================================================
# TEMPERATURES D'UN LOT
# ==========================================================
# Retourne toutes les mesures température
# associées au site du lot demandé.
# ==========================================================

@app.get("/lots/{lot_id}/temperatures")
def get_temperatures_lot(lot_id: int):

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    cursor.execute("""
        SELECT
            t.id,
            t.valeur,
            t.date_mesure,
            c.nom AS capteur
        FROM temperature t

        JOIN capteur c
            ON t.capteur_id = c.id

        JOIN lot l
            ON l.site_id = c.site_id

        WHERE l.id = %s

        ORDER BY t.date_mesure DESC
    """, (lot_id,))

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "lot_id": lot_id,
        "temperatures": data
    }


# ==========================================================
# CRUD HUMIDITE
# ==========================================================
# Gestion des mesures d'humidité
# ==========================================================

@app.get("/humidite")
def list_humidite():

    return {
        "humidite": get_all(
            "humidite",
            "date_mesure DESC"
        )
    }


@app.get("/humidite/{humidite_id}")
def read_humidite(humidite_id: int):

    return {
        "humidite": get_by_id(
            "humidite",
            humidite_id
        )
    }


@app.post("/humidite")
def create_humidite(
    humidite: HumiditeCreate
):

    return {
        "message": "Humidité créée avec succès",
        "humidite": create_item(
            "humidite",
            humidite.dict()
        )
    }


@app.put("/humidite/{humidite_id}")
def update_humidite(
    humidite_id: int,
    humidite: HumiditeUpdate
):

    return {
        "message": "Humidité modifiée avec succès",
        "humidite": update_item(
            "humidite",
            humidite_id,
            humidite.dict()
        )
    }


@app.delete("/humidite/{humidite_id}")
def delete_humidite(humidite_id: int):

    return delete_item(
        "humidite",
        humidite_id
    )

# ==========================================================
# HUMIDITES D'UN LOT
# ==========================================================
# Retourne toutes les mesures humidité
# associées au site du lot demandé.
# ==========================================================

@app.get("/lots/{lot_id}/humidites")
def get_humidites_lot(lot_id: int):

    conn = get_connection()

    cursor = conn.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    cursor.execute("""
        SELECT
            h.id,
            h.valeur,
            h.date_mesure,
            c.nom AS capteur
        FROM humidite h

        JOIN capteur c
            ON h.capteur_id = c.id

        JOIN lot l
            ON l.site_id = c.site_id

        WHERE l.id = %s

        ORDER BY h.date_mesure DESC
    """, (lot_id,))

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "lot_id": lot_id,
        "humidites": data
    }

# ==========================================================
# CRUD ALERTES
# ==========================================================
# Gestion des alertes critiques
# ==========================================================

@app.get("/alertes")
def list_alertes():

    return {
        "alertes": get_all(
            "alerte",
            "date_alerte DESC"
        )
    }


@app.get("/alertes/{alerte_id}")
def read_alerte(alerte_id: int):

    return {
        "alerte": get_by_id(
            "alerte",
            alerte_id
        )
    }


@app.post("/alertes")
def create_alerte(
    alerte: AlerteCreate
):

    return {
        "message": "Alerte créée avec succès",
        "alerte": create_item(
            "alerte",
            alerte.dict()
        )
    }


@app.put("/alertes/{alerte_id}")
def update_alerte(
    alerte_id: int,
    alerte: AlerteUpdate
):

    return {
        "message": "Alerte modifiée avec succès",
        "alerte": update_item(
            "alerte",
            alerte_id,
            alerte.dict()
        )
    }


@app.delete("/alertes/{alerte_id}")
def delete_alerte(alerte_id: int):

    return delete_item(
        "alerte",
        alerte_id
    )