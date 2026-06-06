"""
auth_routes.py — Authentification pour le backend siège FutureKawa
Gère la connexion de tous les utilisateurs (tous pays confondus).
"""

import bcrypt
import jwt
import datetime
import os
import psycopg2
import psycopg2.extras
from fastapi import HTTPException, Header
from pydantic import BaseModel
from typing import Optional

SECRET_KEY = os.getenv("JWT_SECRET", "futurekawa_secret_2026")

DB_CONFIG = {
    "dbname":   os.getenv("DB_NAME",     "bdd_siege"),
    "user":     os.getenv("DB_USER",     "user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host":     os.getenv("DB_HOST",     "db_siege"),
    "port":     os.getenv("DB_PORT",     "5432"),
}

# ── Modèles ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class UtilisateurCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    is_admin: Optional[bool] = False

class UtilisateurUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None

# ── Connexion BDD ─────────────────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

# ── Vérification token JWT ────────────────────────────────────────────────────

def verifier_token(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

def verifier_admin(authorization: str = Header(...)):
    payload = verifier_token(authorization)
    if not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Accès refusé — admin requis")
    return payload

# ── Login ─────────────────────────────────────────────────────────────────────

def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM utilisateur WHERE email = %s;", (data.email,))
    utilisateur = cursor.fetchone()
    cursor.close()
    conn.close()

    if not utilisateur:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not bcrypt.checkpw(data.password.encode(), utilisateur["password"].encode()):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = jwt.encode({
        "id":       utilisateur["id"],
        "username": utilisateur["username"],
        "email":    utilisateur["email"],
        "role":     utilisateur["role"],
        "is_admin": utilisateur["is_admin"],
        "exp":      datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, SECRET_KEY, algorithm="HS256")

    return {
        "message": "Connexion réussie",
        "token": token,
        "utilisateur": {
            "id":       utilisateur["id"],
            "username": utilisateur["username"],
            "email":    utilisateur["email"],
            "role":     utilisateur["role"],
            "is_admin": utilisateur["is_admin"],
        }
    }

# ── Liste utilisateurs (public) ───────────────────────────────────────────────

def list_utilisateurs_public():
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, username, email, role, is_admin, created_at
        FROM utilisateur
        WHERE is_admin = FALSE
        ORDER BY id;
    """)
    utilisateurs = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"utilisateurs": utilisateurs}

# ── Routes admin ──────────────────────────────────────────────────────────────

def list_utilisateurs_admin(payload):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT id, username, email, role, is_admin, created_at FROM utilisateur ORDER BY id;")
    utilisateurs = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"utilisateurs": utilisateurs}

def create_utilisateur_admin(data: UtilisateurCreate, payload):
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("""
            INSERT INTO utilisateur (username, email, password, role, is_admin)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, email, role, is_admin, created_at;
        """, (data.username, data.email, hashed, data.role, data.is_admin))
        nouvel_utilisateur = cursor.fetchone()
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    finally:
        cursor.close()
        conn.close()
    return {"message": "Utilisateur créé", "utilisateur": nouvel_utilisateur}

def update_utilisateur_admin(utilisateur_id: int, data: UtilisateurUpdate, payload):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée à modifier")
    if "password" in updates:
        updates["password"] = bcrypt.hashpw(updates["password"].encode(), bcrypt.gensalt()).decode()

    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
    values = list(updates.values()) + [utilisateur_id]
    cursor.execute(f"""
        UPDATE utilisateur SET {set_clause}
        WHERE id = %s
        RETURNING id, username, email, role, is_admin;
    """, values)
    utilisateur = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"message": "Utilisateur modifié", "utilisateur": utilisateur}

def delete_utilisateur_admin(utilisateur_id: int, payload):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM utilisateur WHERE id = %s;", (utilisateur_id,))
    deleted = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"message": "Utilisateur supprimé"}
