-- MÓDULO 12: LINKS Y QR DE INVITACIÓN
-- QR general de la app y links únicos por usuario

-- Tabla de links de invitación
CREATE TABLE IF NOT EXISTS invitation_links (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(255) NOT NULL,
  link_type VARCHAR(50) NOT NULL, -- app_general, user_referral, bar_specific
  short_code VARCHAR(50) NOT NULL UNIQUE,
  full_url TEXT NOT NULL,
  qr_code_url TEXT,
  video_url TEXT, -- video asociado al link
  landing_page_config TEXT, -- JSON con configuración de landing
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de clicks en links
CREATE TABLE IF NOT EXISTS invitation_clicks (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  link_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  device_type VARCHAR(50), -- mobile, desktop, tablet
  referrer TEXT,
  converted BOOLEAN DEFAULT FALSE,
  registered_user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES invitation_links(id) ON DELETE CASCADE,
  FOREIGN KEY (registered_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla de QR codes generales
CREATE TABLE IF NOT EXISTS app_qr_codes (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  qr_type VARCHAR(50) NOT NULL, -- app_download, bar_menu, promotion, event
  title VARCHAR(255) NOT NULL,
  description TEXT,
  qr_code_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  business_id VARCHAR(255),
  scans INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_invitation_links_user ON invitation_links(user_id);
CREATE INDEX idx_invitation_links_code ON invitation_links(short_code);
CREATE INDEX idx_invitation_clicks_link ON invitation_clicks(link_id);
CREATE INDEX idx_app_qr_codes_business ON app_qr_codes(business_id);
