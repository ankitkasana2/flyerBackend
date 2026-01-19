// backend/middleware/uploadS3.js
import multer from "multer";
import multerS3 from "multer-s3";
import AWS from "aws-sdk";
import path from "path";

// AWS S3 Client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// S3 Upload Middleware — Clean, Reusable, Beautiful
export const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      const fileName = `template_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`;
      const key = `${process.env.S3_FOLDER || "flyer-templates"}/${fileName}`;
      cb(null, key);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 50,                  // max 50 images per request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});