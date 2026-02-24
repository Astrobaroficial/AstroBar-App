import cron from "node-cron";
import { WeeklySettlementService } from "./weeklySettlementService";
import { StripeWeeklyTransferService } from "./stripeWeeklyTransferService";

export class WeeklySettlementCron {
  /**
   * Iniciar todos los cron jobs
   */
  static start() {
    // Viernes a las 11:59 PM - FLUJO RESTRICTIVO: Cerrar semana y bloquear
    cron.schedule("59 23 * * 5", async () => {
      console.log("🕐 FLUJO RESTRICTIVO VIERNES: Cerrando semana y bloqueando drivers con deuda...");
      try {
        const result = await WeeklySettlementService.closeWeek();
        console.log(`✅ Semana cerrada: ${result.count} liquidaciones creadas, ${result.blocked} drivers bloqueados`);
      } catch (error) {
        console.error("❌ Error al cerrar semana:", error);
      }
    });

    // Lunes a las 12:00 AM - Bloquear drivers sin pago
    cron.schedule("0 0 * * 1", async () => {
      console.log("🕐 Ejecutando bloqueo de drivers...");
      try {
        const result = await WeeklySettlementService.blockUnpaidDrivers();
        console.log(`🚫 ${result.blocked} drivers bloqueados`);
      } catch (error) {
        console.error("❌ Error al bloquear drivers:", error);
      }
    });

    // Sábados a las 2:00 AM - Transferencias Stripe Connect (como Uber/Rappi)
    cron.schedule("0 2 * * 6", async () => {
      console.log("🕐 Procesando transferencias semanales Stripe Connect...");
      try {
        const result = await StripeWeeklyTransferService.processWeeklyTransfers();
        console.log(`💰 Transferencias completadas: ${result.transfersSuccessful}/${result.driversProcessed} - $${(result.totalAmount / 100).toFixed(2)}`);
      } catch (error) {
        console.error("❌ Error en transferencias Stripe:", error);
      }
    });

    console.log("⏰ Cron jobs de liquidación semanal iniciados:");
    console.log("   - Viernes 11:59 PM: FLUJO RESTRICTIVO - Cierre y bloqueo inmediato");
    console.log("   - Lunes 12:00 AM: Bloqueo definitivo de drivers sin pago");
    console.log("   - Sábados 2:00 AM: Transferencias Stripe Connect (como Uber/Rappi)");
  }
}
