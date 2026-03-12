-- Create payment_cards table for storing customer payment methods
CREATE TABLE IF NOT EXISTS payment_cards (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  last_four_digits VARCHAR(4) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  expiry_month INT NOT NULL,
  expiry_year INT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  mp_token_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
);
