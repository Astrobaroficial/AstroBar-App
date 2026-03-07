-- Migration: Add Admin Panel Tables
-- Date: 2026-02-24

-- Business Commissions Table
CREATE TABLE IF NOT EXISTS `business_commissions` (
  `id` VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  `business_id` VARCHAR(255) NOT NULL UNIQUE,
  `platform_commission` DECIMAL(5, 4) NOT NULL DEFAULT 0.3000,
  `effective_from` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `created_by` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_business_id` (`business_id`)
);

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  `title` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(255),
  `sent_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'pending',
  `sent_by` VARCHAR(255) NOT NULL,
  `sent_at` TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_sent_by` (`sent_by`)
);

-- Insert default system settings for limits
INSERT INTO `system_settings` (`key`, `value`, `type`, `category`, `description`, `is_public`) VALUES
('max_active_bars', '100', 'number', 'limits', 'Máximo de bares activos permitidos', false),
('max_products_per_bar', '80', 'number', 'limits', 'Máximo de productos por bar', false),
('max_images_per_bar', '80', 'number', 'limits', 'Máximo de imágenes por bar', false),
('max_common_promotions', '10', 'number', 'limits', 'Máximo de promociones comunes activas por bar', false),
('max_flash_promotions', '3', 'number', 'limits', 'Máximo de promociones flash activas por bar', false),
('default_platform_commission', '0.30', 'number', 'commissions', 'Comisión por defecto de la plataforma (30%)', false),
('cancellation_window_seconds', '60', 'number', 'operations', 'Ventana de cancelación en segundos', false)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
