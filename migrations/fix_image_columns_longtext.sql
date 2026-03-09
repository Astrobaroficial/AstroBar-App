-- Cambiar columnas de imagen de TEXT a LONGTEXT para soportar base64
ALTER TABLE businesses MODIFY COLUMN image LONGTEXT;
ALTER TABLE businesses MODIFY COLUMN cover_image LONGTEXT;
ALTER TABLE products MODIFY COLUMN image LONGTEXT;
ALTER TABLE users MODIFY COLUMN profile_image LONGTEXT;
ALTER TABLE promotions MODIFY COLUMN image LONGTEXT;
