// Debug endpoint - verificar transacciones
router.get("/debug-transactions", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.json({ error: "No business found" });
    }

    const allTransactions = await db.select().from(promotionTransactions).where(eq(promotionTransactions.businessId, business.id));
    
    res.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      totalTransactions: allTransactions.length,
      transactions: allTransactions.map(t => ({
        id: t.id,
        status: t.status,
        amountPaid: t.amountPaid,
        businessRevenue: t.businessRevenue,
        platformCommission: t.platformCommission,
        createdAt: t.createdAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
