-- Agregar columna mpPaymentId a promotion_transactions para rastrear pagos de Mercado Pago
ALTER TABLE promotion_transactions 
ADD COLUMN mp_payment_id VARCHAR(255) AFTER qr_code;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_mp_payment_id ON promotion_transactions(mp_payment_id);
