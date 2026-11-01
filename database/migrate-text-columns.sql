-- Migration: VARCHAR → TEXT pour supporter les textes longs (max 1000 caractères)
-- À exécuter sur la base PostgreSQL Render avant ou après le déploiement.
-- Ces commandes sont idempotentes et ne perdent aucune donnée existante.

ALTER TABLE tasks ALTER COLUMN title TYPE TEXT;
ALTER TABLE goals ALTER COLUMN title TYPE TEXT;
ALTER TABLE subtasks ALTER COLUMN titre TYPE TEXT;
