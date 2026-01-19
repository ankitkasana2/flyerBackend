import express from "express";
import {
  uploadUserMedia,
  uploadMedia,
  getUserMedia,
  renameMedia,
  replaceMedia,
  setAsLogo,
  setAsImage,  // ← ADD THIS LINE!
  deleteMedia
} from "../controllers/userMediaController.js";

const router = express.Router();

router.post("/", uploadUserMedia.single("file"), uploadMedia);
router.get("/:web_user_id", getUserMedia);
router.patch("/:id/rename", renameMedia);
router.patch("/:id/replace", uploadUserMedia.single("file"), replaceMedia);
// SET AS LOGO (toggle)
router.patch("/:id/set-logo", setAsLogo);
// SET AS IMAGE (toggle)
router.patch("/:id/set-image", setAsImage);
router.delete("/:id", deleteMedia);


export default router;