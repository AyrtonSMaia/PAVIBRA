CREATE TABLE supply_versions(revision INTEGER PRIMARY KEY,payload TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,operation TEXT NOT NULL);
CREATE TABLE stored_objects(key TEXT PRIMARY KEY,file TEXT NOT NULL,etag TEXT NOT NULL);
CREATE TABLE auth_credentials(email TEXT PRIMARY KEY,hash TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE auth_activation(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE auth_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
