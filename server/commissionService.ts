import { db } from "./db";
import { businessCommissions, businesses, systemSettings } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

export class CommissionService {
  /**
   * Obtiene la comisión calculada según los meses de antigüedad del comercio.
   * Si existe una comisión personalizada manual en businessCommissions, se respeta.
   */
  static async getBusinessCommission(businessId: string): Promise<number> {
    try {
      // 1. Verificar si hay una comisión personalizada manual para este negocio
      const [commission] = await db
        .select()
        .from(businessCommissions)
        .where(eq(businessCommissions.businessId, businessId))
        .limit(1);

      if (commission) {
        return parseFloat(commission.platformCommission);
      }

      // 2. Si no hay personalizada, calcularla por la antigüedad (createdAt)
      const [business] = await db
        .select({ createdAt: businesses.createdAt })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (business && business.createdAt) {
        return this.calculateProgressiveCommissionRate(business.createdAt);
      }

      return await this.getDefaultCommission();
    } catch (error) {
      console.error("Error getting business commission:", error);
      return await this.getDefaultCommission();
    }
  }

  /**
   * Calcula el porcentaje según la antigüedad de la cuenta del comercio.
   * Mes 1: 0% | Mes 2: 3% | Mes 3: 6% | Mes 4: 9% | Mes 5: 13% | Mes 6+: 15%
   */
  static calculateProgressiveCommissionRate(createdAt: Date | string): number {
    const created = new Date(createdAt);
    const now = new Date();

    let monthDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());

    if (now.getDate() < created.getDate()) {
      monthDiff--;
    }

    const monthNumber = Math.max(1, monthDiff + 1);

    switch (monthNumber) {
      case 1:
        return 0;      // 0% (mes 1)
      case 2:
        return 0.03;   // 3% (mes 2)
      case 3:
        return 0.06;   // 6% (mes 3)
      case 4:
        return 0.09;   // 9% (mes 4)
      case 5:
        return 0.13;   // 13% (mes 5)
      default:
        return 0.15;   // 15% (mes 6 en adelante)
    }
  }

  // Get default platform commission
  static async getDefaultCommission(): Promise<number> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "default_platform_commission"))
        .limit(1);

      if (setting) {
        return parseFloat(setting.value);
      }

      return 0.15; // 15% default máximo
    } catch (error) {
      console.error("Error getting default commission:", error);
      return 0.15;
    }
  }

  /**
   * Modificado: Divide el pago del usuario entre el comercio y AstroBar.
   * Ejemplo para total $10.000 con 3% de comisión (0.03):
   * - AstroBar = $300
   * - Comercio = $9.700
   */
  static calculateSplit(totalAmount: number, platformCommission: number) {
    const platformAmount = Math.round(totalAmount * platformCommission);
    const businessAmount = totalAmount - platformAmount;

    return {
      platform: platformAmount,
      business: businessAmount,
      total: totalAmount,
      platformPercentage: platformCommission,
    };
  }

  // Set manual commission for a business
  static async setBusinessCommission(
    businessId: string,
    platformCommission: number,
    notes?: string,
    createdBy?: string
  ) {
    try {
      const [existing] = await db
        .select()
        .from(businessCommissions)
        .where(eq(businessCommissions.businessId, businessId))
        .limit(1);

      if (existing) {
        await db
          .update(businessCommissions)
          .set({
            platformCommission: platformCommission.toString(),
            notes,
            createdBy,
            updatedAt: new Date(),
          })
          .where(eq(businessCommissions.businessId, businessId));
      } else {
        await db.insert(businessCommissions).values({
          businessId,
          platformCommission: platformCommission.toString(),
          notes,
          createdBy,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error setting business commission:", error);
      return { success: false, error };
    }
  }
}