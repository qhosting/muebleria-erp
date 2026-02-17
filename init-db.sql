
-- Crear la base de datos si no existe
CREATE DATABASE muebleria_db;

-- Conectar a la base de datos
\c muebleria_db;

-- Crear extensiones si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
