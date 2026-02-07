import { db } from "../config/db.js";

// CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const { name, rank = 0 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    await db.query(
      "INSERT INTO categories (name, `rank`) VALUES (?, ?)",
      [name, rank]
    );

    res.status(201).json({
      success: true,
      message: "Category created"
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE CATEGORY RANK
export const updateCategoryRank = async (req, res) => {
  try {
    const { id } = req.params;
    const { rank } = req.body;

    if (rank === undefined) {
      return res.status(400).json({
        success: false,
        message: "Rank is required"
      });
    }

    const [result] = await db.query(
      "UPDATE categories SET `rank` = ?, updated_at = NOW() WHERE id = ?",
      [rank, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.json({
      success: true,
      message: "Category rank updated"
    });
  } catch (error) {
    console.error("Update rank error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL CATEGORIES
export const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, `rank` FROM categories ORDER BY `rank` ASC, name ASC"
    );

    res.json({
      success: true,
      count: rows.length,
      categories: rows
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM categories WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.json({
      success: true,
      message: "Category deleted"
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
