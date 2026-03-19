import { db } from "../config/db.js";

// ADD FAVORITE
export const addFavorite = async (req, res) => {
  try {
    const { user_id, flyer_id } = req.body;

    if (!user_id || !flyer_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and flyer_id are required"
      });
    }

    // Check if already favorited
    const [existing] = await db.query(
      "SELECT id FROM flyer_favorites WHERE user_id = ? AND flyer_id = ?",
      [user_id, flyer_id]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Already in favorites"
      });
    }

    await db.query(
      "INSERT INTO flyer_favorites (user_id, flyer_id) VALUES (?, ?)",
      [user_id, flyer_id]
    );

    res.status(201).json({
      success: true,
      message: "Added to favorites"
    });

  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// REMOVE FAVORITE
export const removeFavorite = async (req, res) => {
  try {
    const { user_id, flyer_id } = req.body;

    if (!user_id || !flyer_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and flyer_id are required"
      });
    }

    const [result] = await db.query(
      "DELETE FROM flyer_favorites WHERE user_id = ? AND flyer_id = ?",
      [user_id, flyer_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Removed from favorites"
    });

  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL FAVORITE FLYERS FOR A USER
export const getUserFavorites = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required"
      });
    }

    const [rows] = await db.query(`
      SELECT f.* 
      FROM flyers f
      INNER JOIN flyer_favorites fav ON f.id = fav.flyer_id
      WHERE fav.user_id = ?
      ORDER BY fav.created_at DESC
    `, [user_id]);

    // Parse categories
    const formatted = rows.map(flyer => ({
      ...flyer,
      categories: flyer.categories ? JSON.parse(flyer.categories) : [],
      recentlyAdded: !!flyer.recently_added,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      favorites: formatted
    });

  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




// GET TOP FLYERS — purchases + favorites count
export const getTopFlyers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        f.id,
        f.title,
        f.image_url,
        COUNT(DISTINCT o.id) as purchases,
        COUNT(DISTINCT fav.id) as favorites
      FROM flyers f
      LEFT JOIN flyer_orders o ON o.flyer_is = f.id
      LEFT JOIN flyer_favorites fav ON fav.flyer_id = f.id
      GROUP BY f.id, f.title, f.image_url
      ORDER BY (purchases + favorites) DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      topFlyers: rows
    });
  } catch (error) {
    console.error("Get top flyers error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};