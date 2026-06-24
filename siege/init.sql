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
<<<<<<< Updated upstream
VALUES (   
    'Marie Dubois', 'm.dubois@futurekawa.com', '$2b$12$0o9w6oYfnqWBKMxgJLZe1uOTU/Jh.ckeFJ1/4E244ZCbbVxwy9hca', 'direction_siege', FALSE);
======
VALUES ('Marie Dubois', 'm.dubois@futurekawa.com', '$2a$13$aLyut95bZVeDVxYcXNXi8u.YJkppO6bW3jbCEsgiJ.FpiY.aUODFK', 'direction_siege', FALSE);
>>>>>>> Stashed changes

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Carlos Silva', 'c.silva@futurekawa.com', '$2b$12$0o9w6oYfnqWBKMxgJLZe1uOTU/Jh.ckeFJ1/4E244ZCbbVxwy9hca', 'responsable_bresil', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Ana Torres', 'a.torres@futurekawa.com', '$2b$12$0o9w6oYfnqWBKMxgJLZe1uOTU/Jh.ckeFJ1/4E244ZCbbVxwy9hca', 'responsable_equateur', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
VALUES ('Juan Reyes', 'j.reyes@futurekawa.com', '$2b$12$0o9w6oYfnqWBKMxgJLZe1uOTU/Jh.ckeFJ1/4E244ZCbbVxwy9hca', 'responsable_colombie', FALSE);

INSERT INTO utilisateur (username, email, password, role, is_admin)
<<<<<<< Updated upstream
VALUES ('Admin FutureKawa', 'admin@futurekawa.com', '$2b$12$0o9w6oYfnqWBKMxgJLZe1uOTU/Jh.ckeFJ1/4E244ZCbbVxwy9hca', 'admin', TRUE);
=======
VALUES ('Admin FutureKawa', 'admin@futurekawa.com', '$2a$13$aLyut95bZVeDVxYcXNXi8u.YJkppO6bW3jbCEsgiJ.FpiY.aUODFK', 'admin', TRUE);
>>>>>>> Stashed changes
