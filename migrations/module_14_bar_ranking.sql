-- MÓDULO 14: SISTEMA DE NIVELES PARA BARES
-- Ranking de bares, beneficios por volumen y descuentos en comisión

-- Tabla de niveles de bares
CREATE TABLE IF NOT EXISTS bar_levels (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  level_name VARCHAR(50) NOT NULL UNIQUE, -- bronze, silver, gold, platinum, diamond
  level_number INT NOT NULL UNIQUE,
  min_monthly_sales INT NOT NULL, -- en centavos
  min_promotions INT DEFAULT 0,
  min_rating DECIMAL(3, 2) DEFAULT 0.00,
  commission_discount DECIMAL(5, 4) DEFAULT 0.0000, -- descuento en comisión (ej: 0.05 = 5%)
  benefits TEXT, -- JSON con beneficios
  badge_icon TEXT,
  badge_color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de progreso de bares
CREATE TABLE IF NOT EXISTS bar_progress (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL UNIQUE,
  current_level VARCHAR(50) DEFAULT 'bronze',
  current_level_number INT DEFAULT 1,
  monthly_sales INT DEFAULT 0, -- en centavos
  monthly_promotions INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  total_promotions INT DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0.00,
  next_level VARCHAR(50),
  progress_percentage INT DEFAULT 0,
  last_level_up TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Tabla de ranking de bares
CREATE TABLE IF NOT EXISTS bar_rankings (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  ranking_type VARCHAR(50) NOT NULL, -- monthly_sales, total_sales, promotions, rating
  rank_position INT NOT NULL,
  score DECIMAL(10, 2) NOT NULL,
  period VARCHAR(50) NOT NULL, -- 2024-01, 2024-Q1, all_time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Tabla de historial de niveles
CREATE TABLE IF NOT EXISTS bar_level_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  old_level VARCHAR(50),
  new_level VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_bar_progress_business ON bar_progress(business_id);
CREATE INDEX idx_bar_progress_level ON bar_progress(current_level_number);
CREATE INDEX idx_bar_rankings_business ON bar_rankings(business_id);
CREATE INDEX idx_bar_rankings_type ON bar_rankings(ranking_type, period);
CREATE INDEX idx_bar_level_history_business ON bar_level_history(business_id);

-- Insertar niveles por defecto
INSERT INTO bar_levels (level_name, level_number, min_monthly_sales, min_promotions, min_rating, commission_discount, benefits, badge_color) VALUES
('bronze', 1, 0, 0, 0.00, 0.0000, '{"features": ["basic_analytics", "standard_support"]}', '#CD7F32'),
('silver', 2, 50000000, 10, 4.00, 0.0100, '{"features": ["advanced_analytics", "priority_support", "featured_listing"]}', '#C0C0C0'),
('gold', 3, 100000000, 20, 4.20, 0.0200, '{"features": ["premium_analytics", "24/7_support", "top_featured", "custom_promos"]}', '#FFD700'),
('platinum', 4, 200000000, 40, 4.50, 0.0300, '{"features": ["all_gold_features", "dedicated_manager", "marketing_support"]}', '#E5E4E2'),
('diamond', 5, 500000000, 80, 4.70, 0.0500, '{"features": ["all_platinum_features", "zero_commission_days", "exclusive_events"]}', '#B9F2FF');
