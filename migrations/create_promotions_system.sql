-- Migración: Sistema de Promociones AstroBar MVP
-- Fecha: 2026-02-21
-- Descripción: Tablas para promociones flash/comunes y transacciones con QR

USE astrobar_db;

-- Tabla de promociones
CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(255) PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('flash', 'common') NOT NULL DEFAULT 'common',
  original_price INT NOT NULL, -- en centavos
  promo_price INT NOT NULL, -- en centavos
  discount_percentage INT, -- calculado
  stock INT NOT NULL DEFAULT 0,
  stock_consumed INT NOT NULL DEFAULT 0,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_business (business_id),
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_times (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transacciones de promociones (aceptadas por usuarios)
CREATE TABLE IF NOT EXISTS promotion_transactions (
  id VARCHAR(255) PRIMARY KEY,
  promotion_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  business_id VARCHAR(255) NOT NULL,
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'redeemed', 'expired') NOT NULL DEFAULT 'pending',
  amount_paid INT NOT NULL, -- en centavos
  platform_commission INT NOT NULL, -- en centavos
  business_revenue INT NOT NULL, -- en centavos
  can_cancel_until TIMESTAMP, -- 60 segundos después de crear
  redeemed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_business (business_id),
  INDEX idx_promotion (promotion_id),
  INDEX idx_qr (qr_code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de puntos de usuario (sistema de niveles)
CREATE TABLE IF NOT EXISTS user_points (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  total_points INT NOT NULL DEFAULT 0,
  current_level ENUM('copper', 'bronze', 'silver', 'gold', 'platinum') NOT NULL DEFAULT 'copper',
  promotions_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_level (current_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas de promociones creadas exitosamente' AS resultado;
