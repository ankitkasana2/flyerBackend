import express from "express";
import {
  loginWebUser,
  registerWebUser,
  updateWebUserProfile,
  changeWebUserPassword,
  getAllWebUsers,
} from "../../controllers/web/authWebController.js";
import { checkEmail } from "../../controllers/authController.js";
// Optional middlewares
import rateLimit from "express-rate-limit";
// import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Rate limiter to protect web auth routes
const webAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { message: "Too many requests, please try again later." },
});

/**
 * 📌 Web Auth Routes (Customer)
 * POST /api/web/auth/register  → Register a new web user
 * POST /api/web/auth/login     → Login web user
 */

router.post("/check-email", checkEmail);
// Register Web User
router.post("/register", webAuthLimiter, registerWebUser);

// Login Web User
router.post("/login", webAuthLimiter, loginWebUser);

// Update logged-in user profile
router.patch("/profile", webAuthLimiter, updateWebUserProfile);

// Change logged-in user password
router.patch("/change-password", webAuthLimiter, changeWebUserPassword);
// Get all registered users (Admin)
router.get("/users", getAllWebUsers);
// Future routes
// router.post("/logout", verifyToken, logoutWebUser);
// router.post("/refresh-token", refreshToken);

export default router;
