import { db } from "../config/db.js";
import { S3Client } from "@aws-sdk/client-s3";
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

// FIXED MULTER-S3 CONFIG (works with v2)
export const uploadOrderFile = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
  const order_id = req.params.order_id;  // ← FROM URL
  if (!order_id) return cb(new Error("order_id missing"));

  // Get user_id from DB? No — we can't query DB here (async not allowed)
  // So use a temporary name — we'll rename later if needed
  const ext = path.extname(file.originalname);
  const tempName = `temp_order_${order_id}_${Date.now()}${ext}`;
  cb(null, `order-files/${tempName}`);
},
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  ffileFilter: (req, file, cb) => {
  const allowedMimes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // ZIP variants
    "application/zip",
    "application/x-zip",
    "application/x-zip-compressed",
    "application/octet-stream",  // ← MOST COMMON FOR ZIP ON UPLOAD
    // PDF
    "application/pdf"
  ];

  // Also allow by file extension for extra safety
  const allowedExts = [".zip", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, ZIP, or PDF files allowed!"), false);
  }
},
});

export const uploadFileToOrder = async (req, res) => {
  try {
    const { order_id } = req.params;  // ← FROM URL NOW
    const file = req.file;

    if (!order_id || !file) {
      return res.status(400).json({
        success: false,
        message: "order_id (in URL) and file are required"
      });
    }

    // GET web_user_id FROM flyer_orders
    const [orderRows] = await db.query(
      "SELECT web_user_id FROM flyer_orders WHERE id = ?",
      [order_id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const user_id = orderRows[0].web_user_id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Order has no user"
      });
    }

    const fileType = file.mimetype === "application/zip" ? "zip" :
                     file.mimetype.startsWith("image/") ? "image" :
                     file.mimetype === "application/pdf" ? "pdf" : "other";

    await db.query(
      `INSERT INTO order_files (order_id, user_id, file_url, file_type, original_name)
       VALUES (?, ?, ?, ?, ?)`,
      [order_id, user_id, file.location, fileType, file.originalname]
    );

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file_url: file.location,
      file_type: fileType,
      order_id: parseInt(order_id),
      user_id: user_id
    });

  } catch (error) {
    console.error("Upload file error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET FILES BY ORDER ID
export const getFilesByOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM order_files WHERE order_id = ? ORDER BY created_at DESC",
      [order_id]
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      files: rows
    });

  } catch (error) {
    console.error("Get files by order error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET FILES BY USER ID
export const getFilesByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM order_files WHERE user_id = ? ORDER BY created_at DESC",
      [user_id]
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      files: rows
    });

  } catch (error) {
    console.error("Get files by user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// OPTIONAL: DELETE FILE
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query("SELECT file_url FROM order_files WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Delete from S3
    const key = existing[0].file_url.split(".com/")[1];
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }).promise();

    // Delete from DB
    await db.query("DELETE FROM order_files WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "File deleted"
    });

  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};