-- MÓDULO 11: CONTENIDO MULTIMEDIA Y VIDEOS
-- Sistema de videos promocionales y explicativos

-- Tabla de videos
CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_type VARCHAR(50) NOT NULL, -- promotional, tutorial, invitation, bar_showcase
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INT,
  file_size_mb DECIMAL(10, 2),
  views INT DEFAULT 0,
  business_id VARCHAR(255), -- si es video de un bar específico
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla de visualizaciones de videos
CREATE TABLE IF NOT EXISTS video_views (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  video_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  watch_duration_seconds INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla de galerías multimedia
CREATE TABLE IF NOT EXISTS media_galleries (
  id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  media_type VARCHAR(50) NOT NULL, -- image, video
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_videos_type ON videos(video_type);
CREATE INDEX idx_videos_business ON videos(business_id);
CREATE INDEX idx_video_views_video ON video_views(video_id);
CREATE INDEX idx_video_views_user ON video_views(user_id);
CREATE INDEX idx_media_galleries_business ON media_galleries(business_id);
