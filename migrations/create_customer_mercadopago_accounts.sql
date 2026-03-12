-- Crear tabla para cuentas Mercado Pago de clientes
CREATE TABLE IF NOT EXISTS customer_mercadopago_accounts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  mp_user_id VARCHAR(255) NOT NULL,
  access_token LONGTEXT NOT NULL,
  refresh_token LONGTEXT,
  public_key VARCHAR(255),
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_mp_user_id (mp_user_id),
  INDEX idx_active (is_active)
);
