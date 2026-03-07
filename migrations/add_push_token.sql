-- Agregar campo pushToken a users
ALTER TABLE users ADD COLUMN push_token TEXT AFTER phone;

-- Verificar
DESCRIBE users;
