# FutureKawa — Frontend React

Interface de monitoring multi-pays pour la gestion des stocks et conditions de conservation des grains de café.

## Stack technique

- **React 18** + **React Router v6**
- **Chart.js** (graphiques température/humidité)
- **CSS Modules** (styles scopés par composant)
- **Vite** (bundler)

## Structure du projet

```
src/
├── constants/
│   └── pays.js           → Config des 3 pays (URLs, seuils, couleurs)
├── services/
│   └── api.js            → Tous les appels HTTP vers les backends
├── hooks/
│   ├── useLots.js        → Gestion des lots par pays
│   ├── useMesures.js     → Températures & humidités
│   └── useAlertes.js     → Alertes + consolidation siège
├── components/
│   ├── Navbar.jsx        → Navigation principale
│   ├── StatCard.jsx      → Carte statistique
│   ├── LotTable.jsx      → Tableau des lots (FIFO)
│   ├── MesureChart.jsx   → Graphique temp/humidité
│   ├── AlerteList.jsx    → Liste des alertes
│   └── UI.jsx            → Composants utilitaires
└── pages/
    ├── Dashboard.jsx     → Vue siège consolidée
    ├── PaysDetail.jsx    → Vue d'un pays
    ├── LotDetail.jsx     → Détail d'un lot
    └── Alertes.jsx       → Toutes les alertes
```

## Lancement

### Prérequis
Les backends des pays doivent être démarrés :
```bash
# Brésil sur :8000
cd bresil && docker compose up -d

# Équateur sur :8001  
cd equateur && docker compose up -d

# Colombie sur :8002
cd colombie && docker compose up -d
```

### Démarrage du frontend
```bash
npm install
npm run dev
# → http://localhost:3000
```

## Pages disponibles

| Route | Description |
|-------|-------------|
| `/` | Dashboard siège — vue consolidée tous pays |
| `/alertes` | Toutes les alertes (filtrables par pays) |
| `/pays/bresil` | Vue Brésil (lots, mesures, alertes) |
| `/pays/equateur` | Vue Équateur |
| `/pays/colombie` | Vue Colombie |
| `/pays/:id/lots/:id` | Détail d'un lot + courbes historiques |

## Ports par pays

| Pays | Port | Base URL |
|------|------|----------|
| Brésil | 8000 | http://localhost:8000 |
| Équateur | 8001 | http://localhost:8001 |
| Colombie | 8002 | http://localhost:8002 |

> Si les ports diffèrent, modifier `src/constants/pays.js`.
