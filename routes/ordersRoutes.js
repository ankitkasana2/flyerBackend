import express from "express";
import { createOrder, getOrders, getOrderById, getOrdersByUser, updateOrderStatus } from "../controllers/ordersController.js";
import { upload } from "../middleware/upload.js";
// import { uploadS3 } from "../middleware/upload.js";
const router = express.Router();



const multerFields = [
  { name: "venue_logo", maxCount: 1 },
  { name: "host_file", maxCount: 1 },
  { name: "dj_0", maxCount: 1 },
  { name: "dj_1", maxCount: 1 },
  { name: "sponsor_0", maxCount: 1 },
  { name: "sponsor_1", maxCount: 1 },
  { name: "sponsor_2", maxCount: 1 },
];

// router.post("/", multipleUpload, createOrder);

// // GET all orders
router.get("/", getOrders);

// // GET single order by ID
router.get("/:id", getOrderById);


// Use upload.fields to accept these named files in request


router.post("/", upload.any(), createOrder);


// Example: /api/orders/user/123
router.get("/user/:web_user_id", getOrdersByUser);

// UPDATE ORDER STATUS
router.patch("/:id/status", updateOrderStatus);


export default router;
