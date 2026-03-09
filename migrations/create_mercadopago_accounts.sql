-- Tabla para almacenar cuentas de Mercado Pago conectadas
CREATE TABLE IF NOT EXISTS mercadopago_accounts (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  mp_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  public_key VARCHAR(255),
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_business (business_id),
  UNIQUE KEY unique_mp_user (mp_user_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_mp_business ON mercadopago_accounts(business_id);
CREATE INDEX idx_mp_active ON mercadopago_accounts(is_active);
