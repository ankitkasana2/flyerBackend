import express from "express";
import { createMessage, getMessages } from "../controllers/contactController.js";

const router = express.Router();

// SEND MESSAGE
router.post("/", createMessage);
router.get("/", getMessages);  // GET /api/contact


export default router;