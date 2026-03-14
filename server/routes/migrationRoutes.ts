import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Endpoint temporal para crear tabla favorites
router.post('/run-favorites-migration', async (req, res) => {
  try {
    console.log('🔧 Running favorites table migration...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255),
        product_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_business_id (business_id),
        INDEX idx_product_id (product_id),
        INDEX idx_user_business (user_id, business_id),
        INDEX idx_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Favorites table created successfully');
    
    res.json({
      success: true,
      message: 'Tabla favorites creada exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
