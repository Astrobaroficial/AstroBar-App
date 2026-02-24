import { db } from './db';
import { sql } from 'drizzle-orm';
import { createTransfer, getConnectAccountByUserId } from './stripeConnectService';
import { logger } from './logger';

export class StripeWeeklyTransferService {
  /**
   * Procesar transferencias semanales a drivers con Stripe Connect
   * Similar a Uber/Rappi - transferencias automáticas cada semana
   */
  static async processWeeklyTransfers() {
    logger.info('🔄 Iniciando transferencias semanales Stripe Connect...');
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Obtener drivers con ganancias de la semana
    const driversWithEarnings = await db.execute(sql`
      SELECT 
        o.delivery_person_id as driver_id,
        u.name as driver_name,
        u.stripe_account_id,
        SUM(o.delivery_earnings) as total_earnings,
        COUNT(o.id) as total_orders
      FROM orders o
      JOIN users u ON o.delivery_person_id = u.id
      WHERE o.status = 'delivered'
      AND o.delivered_at >= ${weekAgo.toISOString()}
      AND o.payment_method = 'card'
      AND o.delivery_earnings > 0
      AND u.stripe_account_id IS NOT NULL
      GROUP BY o.delivery_person_id, u.name, u.stripe_account_id
      HAVING total_earnings > 0
    `);
    
    let transfersProcessed = 0;
    let totalTransferred = 0;
    
    for (const driver of driversWithEarnings.rows as any[]) {
      try {
        // Verificar que la cuenta Connect esté activa
        const connectAccount = await getConnectAccountByUserId(driver.driver_id);
        
        if (!connectAccount || !connectAccount.chargesEnabled || !connectAccount.payoutsEnabled) {
          logger.warn(`⚠️ Driver ${driver.driver_name} - Cuenta Stripe no activa`);
          continue;
        }
        
        // Crear transferencia
        const transfer = await createTransfer(
          driver.stripe_account_id,
          driver.total_earnings,
          `weekly-earnings-${new Date().toISOString().split('T')[0]}`
        );
        
        // Registrar transferencia en BD
        await db.execute(sql`
          INSERT INTO stripe_weekly_transfers 
          (driver_id, stripe_account_id, stripe_transfer_id, amount, orders_count, week_start, status, created_at)
          VALUES (
            ${driver.driver_id}, 
            ${driver.stripe_account_id}, 
            ${transfer.id}, 
            ${driver.total_earnings}, 
            ${driver.total_orders},
            ${weekAgo.toISOString().split('T')[0]},
            'completed', 
            NOW()
          )
        `);
        
        transfersProcessed++;
        totalTransferred += driver.total_earnings;
        
        logger.info(`💰 Transferencia exitosa: ${driver.driver_name} - $${(driver.total_earnings / 100).toFixed(2)} (${driver.total_orders} pedidos)`);
        
      } catch (error) {
        logger.error(`❌ Error transferencia ${driver.driver_name}:`, error);
        
        // Registrar error
        await db.execute(sql`
          INSERT INTO stripe_transfer_errors 
          (driver_id, amount, error_message, created_at)
          VALUES (${driver.driver_id}, ${driver.total_earnings}, ${error.message}, NOW())
        `);
      }
    }
    
    // Registrar resumen
    await db.execute(sql`
      INSERT INTO weekly_transfer_summary 
      (week_start, drivers_processed, transfers_successful, total_amount, created_at)
      VALUES (
        ${weekAgo.toISOString().split('T')[0]}, 
        ${driversWithEarnings.rows.length}, 
        ${transfersProcessed}, 
        ${totalTransferred}, 
        NOW()
      )
    `);
    
    logger.info(`✅ Transferencias semanales completadas: ${transfersProcessed}/${driversWithEarnings.rows.length} - Total: $${(totalTransferred / 100).toFixed(2)}`);
    
    return {
      success: true,
      driversProcessed: driversWithEarnings.rows.length,
      transfersSuccessful: transfersProcessed,
      totalAmount: totalTransferred
    };
  }
  
  /**
   * Obtener historial de transferencias de un driver
   */
  static async getDriverTransferHistory(driverId: string, limit: number = 10) {
    const result = await db.execute(sql`
      SELECT 
        swt.*,
        DATE_FORMAT(swt.created_at, '%d/%m/%Y') as transfer_date
      FROM stripe_weekly_transfers swt
      WHERE swt.driver_id = ${driverId}
      ORDER BY swt.created_at DESC
      LIMIT ${limit}
    `);
    
    return result.rows;
  }
  
  /**
   * Obtener estadísticas de transferencias para admin
   */
  static async getTransferStats(days: number = 30) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_transfers,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        COUNT(DISTINCT driver_id) as unique_drivers
      FROM stripe_weekly_transfers
      WHERE created_at >= ${daysAgo.toISOString()}
      AND status = 'completed'
    `);
    
    return result.rows[0];
  }
}