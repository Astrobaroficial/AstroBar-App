-- MÓDULO 8: SISTEMA DE REFERIDOS (FIXED - Sin FK a users)

CREATE TABLE IF NOT EXISTS referral_codes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  link VARCHAR(500) NOT NULL UNIQUE,
  total_referrals INT DEFAULT 0,
  successful_referrals INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(255) PRIMARY KEY,
  referrer_id VARCHAR(255) NOT NULL,
  referred_id VARCHAR(255) NOT NULL,
  referral_code VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reward_amount INT DEFAULT 0,
  first_purchase_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  ip_address VARCHAR(100),
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referral_fraud_checks (
  id VARCHAR(255) PRIMARY KEY,
  referral_id VARCHAR(255) NOT NULL,
  fraud_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'low',
  details TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_fraud_checks_referral ON referral_fraud_checks(referral_id);
