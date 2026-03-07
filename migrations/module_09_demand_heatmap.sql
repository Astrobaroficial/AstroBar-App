-- MÓDULO 9: MAPA DE DEMANDA
-- Zonas con calor de consumo y análisis de demanda

-- Tabla de zonas de demanda
CREATE TABLE IF NOT EXISTS demand_zones (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  zone_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_km INT DEFAULT 1,
  total_searches INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_purchases INT DEFAULT 0,
  avg_purchase_amount INT DEFAULT 0,
  peak_hour INT, -- 0-23
  peak_day VARCHAR(20), -- monday, tuesday, etc
  heat_score INT DEFAULT 0, -- 0-100
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos de demanda
CREATE TABLE IF NOT EXISTS demand_events (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(255),
  business_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL, -- search, view, click, purchase
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hour INT, -- 0-23
  day_of_week VARCHAR(20),
  amount INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);

-- Tabla de recomendaciones para bares
CREATE TABLE IF NOT EXISTS bar_recommendations (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  recommendation_type VARCHAR(100) NOT NULL, -- best_time, price_suggestion, promo_type
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_demand_zones_location ON demand_zones(latitude, longitude);
CREATE INDEX idx_demand_events_user ON demand_events(user_id);
CREATE INDEX idx_demand_events_business ON demand_events(business_id);
CREATE INDEX idx_demand_events_time ON demand_events(hour, day_of_week);
CREATE INDEX idx_bar_recommendations_business ON bar_recommendations(business_id);
