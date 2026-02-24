import express from "express";
import { authenticateToken } from "../authMiddleware";
import { db } from "../db";
import { users } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

const router = express.Router();

// Obtener cuenta bancaria SPEI/CoDi del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [user] = await db
      .select({ bankAccount: users.bankAccount })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    let bankAccount = null;
    if (user?.bankAccount) {
      try {
        bankAccount = JSON.parse(user.bankAccount as string);
      } catch (parseError) {
        // Si no es JSON válido, devolver en crudo para no bloquear al usuario
        bankAccount = user.bankAccount;
      }
    }

    res.json({ success: true, bankAccount });
  } catch (error: any) {
    console.error("Error loading bank account:", error);
    res.status(500).json({ error: "Error al cargar la cuenta bancaria" });
  }
});

// Guardar/actualizar cuenta bancaria SPEI/CoDi del usuario
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { clabe, bankName, accountHolder } = req.body || {};

    if (!clabe || `${clabe}`.trim().length !== 18) {
      return res.status(400).json({ error: "CLABE debe tener 18 dígitos" });
    }
    if (!bankName || !accountHolder) {
      return res.status(400).json({ error: "Banco y titular son requeridos" });
    }

    const bankAccount = {
      clabe: `${clabe}`.trim(),
      bankName: `${bankName}`.trim(),
      accountHolder: `${accountHolder}`.trim(),
    };

    await db
      .update(users)
      .set({ bankAccount: JSON.stringify(bankAccount) })
      .where(eq(users.id, req.user!.id));

    res.json({ success: true, bankAccount });
  } catch (error: any) {
    console.error("Error saving bank account:", error);
    res.status(500).json({ error: "Error al guardar la cuenta bancaria" });
  }
});

export default router;
