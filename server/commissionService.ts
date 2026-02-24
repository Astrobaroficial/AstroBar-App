import { db } from "./db";
import { businessCommissions, systemSettings } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

export class CommissionService {
  // Get commission for a specific business
  static async getBusinessCommission(businessId: string): Promise<number> {
    try {
      const [commission] = await db
        .select()
        .from(businessCommissions)
        .where(eq(businessCommissions.businessId, businessId))
        .limit(1);

      if (commission) {
        return parseFloat(commission.platformCommission);
      }

      // Return default commission if not configured
      return await this.getDefaultCommission();
    } catch (error) {
      console.error("Error getting business commission:", error);
      return await this.getDefaultCommission();
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

      return 0.30; // 30% default
    } catch (error) {
      console.error("Error getting default commission:", error);
      return 0.30;
    }
  }

  // Calculate split based on commission
  // Bar receives 100% of product price, platform charges commission on top
  static calculateSplit(productPrice: number, platformCommission: number) {
    const businessAmount = productPrice; // Bar gets 100% of product price
    const platformAmount = Math.round(productPrice * platformCommission); // Platform charges commission
    const totalAmount = businessAmount + platformAmount; // Total user pays

    return {
      platform: platformAmount,
      business: businessAmount,
      total: totalAmount,
      platformPercentage: platformCommission,
    };
  }

  // Set commission for a business
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
