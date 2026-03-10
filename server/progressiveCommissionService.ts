import { db } from "./db";
import { businesses, businessCommissions, systemSettings } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

export class ProgressiveCommissionService {
  // Calculate commission based on business registration date
  static async getProgressiveCommission(businessId: string): Promise<number> {
    try {
      // First check if there's a manual commission override
      const [manualCommission] = await db
        .select()
        .from(businessCommissions)
        .where(eq(businessCommissions.businessId, businessId))
        .limit(1);

      if (manualCommission) {
        return parseFloat(manualCommission.platformCommission);
      }

      // Get business registration date
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return await this.getDefaultCommission();
      }

      const registrationDate = new Date(business.createdAt);
      const now = new Date();
      const monthsDiff = this.getMonthsDifference(registrationDate, now);

      // Progressive commission system:
      // Month 1: 0% (free)
      // Month 2: 5%
      // Month 3: 10%
      // Month 4+: 15%
      if (monthsDiff < 1) {
        return 0.00; // First month free
      } else if (monthsDiff < 2) {
        return 0.05; // Second month 5%
      } else if (monthsDiff < 3) {
        return 0.10; // Third month 10%
      } else {
        return 0.15; // Fourth month onwards 15%
      }
    } catch (error) {
      console.error("Error calculating progressive commission:", error);
      return await this.getDefaultCommission();
    }
  }

  // Get months difference between two dates
  private static getMonthsDifference(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  // Get default commission (fallback)
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

      return 0.15; // 15% default for established bars
    } catch (error) {
      console.error("Error getting default commission:", error);
      return 0.15;
    }
  }

  // Calculate split with progressive commission
  static async calculateProgressiveSplit(businessId: string, productPrice: number) {
    const platformCommission = await this.getProgressiveCommission(businessId);
    
    const businessAmount = productPrice; // Bar gets 100% of product price
    const platformAmount = Math.round(productPrice * platformCommission); // Platform charges commission
    const totalAmount = businessAmount + platformAmount; // Total user pays

    return {
      platform: platformAmount,
      business: businessAmount,
      total: totalAmount,
      platformPercentage: platformCommission,
      commissionType: this.getCommissionType(platformCommission),
    };
  }

  // Get commission type description
  private static getCommissionType(commission: number): string {
    if (commission === 0) return "Primer mes gratis";
    if (commission === 0.05) return "Segundo mes - 5%";
    if (commission === 0.10) return "Tercer mes - 10%";
    if (commission === 0.15) return "Comisión estándar - 15%";
    return `Comisión personalizada - ${(commission * 100).toFixed(0)}%`;
  }

  // Override commission for a specific business (admin function)
  static async setCustomCommission(
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
            notes: notes || `Comisión personalizada: ${(platformCommission * 100).toFixed(0)}%`,
            createdBy,
            updatedAt: new Date(),
          })
          .where(eq(businessCommissions.businessId, businessId));
      } else {
        await db.insert(businessCommissions).values({
          businessId,
          platformCommission: platformCommission.toString(),
          notes: notes || `Comisión personalizada: ${(platformCommission * 100).toFixed(0)}%`,
          createdBy,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error setting custom commission:", error);
      return { success: false, error };
    }
  }

  // Get commission info for display
  static async getCommissionInfo(businessId: string) {
    try {
      const commission = await this.getProgressiveCommission(businessId);
      const commissionType = this.getCommissionType(commission);
      
      // Check if it's a manual override
      const [manualCommission] = await db
        .select()
        .from(businessCommissions)
        .where(eq(businessCommissions.businessId, businessId))
        .limit(1);

      const isCustom = !!manualCommission;

      return {
        commission,
        commissionType,
        isCustom,
        percentage: `${(commission * 100).toFixed(0)}%`,
      };
    } catch (error) {
      console.error("Error getting commission info:", error);
      return {
        commission: 0.15,
        commissionType: "Error - usando comisión por defecto",
        isCustom: false,
        percentage: "15%",
      };
    }
  }
}