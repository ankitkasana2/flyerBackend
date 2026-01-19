import express from "express";
import {
  getFlyers,
  createFlyers,
  updateFlyer,
  deleteFlyer,
  getFlyerById
} from "../controllers/flyersController.js";

import { uploadS3 } from "../middleware/uploadS3.js";  // CLEAN & CLEAR NAME

const router = express.Router();

router.get("/", getFlyers);
router.get("/:id", getFlyerById);

// BULK UPLOAD TO S3
router.post("/", uploadS3.array("images", 50), createFlyers);

// UPDATE SINGLE FLYER (optional: also use S3)
router.put("/:id", uploadS3.single("image"), updateFlyer);

router.delete("/:id", deleteFlyer);

export default router;