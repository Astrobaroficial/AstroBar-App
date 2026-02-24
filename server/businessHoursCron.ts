import { BusinessHoursService } from "./businessHoursService";

// Run every 5 minutes to check and update business statuses
export function startBusinessHoursCron() {
  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  console.log("🕐 Business hours cron started - checking every 5 minutes");

  // Run immediately on start
  BusinessHoursService.updateAllBusinessStatuses().catch(console.error);

  // Then run every 5 minutes
  setInterval(() => {
    BusinessHoursService.updateAllBusinessStatuses().catch(console.error);
  }, INTERVAL);
}
