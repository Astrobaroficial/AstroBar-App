-- MÓDULO 8: SISTEMA DE REFERIDOS
-- Sistema de referidos con links únicos y anti-fraude

-- Tabla de códigos de referido
CREATE TABLE IF NOT EXISTS referral_codes (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  link VARCHAR(500) NOT NULL UNIQUE,
  total_referrals INT DEFAULT 0,
  successful_referrals INT DEFAULT 0,
  total_earned INT DEFAULT 0, -- en centavos
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  referrer_id VARCHAR(255) NOT NULL, -- quien refiere
  referred_id VARCHAR(255) NOT NULL, -- quien fue referido
  referral_code VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, rewarded, fraud
  reward_amount INT DEFAULT 0, -- en centavos
  first_purchase_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  ip_address VARCHAR(100),
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_code) REFERENCES referral_codes(code)
);

-- Tabla de detección de fraude
CREATE TABLE IF NOT EXISTS referral_fraud_checks (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  referral_id VARCHAR(255) NOT NULL,
  fraud_type VARCHAR(100) NOT NULL, -- same_ip, same_device, suspicious_pattern, multiple_accounts
  severity VARCHAR(50) DEFAULT 'low', -- low, medium, high
  details TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE
);

-- Índices para optimización
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_fraud_checks_referral ON referral_fraud_checks(referral_id);
