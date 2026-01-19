import express from "express";
import {
  uploadOrderFile,          // ← middleware
  uploadFileToOrder,        // ← CONTROLLER FUNCTION (THIS WAS MISSING!)
  getFilesByOrder,
  getFilesByUser,
  deleteFile
} from "../controllers/orderFilesController.js";

const router = express.Router();

// UPLOAD FILE TO ORDER
// router.post("/", uploadOrderFile.single("file"), uploadFileToOrder);
// CHANGE TO THIS — order_id in URL
router.post("/:order_id", uploadOrderFile.single("file"), uploadFileToOrder);

// GET FILES BY ORDER ID
router.get("/order/:order_id", getFilesByOrder);

// GET FILES BY USER ID
router.get("/user/:user_id", getFilesByUser);

// DELETE FILE
router.delete("/:id", deleteFile);

export default router;