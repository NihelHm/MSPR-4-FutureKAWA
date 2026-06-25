
-- ==========================================================
-- INIT.SQL — BACKEND PAYS 
--  la table `capteur` reçoit une colonne `lot_id`
-- afin de matérialiser la hiérarchie métier Site → Lot → Capteur.
--   * capteur.site_id : entrepôt où le capteur est physiquement installé
--   * capteur.lot_id  : lot que le capteur surveille (NULL = non affecté)
-- ==========================================================
 
DROP TABLE IF EXISTS humidite CASCADE;
DROP TABLE IF EXISTS temperature CASCADE;
DROP TABLE IF EXISTS alerte CASCADE;
DROP TABLE IF EXISTS capteur CASCADE;
DROP TABLE IF EXISTS lot CASCADE;
DROP TABLE IF EXISTS site CASCADE;
DROP TABLE IF EXISTS pays CASCADE;
 
CREATE TABLE pays (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL
);
 
CREATE TABLE site (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    localisation VARCHAR(255),
    pays_id INTEGER NOT NULL REFERENCES pays(id)
);
 
CREATE TABLE lot (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(100) NOT NULL,
    date_reception DATE,
    date_stockage DATE,
    statut VARCHAR(50),
    site_id INTEGER NOT NULL REFERENCES site(id)
);
 
-- ⬇⬇ AJOUT : lot_id (nullable) pour rattacher un capteur à un lot
CREATE TABLE capteur (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type_capteur VARCHAR(50),
    site_id INTEGER NOT NULL REFERENCES site(id),
    lot_id INTEGER REFERENCES lot(id) ON DELETE SET NULL
);
 
CREATE TABLE temperature (
    id SERIAL PRIMARY KEY,
    valeur FLOAT NOT NULL,
    date_mesure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capteur_id INTEGER NOT NULL REFERENCES capteur(id)
);
 
CREATE TABLE humidite (
    id SERIAL PRIMARY KEY,
    valeur FLOAT NOT NULL,
    date_mesure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capteur_id INTEGER NOT NULL REFERENCES capteur(id)
);
 
CREATE TABLE alerte (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    valeur FLOAT,
    seuil FLOAT,
    date_alerte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capteur_id INTEGER REFERENCES capteur(id),
    lot_id INTEGER REFERENCES lot(id)
);


INSERT INTO pays (nom) VALUES ('Colombie');

INSERT INTO site (nom, localisation, pays_id)
VALUES ('Entrepôt Bogotá', 'Bogotá', 1);

INSERT INTO lot (reference, date_reception, date_stockage, statut, site_id)
VALUES ('LOT-COL-001', '2026-04-01', '2026-04-01', 'stocké', 1);

INSERT INTO capteur (nom, type_capteur, site_id)
VALUES ('Capteur Température Colombie 1', 'temperature', 1);

INSERT INTO capteur (nom, type_capteur, site_id)
VALUES ('Capteur Humidité Colombie 1', 'humidite', 1);

INSERT INTO temperature (valeur, capteur_id)
VALUES (24.5, 1);

INSERT INTO humidite (valeur, capteur_id)
VALUES (65.0, 2);