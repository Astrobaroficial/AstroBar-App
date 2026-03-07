-- MÓDULO 13: SISTEMA DE FRASES Y MENSAJES
-- Mensajes de consumo responsable, marketing y motivación

-- Tabla de frases del sistema
CREATE TABLE IF NOT EXISTS system_messages (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  message_type VARCHAR(50) NOT NULL, -- responsible_drinking, marketing, motivation, tip, warning
  title VARCHAR(255),
  message TEXT NOT NULL,
  display_context VARCHAR(100), -- checkout, home, profile, promotion, post_purchase
  priority INT DEFAULT 0, -- mayor = más importante
  frequency VARCHAR(50) DEFAULT 'normal', -- always, once_per_session, once_per_day, random
  is_active BOOLEAN DEFAULT TRUE,
  display_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de mensajes mostrados a usuarios
CREATE TABLE IF NOT EXISTS user_message_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  displayed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  was_read BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES system_messages(id) ON DELETE CASCADE
);

-- Tabla de mensajes personalizados por bar
CREATE TABLE IF NOT EXISTS bar_custom_messages (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- welcome, promotion, closing, special_event
  message TEXT NOT NULL,
  display_on VARCHAR(100), -- bar_page, checkout, qr_scan
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_system_messages_type ON system_messages(message_type);
CREATE INDEX idx_system_messages_context ON system_messages(display_context);
CREATE INDEX idx_user_message_history_user ON user_message_history(user_id);
CREATE INDEX idx_bar_custom_messages_business ON bar_custom_messages(business_id);

-- Insertar mensajes de consumo responsable por defecto
INSERT INTO system_messages (message_type, title, message, display_context, priority) VALUES
('responsible_drinking', 'Consumo Responsable', 'Recordá tomar con moderación. Tu seguridad es lo más importante.', 'checkout', 10),
('responsible_drinking', 'Designá un conductor', 'Si tomás, no manejes. Usá transporte público o apps de viaje.', 'post_purchase', 10),
('responsible_drinking', 'Conocé tus límites', 'El alcohol afecta a cada persona de manera diferente. Conocé tu límite.', 'promotion', 8),
('marketing', '¡Bienvenido a AstroDrinks!', 'Descubrí las mejores promos de bares cerca tuyo.', 'home', 5),
('motivation', '¡Sumá puntos!', 'Cada compra te acerca a recompensas exclusivas.', 'post_purchase', 3);
