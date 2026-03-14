-- Migration: Create favorites table
-- Description: Tabla para almacenar favoritos de usuarios (negocios y productos)
-- Date: 2024

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(255) NOT NULL,
  business_id VARCHAR(255),
  product_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_business_id (business_id),
  INDEX idx_product_id (product_id),
  INDEX idx_user_business (user_id, business_id),
  INDEX idx_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla favorites creada exitosamente' AS status;
