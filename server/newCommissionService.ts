import { ProgressiveCommissionService } from "./progressiveCommissionService";

export class NewCommissionService {
  
  /**
   * Calcula las comisiones con el nuevo sistema progresivo:
   * - El cliente paga el precio de lista (subtotal) + delivery.
   * - Delivery: 100% al repartidor.
   * - Comisión AstroBar: % dinámico (0% a 15%) deducido del precio de los productos.
   * - Comercio: Recibe el subtotal menos la comisión de AstroBar.
   */
  static async calculateCommissions(businessId: string, subtotal: number, deliveryFee: number) {
    // 1. Calculamos la división dinámica usando el servicio que ya armamos
    const splitData = await ProgressiveCommissionService.calculateProgressiveSplit(businessId, subtotal);
    
    return {
      // Lo que recibe cada parte
      business: splitData.business,     // Ej: $9.700 (si subtotal es 10000 y está en 3%)
      driver: deliveryFee,              // Ej: $1.500 (100% del costo de envío)
      AstroBar: splitData.platform,     // Ej: $300 (El % de comisión de AstroBar)
      
      // Totales para procesar el cobro al cliente
      totalCustomerPays: subtotal + deliveryFee, // Ej: $11.500 total a pagar por el usuario
      subtotalProducts: subtotal,
      deliveryBase: deliveryFee,
      
      // Información extra para la base de datos o recibos
      commissionRateApplied: splitData.platformPercentage,
      commissionType: splitData.commissionType
    };
  }
}