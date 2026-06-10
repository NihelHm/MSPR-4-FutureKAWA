# FutureKawa — Frontend Web (Siège)

Interface Web React de supervision multi-pays des stocks de café vert et des
conditions de stockage (température / humidité), avec consolidation au siège.

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Pré-requis](#pré-requis)
- [Installation & lancement du frontend](#installation--lancement-du-frontend)
- [Lancement des backends (pays + siège)](#lancement-des-backends-pays--siège)
- [Variables d'environnement](#variables-denvironnement)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Contrat d'API attendu](#contrat-dapi-attendu)
- [Structure du projet](#structure-du-projet)

---

## Fonctionnalités

1. **Plusieurs capteurs par lot** — un lot peut être instrumenté par plusieurs capteurs (`capteur.lot_id`).
2. **Liaison lot ↔ capteurs** — depuis le formulaire de lot, on coche les capteurs à associer.
3. **Hiérarchie pays → sites → lots → capteurs** — navigation à 4 niveaux :
   - `/pays/:paysId` (pays + liste des sites)
   - `/pays/:paysId/sites/:siteId` (lots du site)
   - `/pays/:paysId/lots/:lotId` (lot + ses capteurs + courbes filtrées)
   - `/pays/:paysId/capteurs` (tous les capteurs du pays)
4. **Administration des utilisateurs** — page `/admin` (réservée aux `is_admin`) :
   création, modification, suppression, et bascule du flag administrateur.
5. **Séparation des rôles pays** — un `responsable_<pays>` ne voit que son pays ;
   `direction_siege` et `admin` voient tous les pays. Les gardes de route et les
   filtres appliquent ce périmètre partout (dashboard, alertes, navbar).

---

## Pré-requis

- **Node.js 18+** et npm
- Les **backends pays** (Brésil / Équateur / Colombie) démarrés
- Le **backend siège** démarré (authentification JWT + utilisateurs)

---

## Installation & lancement du frontend

```bash
cd FrontEnd
npm install
cp .env.example .env      # puis ajuster les URLs si besoin
npm run dev               # serveur de dev Vite (http://localhost:5173)
```

Build de production :

```bash
npm run build             # génère dist/
npm run preview           # sert le build localement
```

---

## Lancement des backends (pays + siège)

> Le frontend ne fonctionne qu'avec les backends démarrés. Chaque backend pays et
> le siège ont leur propre `docker-compose.yml`.

### 1. Backends pays (un par pays)

Chaque pays expose une API REST sur un port distinct. Par défaut, le frontend
attend :

| Pays      | URL par défaut          |
|-----------|-------------------------|
| Brésil    | `http://localhost:8000` |
| Colombie  | `http://localhost:8002` |
| Équateur  | `http://localhost:8001` |

Pour chaque backend pays :

```bash
cd backend_<pays>
docker compose up --build
```

### 2. Backend siège (auth + utilisateurs)

Le siège tourne sur le port **8003** (mappé `8003:8000` dans son compose) :

```bash
cd siege
docker compose up --build
```

### 3. Ordre conseillé

1. Démarrer les 3 backends pays.
2. Démarrer le backend siège.
3. Démarrer le frontend (`npm run dev`).
4. Ouvrir `http://localhost:5173` et se connecter.

> Si un pays n'est pas démarré, l'app reste fonctionnelle : ce pays apparaît
> simplement « hors ligne » et ses données sont ignorées dans la consolidation.

---

## Variables d'environnement

Définies dans `.env` (voir `.env.example`). Toutes préfixées `VITE_` :

```
VITE_SIEGE_URL=http://localhost:8003
VITE_URL_BRESIL=http://localhost:8000
VITE_URL_EQUATEUR=http://localhost:8001
VITE_URL_COLOMBIE=http://localhost:8002
```

Après modification, **redémarrer** `npm run dev`.

---

## Comptes de démonstration

Issus de `siege/init.sql` (le mot de passe réel dépend des hash de la base) :

| Email                     | Rôle                  | Périmètre        |
|---------------------------|-----------------------|------------------|
| `admin@futurekawa.com`    | admin                 | Tous + /admin    |
| `m.dubois@futurekawa.com` | direction_siege       | Tous les pays    |
| `c.silva@futurekawa.com`  | responsable_bresil    | Brésil seulement |
| `a.torres@futurekawa.com` | responsable_equateur  | Équateur         |
| `j.reyes@futurekawa.com`  | responsable_colombie  | Colombie         |

La page de connexion propose des boutons pour pré-remplir ces emails.

---

## Contrat d'API attendu

> ⚠️ **À vérifier côté backend pays.** Le frontend a été construit sur les
> hypothèses ci-dessous. Si votre backend pays diffère, ajustez
> `src/services/api.js` (un seul fichier centralise tous les appels).

### Backend siège (`VITE_SIEGE_URL`)
- `POST /login` → `{ message, token, utilisateur: { id, username, email, role, is_admin } }`
- `GET /utilisateurs` → `{ utilisateurs: [...] }` (public, non-admin)
- `GET /admin/utilisateurs` → `{ utilisateurs: [...] }` *(Bearer admin)*
- `POST /admin/utilisateurs` *(Bearer admin)*
- `PUT /admin/utilisateurs/{id}` *(Bearer admin)*
- `DELETE /admin/utilisateurs/{id}` *(Bearer admin)*

### Backend pays
- `GET /` → ping de santé
- `GET /sites` → `{ sites: [{ id, nom, localisation }] }`
- `GET /sites/{id}` → `{ site: {...} }`
- `GET /lots` → `{ lots: [{ id, reference, site_id, date_reception, date_stockage, statut }] }`
- `GET /lots/{id}` → `{ lot: {...} }`
- `POST/PUT/DELETE /lots[/{id}]`
- `GET /capteurs` → `{ capteurs: [{ id, nom, type_capteur, site_id, lot_id }] }`
  - `type_capteur` ∈ `temperature` | `humidite`
  - `lot_id` = lot de rattachement (peut être `null` si non lié)
- `PUT /capteurs/{id}` → utilisé pour **lier/délier** : `{ lot_id: <id|null> }`
- `GET /temperature` → `{ temperature: [{ valeur, date_mesure, capteur_id }] }`
- `GET /humidite` → `{ humidite: [{ valeur, date_mesure, capteur_id }] }`
- `GET /alertes` → `{ alertes: [{ id, type, date_alerte, ... }] }`
  - `type` ∈ `temperature` | `humidite` | `peremption`

Les filtres (lots d'un site, capteurs d'un lot, mesures d'un lot) sont calculés
**côté client** à partir de ces champs.

---

## Structure du projet

```
FrontEnd/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .env.example
└─ src/
   ├─ main.jsx
   ├─ App.jsx              # routing + gardes (auth / rôle pays / admin)
   ├─ index.css            # design system (thème sombre/clair)
   ├─ constants/pays.js    # config pays, rôles, périmètres, seuils
   ├─ context/AppContext.jsx  # auth JWT + thème
   ├─ services/api.js      # TOUS les appels HTTP (siège + pays + consolidation)
   ├─ hooks/               # useSites, useLots, useCapteurs, useMesures, useAlertes, useAdmin
   ├─ components/          # UI, Navbar, StatCard, LotTable, MesureChart, AlerteList
   └─ pages/               # Login, Dashboard, PaysDetail, SiteDetail, LotDetail,
                           # LotForm, Capteurs, Alertes, Reglages, Admin
```
