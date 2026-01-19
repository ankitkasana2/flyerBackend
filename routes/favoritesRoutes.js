import express from "express";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites
} from "../controllers/favoritesController.js";

const router = express.Router();

// POST /api/favorites/add
router.post("/add", addFavorite);

// POST /api/favorites/remove
router.post("/remove", removeFavorite);

// GET /api/favorites/user/:user_id
router.get("/user/:user_id", getUserFavorites);

export default router;