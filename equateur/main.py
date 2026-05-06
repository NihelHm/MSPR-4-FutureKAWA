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