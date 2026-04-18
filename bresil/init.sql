DROP TABLE IF EXISTS humidite CASCADE;
DROP TABLE IF EXISTS temperature CASCADE;
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

CREATE TABLE capteur (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type_capteur VARCHAR(50),
    site_id INTEGER NOT NULL REFERENCES site(id)
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

INSERT INTO pays (nom) VALUES ('Brésil');

INSERT INTO site (nom, localisation, pays_id)
VALUES ('Entrepôt Sao Paulo', 'Sao Paulo', 1);

INSERT INTO lot (reference, date_reception, date_stockage, statut, site_id)
VALUES ('LOT-001', '2026-04-01', '2026-04-01', 'stocké', 1);

INSERT INTO capteur (nom, type_capteur, site_id)
VALUES ('Capteur Température 1', 'temperature', 1);

INSERT INTO capteur (nom, type_capteur, site_id)
VALUES ('Capteur Humidité 1', 'humidite', 1);

INSERT INTO temperature (valeur, capteur_id)
VALUES (22.5, 1);

INSERT INTO humidite (valeur, capteur_id)
VALUES (60.0, 2);