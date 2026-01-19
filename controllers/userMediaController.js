// backend/controllers/userMediaController.js

import { db } from "../config/db.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
// import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadUserMedia = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const web_user_id = req.body.web_user_id;
      if (!web_user_id) return cb(new Error("web_user_id required"));
      const ext = path.extname(file.originalname);
      const uniqueName = `user_${web_user_id}_media_${Date.now()}${ext}`;
      cb(null, `user-media/${uniqueName}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for PDFs
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // PDF
      "application/pdf"
    ];

    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPG, PNG, GIF, WEBP, SVG) and PDF files allowed!"), false);
    }
  },
});
// UPLOAD MEDIA FOR USER
export const uploadMedia = async (req, res) => {
  try {
    const { web_user_id } = req.body;
    const file = req.file;

    if (!web_user_id || !file) {
      return res.status(400).json({
        success: false,
        message: "web_user_id and file are required"
      });
    }

    // Detect file type
    const fileType = file.mimetype === "application/pdf" ? "pdf" : "image";

    await db.query(
      `INSERT INTO user_media (web_user_id, original_name, file_url, file_type, is_logo)
       VALUES (?, ?, ?, ?, 0)`,
      [
        web_user_id,
        file.originalname,
        file.location,
        fileType
      ]
    );

    res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      file_url: file.location,
      original_name: file.originalname,
      file_type: fileType
    });

  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL MEDIA FOR USER
export const getUserMedia = async (req, res) => {
  try {
    const { web_user_id } = req.params;

    const [rows] = await db.query(
      "SELECT id, original_name, file_url, file_type, is_logo, created_at FROM user_media WHERE web_user_id = ? ORDER BY created_at DESC",
      [web_user_id]
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      media: rows
    });

  } catch (error) {
    console.error("Get media error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// RENAME MEDIA
export const renameMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_name, web_user_id } = req.body;

    if (!new_name) {
      return res.status(400).json({
        success: false,
        message: "new_name is required"
      });
    }

    const [result] = await db.query(
      "UPDATE user_media SET original_name = ?, updated_at = NOW() WHERE id = ? AND web_user_id = ?",
      [new_name, id, web_user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found or not owned by user"
      });
    }

    res.json({
      success: true,
      message: "Media renamed successfully"
    });

  } catch (error) {
    console.error("Rename media error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// REPLACE MEDIA (UPLOAD NEW FILE)
// REPLACE MEDIA — v3 COMPATIBLE
export const replaceMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { web_user_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "New file is required"
      });
    }

    // Get old file URL
    const [existing] = await db.query(
      "SELECT file_url FROM user_media WHERE id = ? AND web_user_id = ?",
      [id, web_user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found or not owned by user"
      });
    }

    const oldUrl = existing[0].file_url;

    if (oldUrl) {
      // Delete old file from S3 (v3 syntax)
      const oldKey = oldUrl.split(".amazonaws.com/")[1];
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: oldKey
      }));
    }

    // Update DB with new file
    await db.query(
      "UPDATE user_media SET file_url = ?, original_name = ?, updated_at = NOW() WHERE id = ?",
      [file.location, file.originalname, id]
    );

    res.json({
      success: true,
      message: "Media replaced successfully",
      file_url: file.location,
      original_name: file.originalname
    });

  } catch (error) {
    console.error("Replace media error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// SET AS LOGO
// SET AS LOGO — ALLOW MULTIPLE LOGOS (NO RESET)
// SET AS LOGO — ALLOW MULTIPLE
export const setAsLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const { web_user_id, is_logo } = req.body;  // is_logo: true/false

    const value = is_logo ? 1 : 0;

    const [result] = await db.query(
      "UPDATE user_media SET is_logo = ?, updated_at = NOW() WHERE id = ? AND web_user_id = ?",
      [value, id, web_user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found or not owned by user"
      });
    }

    res.json({
      success: true,
      message: `Media ${is_logo ? 'set as' : 'removed from'} logo`
    });

  } catch (error) {
    console.error("Set logo error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// SET AS IMAGE — ALLOW MULTIPLE
export const setAsImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { web_user_id, is_image } = req.body;  // is_image: true/false

    const value = is_image ? 1 : 0;

    const [result] = await db.query(
      "UPDATE user_media SET is_image = ?, updated_at = NOW() WHERE id = ? AND web_user_id = ?",
      [value, id, web_user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found or not owned by user"
      });
    }

    res.json({
      success: true,
      message: `Media ${is_image ? 'set as' : 'removed from'} image`
    });

  } catch (error) {
    console.error("Set image error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE MEDIA (FROM S3 + DB)
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { web_user_id } = req.body;

    const [existing] = await db.query(
      "SELECT file_url FROM user_media WHERE id = ? AND web_user_id = ?",
      [id, web_user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found or not owned by user"
      });
    }

    const fileUrl = existing[0].file_url;

    if (fileUrl) {
      const key = fileUrl.split(".amazonaws.com/")[1];
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      }));
    }

    await db.query("DELETE FROM user_media WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Media deleted successfully"
    });

  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};