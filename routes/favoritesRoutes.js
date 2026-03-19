import express from "express";
import { getTopFlyers } from "../controllers/favoritesController.js";
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


router.get("/top-flyers", getTopFlyers);

export default router;