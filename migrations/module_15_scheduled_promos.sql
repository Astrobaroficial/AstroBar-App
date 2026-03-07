-- MÓDULO 15: PROMOS PROGRAMADAS Y AUTOMÁTICAS
-- Programar promos por horario, activación automática y segmentación por zona

-- Tabla de plantillas de promociones
CREATE TABLE IF NOT EXISTS promotion_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL, -- flash, common
  original_price INT NOT NULL,
  promo_price INT NOT NULL,
  discount_percentage INT,
  stock INT DEFAULT 0,
  image TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Tabla de promociones programadas
CREATE TABLE IF NOT EXISTS scheduled_promotions (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  original_price INT NOT NULL,
  promo_price INT NOT NULL,
  stock INT NOT NULL,
  image TEXT,
  
  -- Programación
  schedule_type VARCHAR(50) NOT NULL, -- once, daily, weekly, monthly
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week VARCHAR(100), -- JSON: ["monday", "friday"]
  
  -- Segmentación
  target_zone_ids TEXT, -- JSON: ["zone1", "zone2"]
  target_user_levels TEXT, -- JSON: ["gold", "platinum"]
  min_user_points INT DEFAULT 0,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
  auto_activate BOOLEAN DEFAULT TRUE,
  created_promotion_id VARCHAR(255), -- ID de la promo creada automáticamente
  last_activation TIMESTAMP,
  next_activation TIMESTAMP,
  activation_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES promotion_templates(id) ON DELETE SET NULL
);

-- Tabla de historial de activaciones
CREATE TABLE IF NOT EXISTS promotion_activation_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  scheduled_promotion_id VARCHAR(255) NOT NULL,
  promotion_id VARCHAR(255), -- ID de la promo real creada
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  total_stock INT,
  stock_consumed INT DEFAULT 0,
  total_revenue INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed', -- completed, cancelled, expired
  FOREIGN KEY (scheduled_promotion_id) REFERENCES scheduled_promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL
);

-- Tabla de reglas de auto-promoción
CREATE TABLE IF NOT EXISTS auto_promotion_rules (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- low_traffic, slow_sales, competitor_promo, weather, event
  trigger_conditions TEXT, -- JSON con condiciones
  template_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP,
  trigger_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES promotion_templates(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_promotion_templates_business ON promotion_templates(business_id);
CREATE INDEX idx_scheduled_promotions_business ON scheduled_promotions(business_id);
CREATE INDEX idx_scheduled_promotions_status ON scheduled_promotions(status);
CREATE INDEX idx_scheduled_promotions_next ON scheduled_promotions(next_activation);
CREATE INDEX idx_activation_history_scheduled ON promotion_activation_history(scheduled_promotion_id);
CREATE INDEX idx_auto_rules_business ON auto_promotion_rules(business_id);
