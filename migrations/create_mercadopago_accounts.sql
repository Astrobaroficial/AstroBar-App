-- Tabla para cuentas de Mercado Pago de negocios (business owners)
CREATE TABLE IF NOT EXISTS mercadopago_accounts (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  mp_user_id VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  public_key VARCHAR(255),
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_business (business_id),
  KEY idx_business_id (business_id),
  KEY idx_mp_user_id (mp_user_id),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
