-- Cleans up any existing databases/users.

DROP DATABASE IF EXISTS colorstack;
DROP DATABASE IF EXISTS colorstack_test;
DROP ROLE IF EXISTS colorstack;

-- Creates new databases and users.

CREATE ROLE colorstack WITH SUPERUSER LOGIN PASSWORD 'colorstack';
CREATE DATABASE colorstack OWNER colorstack;
CREATE DATABASE colorstack_test OWNER colorstack