-- Migración AstroBar - Solo lo esencial

-- 1. Convertir delivery_drivers a customers
UPDATE users 
SET role = 'customer' 
WHERE role = 'delivery_driver';

-- 2. Verificar roles actuales
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- 3. Verificar negocios activos
SELECT COUNT(*) as active_bars 
FROM businesses 
WHERE isActive = 1;
