import { db } from "../config/db.js";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Multer config for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/banners";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(6).toString("hex");
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed!"), false);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// ==================== ENHANCED CONTROLLERS ====================

/**
 * Create Banner with Enhanced Options
 * POST /api/banners/create
 */
export const createBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      button_text,
      button_enabled,
      link_type,
      link_value,
      display_order,
      status
    } = req.body;

    const image = req.file ? req.file.filename : null;

    // Validation
    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: "Title and image are required"
      });
    }

    // Validate link_type
    const validLinkTypes = ['category', 'flyer', 'external', 'none'];
    const linkType = link_type || 'none';

    if (!validLinkTypes.includes(linkType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid link_type. Must be: category, flyer, external, or none"
      });
    }

    // If button is enabled but no text provided, use default
    const buttonText = button_enabled === '1' || button_enabled === true
      ? (button_text || 'GET IT')
      : null;

    const [result] = await db.execute(
      `INSERT INTO banners 
       (title, description, image, button_text, button_enabled, link_type, link_value, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        image,
        buttonText,
        button_enabled === '1' || button_enabled === true ? 1 : 0,
        linkType,
        link_value || null,
        display_order || 0,
        status || 1
      ]
    );

    // Fetch the created banner
    const [banners] = await db.execute(
      "SELECT * FROM banners WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banners[0]
    });

  } catch (err) {
    console.error("Create banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create banner",
      error: err.message
    });
  }
};

/**
 * Update Banner with Enhanced Options
 * PUT /api/banners/update/:id
 */
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      button_text,
      button_enabled,
      link_type,
      link_value,
      display_order,
      status
    } = req.body;

    const image = req.file ? req.file.filename : null;

    // Check if banner exists
    const [existing] = await db.execute(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    // Build dynamic update query
    let updateFields = [];
    let params = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      params.push(title);
    }

    if (description !== undefined) {
      updateFields.push("description = ?");
      params.push(description || null);
    }

    if (image) {
      updateFields.push("image = ?");
      params.push(image);

      // Delete old image
      const oldImage = existing[0].image;
      if (oldImage) {
        const oldPath = path.join("uploads/banners", oldImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    if (button_text !== undefined) {
      updateFields.push("button_text = ?");
      params.push(button_text || null);
    }

    if (button_enabled !== undefined) {
      updateFields.push("button_enabled = ?");
      params.push(button_enabled === '1' || button_enabled === true ? 1 : 0);
    }

    if (link_type !== undefined) {
      const validLinkTypes = ['category', 'flyer', 'external', 'none'];
      if (!validLinkTypes.includes(link_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid link_type"
        });
      }
      updateFields.push("link_type = ?");
      params.push(link_type);
    }

    if (link_value !== undefined) {
      updateFields.push("link_value = ?");
      params.push(link_value || null);
    }

    if (display_order !== undefined) {
      updateFields.push("display_order = ?");
      params.push(parseInt(display_order) || 0);
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      params.push(status === '1' || status === true ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    params.push(id);
    const query = `UPDATE banners SET ${updateFields.join(", ")} WHERE id = ?`;

    await db.execute(query, params);

    // Fetch updated banner
    const [updated] = await db.execute(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Banner updated successfully",
      data: updated[0]
    });

  } catch (err) {
    console.error("Update banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update banner",
      error: err.message
    });
  }
};

/**
 * Get All Banners (Enhanced)
 * GET /api/banners
 */
export const getBanners = async (req, res) => {
  try {
    const { status, active_only } = req.query;

    let query = "SELECT * FROM banners";
    let params = [];

    if (active_only === 'true' || status === '1') {
      query += " WHERE status = 1";
    } else if (status === '0') {
      query += " WHERE status = 0";
    }

    query += " ORDER BY display_order ASC, created_at DESC";

    const [rows] = await db.execute(query, params);

    // Format response with full image URLs
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3007';
    const formatted = rows.map(banner => ({
      ...banner,
      image_url: banner.image ? `${baseUrl}/uploads/banners/${banner.image}` : null,
      button_enabled: !!banner.button_enabled,
      status: !!banner.status
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });

  } catch (err) {
    console.error("Get banners error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: err.message
    });
  }
};

/**
 * Get Single Banner by ID
 * GET /api/banners/:id
 */
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT * FROM banners WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3007';
    const banner = {
      ...rows[0],
      image_url: rows[0].image ? `${baseUrl}/uploads/banners/${rows[0].image}` : null,
      button_enabled: !!rows[0].button_enabled,
      status: !!rows[0].status
    };

    res.json({
      success: true,
      data: banner
    });

  } catch (err) {
    console.error("Get banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banner",
      error: err.message
    });
  }
};

/**
 * Delete Banner
 * DELETE /api/banners/delete/:id
 */
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Get banner to delete image file
    const [existing] = await db.execute(
      "SELECT image FROM banners WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    // Delete from database
    await db.execute("DELETE FROM banners WHERE id = ?", [id]);

    // Delete image file
    const image = existing[0].image;
    if (image) {
      const imagePath = path.join("uploads/banners", image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: "Banner deleted successfully"
    });

  } catch (err) {
    console.error("Delete banner error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
      error: err.message
    });
  }
};

/**
 * Change Banner Status (Active/Inactive)
 * PATCH /api/banners/status/:id
 */
export const changeBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const statusValue = status === '1' || status === true || status === 1 ? 1 : 0;

    const [result] = await db.execute(
      "UPDATE banners SET status = ? WHERE id = ?",
      [statusValue, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    res.json({
      success: true,
      message: `Banner ${statusValue ? 'activated' : 'deactivated'} successfully`
    });

  } catch (err) {
    console.error("Change status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to change banner status",
      error: err.message
    });
  }
};

/**
 * Reorder Banners
 * PUT /api/banners/reorder
 */
export const reorderBanners = async (req, res) => {
  try {
    const { banners } = req.body; // Array of { id, display_order }

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Banners array is required"
      });
    }

    // Update each banner's display order
    for (const banner of banners) {
      await db.execute(
        "UPDATE banners SET display_order = ? WHERE id = ?",
        [banner.display_order, banner.id]
      );
    }

    res.json({
      success: true,
      message: "Banners reordered successfully"
    });

  } catch (err) {
    console.error("Reorder banners error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reorder banners",
      error: err.message
    });
  }
};

/**
 * Get Available Categories for Linking
 * GET /api/banners/categories
 */
export const getAvailableCategories = async (req, res) => {
  try {
    // Get unique categories from flyers table
    const [rows] = await db.execute(`
      SELECT DISTINCT JSON_EXTRACT(categories, '$[*]') as category_list
      FROM flyers
      WHERE categories IS NOT NULL AND categories != '[]'
    `);

    // Extract and flatten categories
    const categoriesSet = new Set();

    rows.forEach(row => {
      if (row.category_list) {
        try {
          const cats = JSON.parse(row.category_list);
          cats.forEach(cat => categoriesSet.add(cat));
        } catch (e) {
          console.error("Error parsing categories:", e);
        }
      }
    });

    const categories = Array.from(categoriesSet).sort();

    res.json({
      success: true,
      data: categories
    });

  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: err.message
    });
  }
};
