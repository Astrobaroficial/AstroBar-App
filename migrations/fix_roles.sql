-- Migración AstroBar - Limpiar roles

UPDATE users 
SET role = 'customer' 
WHERE role = 'delivery_driver';

SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
