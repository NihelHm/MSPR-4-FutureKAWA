-- ==========================================================
-- INIT.SQL — FUTUREKAWA SIÈGE
-- Base de données centrale avec tous les utilisateurs
-- ==========================================================

DROP TABLE IF EXISTS utilisateur CASCADE;

CREATE TABLE utilisateur (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL,
    is_admin    BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Tous les utilisateurs du système
INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Marie Dubois', 'm.dubois@futurekawa.com', '$2b$12$RjL.M9.g/fCNrI3RpjvC7usmSLYfA/uiiLn6XCDPYzOIFH4HLYFy.', 'direction_siege', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Carlos Silva', 'c.silva@futurekawa.com', '$2b$12$2G.eU5OvWkjTrIR6FowbregPkhk/hvcDQ6DjRdDtGKwEV3cJh.tsm', 'responsable_bresil', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Ana Torres', 'a.torres@futurekawa.com', '$2b$12$HMJ5HHciOl7NuKkuEeSLEu4Sd7dY5ql38Dh6fjRWs4/xhtlZRZqLm', 'responsable_equateur', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Juan Reyes', 'j.reyes@futurekawa.com', '$2b$12$DSwUMSH10idHOmnp5kWvTeN4BuNco3iV2o/RHvOQ9MkD5HmAqDj9e', 'responsable_colombie', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Admin FutureKawa', 'admin@futurekawa.com', '$2b$12$bWt.31LmhyyDyaqGSHFh6.50TlzPzBk7hVDvk6fkYBTMNJscnWq/6', 'admin', TRUE);
