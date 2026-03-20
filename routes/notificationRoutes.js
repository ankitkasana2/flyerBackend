import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllRead
} from "../controllers/notificationController.js";

const router = express.Router();

// ✅ FIXED - specific route first
router.get("/", getNotifications);
router.patch("/read-all", markAllRead);            // ← move this UP
router.patch("/:id/read", markNotificationRead); 

export default router;
