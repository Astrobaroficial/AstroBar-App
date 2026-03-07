-- Tabla de comisiones personalizadas por bar
CREATE TABLE IF NOT EXISTS business_commissions (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  platform_commission DECIMAL(5,4) NOT NULL DEFAULT 0.30,
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_business (business_id)
);
