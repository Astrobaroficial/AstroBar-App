import express from 'express';
import { authenticateToken, requireRole } from '../authMiddleware';

const router = express.Router();

// Middleware de auditoría
export const auditLog = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: any
) => {
  try {
    const { db } = await import('../db');
    
    await db.execute(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [userId, action, entityType, entityId, JSON.stringify(details || {})]);
    
    console.log(`📝 Audit: ${action} on ${entityType}:${entityId} by user:${userId}`);
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Obtener logs de auditoría (admin)
router.get('/audit-logs', authenticateToken, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, action, entityType } = req.query;

    const { db } = await import('../db');
    
    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    
    if (entityType) {
      query += ' AND al.entity_type = ?';
      params.push(entityType);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const logs = await db.execute(query, params);
    
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear tabla de auditoría si no existe
export const createAuditTable = async () => {
  try {
    const { db } = await import('../db');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('✅ Audit logs table ready');
  } catch (error) {
    console.error('Error creating audit table:', error);
  }
};

export default router;
