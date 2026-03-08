-- Sistema de Pedidos de Productos (separado de Promociones)
-- Migración segura que verifica existencia de tablas y columnas

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  business_id VARCHAR(36) NOT NULL,
  total_amount INT NOT NULL COMMENT 'Total en centavos (productos)',
  platform_commission_amount INT NOT NULL COMMENT 'Comisión plataforma en centavos',
  business_revenue INT NOT NULL COMMENT 'Ingreso del bar en centavos',
  platform_commission_rate DECIMAL(5,4) NOT NULL COMMENT 'Tasa de comisión aplicada',
  status ENUM('pending', 'paid', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
  qr_code VARCHAR(255) UNIQUE,
  payment_intent_id VARCHAR(255),
  can_cancel_until DATETIME,
  paid_at DATETIME,
  delivered_at DATETIME,
  cancelled_at DATETIME,
  cancellation_reason TEXT,
  points_awarded INT DEFAULT 0 COMMENT 'Puntos otorgados al usuario',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_user_orders (user_id, created_at DESC),
  INDEX idx_business_orders (business_id, created_at DESC),
  INDEX idx_qr_code (qr_code),
  INDEX idx_status (status),
  INDEX idx_orders_paid_at (paid_at),
  INDEX idx_orders_delivered_at (delivered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de items del pedido
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL COMMENT 'Snapshot del nombre',
  product_price INT NOT NULL COMMENT 'Snapshot del precio en centavos',
  quantity INT NOT NULL DEFAULT 1,
  subtotal INT NOT NULL COMMENT 'price * quantity en centavos',
  notes TEXT COMMENT 'Notas especiales del cliente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order_items (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
