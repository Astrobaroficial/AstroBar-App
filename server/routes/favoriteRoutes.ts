import { Router } from 'express';
import { db } from '../db';
import { favorites } from '../../shared/schema-mysql';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from '../authMiddleware';

const router = Router();

// Check if business is favorited
router.get('/check/:userId/:businessId', async (req, res) => {
  try {
    const { userId, businessId } = req.params;

    const favorite = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.businessId, businessId)
        )
      )
      .limit(1);

    res.json({
      success: true,
      isFavorite: favorite.length > 0,
    });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar favorito',
    });
  }
});

// Toggle favorite
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.body;
    const userId = (req as any).user.id;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId es requerido',
      });
    }

    // Check if already favorited
    const existing = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.businessId, businessId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove favorite
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.businessId, businessId)
          )
        );

      return res.json({
        success: true,
        isFavorite: false,
        message: 'Eliminado de favoritos',
      });
    } else {
      // Add favorite
      await db.insert(favorites).values({
        userId,
        businessId,
        createdAt: new Date(),
      });

      return res.json({
        success: true,
        isFavorite: true,
        message: 'Agregado a favoritos',
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar favorito',
    });
  }
});

// Get user favorites
router.get('/my-favorites', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId));

    res.json({
      success: true,
      favorites: userFavorites,
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener favoritos',
    });
  }
});

export default router;
