-- Script para actualizar roles de NEMY a AstroBar
-- Elimina roles de delivery y actualiza sistema

-- 1. Actualizar roles válidos (eliminar delivery_driver)
-- Roles AstroBar: customer, business_owner, admin, super_admin

-- 2. Convertir delivery_drivers a customers (si existen)
UPDATE users 
SET role = 'customer' 
WHERE role = 'delivery_driver';

-- 3. Eliminar tablas de delivery (opcional - comentar si quieres mantener datos)
-- DROP TABLE IF EXISTS delivery_drivers;
-- DROP TABLE IF EXISTS call_logs;
-- DROP TABLE IF EXISTS scheduled_orders;

-- 4. Limpiar campos de delivery en orders (verificar columnas primero)
-- UPDATE orders SET deliveryPersonId = NULL WHERE deliveryPersonId IS NOT NULL;

-- 5. Actualizar system_settings para AstroBar
UPDATE system_settings 
SET value = 'astrobar.com.ar' 
WHERE `key` = 'support_email';

UPDATE system_settings 
SET value = 'AstroBar' 
WHERE `key` = 'platform_name';

-- 6. Verificar roles actuales
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- 7. Verificar negocios activos
SELECT COUNT(*) as active_bars 
FROM businesses 
WHERE isActive = 1 AND type = 'bar';
