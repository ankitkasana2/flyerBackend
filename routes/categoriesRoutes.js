import express from "express";
import {
  createCategory,
  updateCategoryRank,
  getCategories,
  deleteCategory
} from "../controllers/categoriesController.js";

const router = express.Router();

// GET ALL (SORTED BY RANK) — FOR FRONTEND
router.get("/", getCategories);

// CREATE NEW
router.post("/", createCategory);

// UPDATE RANK (ADMIN PANEL)
router.patch("/:id/rank", updateCategoryRank);

// DELETE
router.delete("/:id", deleteCategory);

export default router;