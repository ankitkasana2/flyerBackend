
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { db } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import flyersRoutes from "./routes/flyersRoutes.js";
import webAuthRoutes from "./routes/web/authWebRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js"; // <-- import orders route
import cartRoutes from "./routes/cartRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import favoritesRoutes from "./routes/favoritesRoutes.js";
import categoriesRoutes from "./routes/categoriesRoutes.js";
import orderFilesRoutes from "./routes/orderFilesRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userMediaRoutes from "./routes/userMediaRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";


dotenv.config();

const app = express();
import path from "path";
import { fileURLToPath } from "url";


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "550mb", extended: true }));


// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// API Routes

// Admin / General Auth
app.use("/api/auth", authRoutes);

// Flyers (Admin)
app.use("/api/flyers", flyersRoutes);

// Web / Customer Auth
app.use("/api/web/auth", webAuthRoutes);  // <- changed path

// Orders API
app.use("/api/orders", ordersRoutes); // <-- mount orders route

// Cart Api
app.use("/api/cart", cartRoutes);

// banner api 
app.use("/api/banners", bannerRoutes); // <-- add this

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



app.use("/api/favorites", favoritesRoutes);


// Use the routes
app.use("/api/categories", categoriesRoutes);



// Use the routes
app.use("/api/order-files", orderFilesRoutes);

// nottificatoin routes
app.use("/api/notifications", notificationRoutes);

// upload user media routes
app.use("/api/user-media", userMediaRoutes);


// Use the routes
app.use("/api/contact", contactRoutes);



// Root endpoint
app.get("/", (req, res) => {
  res.send("Welcome to Node.js + Express + MySQL API 🚀");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

