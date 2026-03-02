import express from "express";

import { registerUser, loginUser, checkEmail } from "../controllers/authController.js";


const router = express.Router();
router.post("/users/check-email", checkEmail);
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
