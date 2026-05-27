"""
main.py — Backend central siège FutureKawa
Agrège les données des 3 backends pays via leurs APIs REST.
CDC §IV.2 : consolider stocks, mesures historiques, alertes.
"""

import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="FutureKawa — Backend Central Siège",
    description="Consolidation des données Brésil, Colombie, Équateur",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── URLs des backends pays (injectées via Docker Compose) ─────────────────────
PAYS_URLS = {
    "bresil":   os.getenv("URL_BRESIL",   "http://backend_bresil:8000"),
    "colombie": os.getenv("URL_COLOMBIE", "http://backend_colombie:8000"),
    "equateur": os.getenv("URL_EQUATEUR", "http://backend_equateur:8000"),
}

TIMEOUT = 5.0  # secondes


# ── Helper : appel HTTP vers un backend pays ──────────────────────────────────
async def fetch_pays(pays: str, route: str) -> dict:
    """
    Appelle la route d'un backend pays.
    Retourne les données ou un dict d'erreur si le pays est injoignable.
    """
    url = f"{PAYS_URLS[pays]}{route}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()
            return {"pays": pays, "statut": "ok", "data": response.json()}
    except httpx.ConnectError:
        return {"pays": pays, "statut": "injoignable", "data": None}
    except httpx.TimeoutException:
        return {"pays": pays, "statut": "timeout", "data": None}
    except Exception as exc:
        return {"pays": pays, "statut": "erreur", "data": None, "detail": str(exc)}


# ── Route racine ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "API FutureKawa Siège opérationnelle",
        "pays_surveillés": list(PAYS_URLS.keys())
    }


# ── Santé des backends pays ───────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Vérifie que chaque backend pays répond."""
    resultats = {}
    for pays in PAYS_URLS:
        resultat = await fetch_pays(pays, "/")
        resultats[pays] = resultat["statut"]
    return {"siege": "ok", "pays": resultats}


# ── Consolidation des lots (tous pays) ───────────────────────────────────────
@app.get("/lots")
async def get_tous_lots():
    """
    Récupère les lots de chaque pays et les consolide.
    Triés par date_stockage ASC (logique FIFO globale).
    """
    tous_lots = []
    statuts = {}

    for pays in PAYS_URLS:
        resultat = await fetch_pays(pays, "/lots")
        statuts[pays] = resultat["statut"]
        if resultat["statut"] == "ok" and resultat["data"]:
            lots = resultat["data"].get("lots", [])
            # Ajouter le pays à chaque lot pour identifier l'origine
            for lot in lots:
                lot["pays"] = pays
            tous_lots.extend(lots)

    # Tri FIFO global par date_stockage
    tous_lots.sort(key=lambda x: x.get("date_stockage") or "")

    return {
        "total": len(tous_lots),
        "statuts_pays": statuts,
        "lots": tous_lots
    }


# ── Consolidation des alertes (tous pays) ────────────────────────────────────
@app.get("/alertes")
async def get_toutes_alertes():
    """
    Récupère les alertes actives de chaque pays.
    Permet au siège de voir toutes les anomalies en un coup d'œil.
    """
    toutes_alertes = []
    statuts = {}

    for pays in PAYS_URLS:
        resultat = await fetch_pays(pays, "/alertes")
        statuts[pays] = resultat["statut"]
        if resultat["statut"] == "ok" and resultat["data"]:
            alertes = resultat["data"].get("alertes", [])
            for alerte in alertes:
                alerte["pays"] = pays
            toutes_alertes.extend(alertes)

    # Tri par date_alerte DESC (plus récentes en premier)
    toutes_alertes.sort(key=lambda x: x.get("date_alerte") or "", reverse=True)

    return {
        "total": len(toutes_alertes),
        "statuts_pays": statuts,
        "alertes": toutes_alertes
    }


# ── Consolidation des sites / entrepôts ──────────────────────────────────────
@app.get("/sites")
async def get_tous_sites():
    """Récupère tous les entrepôts de chaque pays."""
    tous_sites = []
    statuts = {}

    for pays in PAYS_URLS:
        resultat = await fetch_pays(pays, "/sites")
        statuts[pays] = resultat["statut"]
        if resultat["statut"] == "ok" and resultat["data"]:
            sites = resultat["data"].get("sites", [])
            for site in sites:
                site["pays"] = pays
            tous_sites.extend(sites)

    return {
        "total": len(tous_sites),
        "statuts_pays": statuts,
        "sites": tous_sites
    }


# ── Lots d'un pays spécifique ─────────────────────────────────────────────────
@app.get("/lots/{pays}")
async def get_lots_par_pays(pays: str):
    """Récupère les lots d'un pays spécifique."""
    if pays not in PAYS_URLS:
        raise HTTPException(
            status_code=404,
            detail=f"Pays '{pays}' inconnu. Disponibles : {list(PAYS_URLS.keys())}"
        )
    resultat = await fetch_pays(pays, "/lots")
    if resultat["statut"] != "ok":
        raise HTTPException(
            status_code=503,
            detail=f"Backend {pays} injoignable ({resultat['statut']})"
        )
    return resultat["data"]


# ── Alertes d'un pays spécifique ──────────────────────────────────────────────
@app.get("/alertes/{pays}")
async def get_alertes_par_pays(pays: str):
    """Récupère les alertes d'un pays spécifique."""
    if pays not in PAYS_URLS:
        raise HTTPException(
            status_code=404,
            detail=f"Pays '{pays}' inconnu. Disponibles : {list(PAYS_URLS.keys())}"
        )
    resultat = await fetch_pays(pays, "/alertes")
    if resultat["statut"] != "ok":
        raise HTTPException(
            status_code=503,
            detail=f"Backend {pays} injoignable ({resultat['statut']})"
        )
    return resultat["data"]


# ── Températures d'un pays ────────────────────────────────────────────────────
@app.get("/temperatures/{pays}")
async def get_temperatures_par_pays(pays: str):
    """Récupère l'historique des températures d'un pays."""
    if pays not in PAYS_URLS:
        raise HTTPException(status_code=404, detail=f"Pays '{pays}' inconnu.")
    resultat = await fetch_pays(pays, "/temperature")
    if resultat["statut"] != "ok":
        raise HTTPException(status_code=503, detail=f"Backend {pays} injoignable")
    return resultat["data"]


# ── Humidités d'un pays ───────────────────────────────────────────────────────
@app.get("/humidites/{pays}")
async def get_humidites_par_pays(pays: str):
    """Récupère l'historique des humidités d'un pays."""
    if pays not in PAYS_URLS:
        raise HTTPException(status_code=404, detail=f"Pays '{pays}' inconnu.")
    resultat = await fetch_pays(pays, "/humidite")
    if resultat["statut"] != "ok":
        raise HTTPException(status_code=503, detail=f"Backend {pays} injoignable")
    return resultat["data"]
