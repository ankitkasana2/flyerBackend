import express from "express";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  changeBannerStatus,
  getBanners,
  upload
} from "../controllers/bannerController.js";

const router = express.Router();

// Routes
router.post("/create", upload.single("image"), createBanner);
router.put("/update/:id", upload.single("image"), updateBanner);
router.delete("/delete/:id", deleteBanner);
router.patch("/status/:id", changeBannerStatus);
router.get("/", getBanners);

export default router;
