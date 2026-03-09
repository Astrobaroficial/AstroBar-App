import express from "express";
import multer from "multer";
import path from "path";
import { authenticateToken } from "../authMiddleware";
import { businesses, products, users } from "@shared/schema-mysql";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = express.Router();

// Configurar multer para guardar imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, webp)"));
    }
  },
});

// Subir imagen de negocio
router.post("/business/upload-image", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ninguna imagen" });
    }

    // Obtener negocio del usuario
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Actualizar imagen del negocio
    await db.update(businesses).set({ image: imageUrl }).where(eq(businesses.id, business.id));

    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error uploading business image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Subir imagen de producto
router.post("/product/:id/upload-image", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ninguna imagen" });
    }

    const { id } = req.params;
    
    // Verificar que el producto pertenece al negocio del usuario
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.id, product.businessId)).limit(1);
    
    if (!business || business.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes permiso para editar este producto" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Actualizar imagen del producto
    await db.update(products).set({ image: imageUrl }).where(eq(products.id, id));

    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error uploading product image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Subir imagen de producto (base64)
router.post("/product-image", authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No se proporcionó imagen" });
    }

    // Extraer base64 y guardar como archivo
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: "Formato de imagen inválido" });
    }

    const extension = matches[1];
    const base64Data = matches[2];
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filepath = path.join(__dirname, "../uploads", filename);

    // Guardar archivo
    const fs = require("fs");
    fs.writeFileSync(filepath, Buffer.from(base64Data, "base64"));

    const imageUrl = `/uploads/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error uploading product image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Subir imagen de perfil de usuario
router.post("/user/upload-image", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ninguna imagen" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Actualizar imagen del usuario
    await db.update(users).set({ profileImage: imageUrl }).where(eq(users.id, req.user!.id));

    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error uploading user image:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
