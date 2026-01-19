// import multer from "multer";
// import path from "path";
// import fs from "fs";

// // Create folders if not exist
// const createFolder = (folderPath) => {
//   if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
// };

// // Venue logo
// createFolder("./uploads/venue_logo");
// createFolder("./uploads/djs");
// createFolder("./uploads/host");
// createFolder("./uploads/sponsors");

// // Multer storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.fieldname.startsWith("venue_logo")) cb(null, "./uploads/venue_logo");
//     else if (file.fieldname.startsWith("dj")) cb(null, "./uploads/djs");
//     else if (file.fieldname.startsWith("host")) cb(null, "./uploads/host");
//     else if (file.fieldname.startsWith("sponsor")) cb(null, "./uploads/sponsors");
//     else cb(null, "./uploads/others");
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     // We will rename files later based on order ID
//     cb(null, `${Date.now()}_${file.originalname}`);
//   },
// });

// export const upload = multer({ storage });




// backend/middleware/upload.js
import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOAD_BASE = path.join(process.cwd(), "uploads");
const DIRS = {
  venue_logo: path.join(UPLOAD_BASE, "venue_logo"),
  djs: path.join(UPLOAD_BASE, "djs"),
  host: path.join(UPLOAD_BASE, "host"),
  sponsors: path.join(UPLOAD_BASE, "sponsors"),
};

Object.values(DIRS).forEach(ensureDir);

// Use diskStorage to keep original temporary filename; we will rename later to order_{id}_...
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // decide folder based on fieldname
    if (file.fieldname === "venue_logo") cb(null, DIRS.venue_logo);
    else if (file.fieldname.startsWith("dj_")) cb(null, DIRS.djs);
    else if (file.fieldname === "host_file") cb(null, DIRS.host);
    else if (file.fieldname.startsWith("sponsor_")) cb(null, DIRS.sponsors);
    else cb(null, UPLOAD_BASE); // fallback
  },
  filename: function (req, file, cb) {
    // keep original name + timestamp to avoid collisions for now
    const ext = path.extname(file.originalname) || "";
    const name = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({ storage });

// Helper to rename/move a file (synchronously safe for small loads)
export const renameFile = (oldPath, newPath) => {
  fs.renameSync(oldPath, newPath);
};

export const DIRS_EXPORT = DIRS;



// // backend/middleware/uploadS3.js
// import multer from "multer";
// import multerS3 from "multer-s3";
// import AWS from "aws-sdk";
// import path from "path";

// // AWS S3 Client
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// // S3 Folder Mapping (same as your local DIRS)
// const S3_FOLDERS = {
//   venue_logo: "venue_logo",
//   dj_: "djs",           // matches fieldnames like dj_1, dj_2
//   host_file: "host",
//   sponsor_: "sponsors",
// };

// // Helper: Get S3 folder from fieldname
// const getS3Folder = (fieldname) => {
//   if (fieldname === "venue_logo") return S3_FOLDERS.venue_logo;
//   if (fieldname.startsWith("dj_")) return S3_FOLDERS.dj_;
//   if (fieldname === "host_file") return S3_FOLDERS.host_file;
//   if (fieldname.startsWith("sponsor_")) return S3_FOLDERS.sponsor_;
//   return "others"; // fallback
// };

// // MAIN S3 UPLOAD MIDDLEWARE — EXACT SAME LOGIC AS YOUR LOCAL ONE
// export const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_S3_BUCKET,
//     // ACL removed (your bucket uses policy instead)
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req, file, cb) => {
//       const folder = getS3Folder(file.fieldname);
//       const ext = path.extname(file.originalname) || "";
//       const fileName = `${file.fieldname}-${Date.now()}${ext}`;
//       const key = `${folder}/${fileName}`;
//       cb(null, key);
//     },
//   }),
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB
//     files: 50,
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only images allowed!"), false);
//     }
//   },
// });
