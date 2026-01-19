// import express from "express";
// import {
//   addToCart,
//   getCart,
//   removeCartItem,
//   clearCart,
// } from "../controllers/cartController.js";
// import { upload } from "../middleware/upload.js";

// const router = express.Router();

// // Add item to cart
// // router.post("/add", addToCart);
// router.post("/add", upload.any(), addToCart);  // ← MUST BE upload.any()

// // Get user cart
// router.get("/:user_id", getCart);

// // Remove single item
// router.delete("/remove/:id", removeCartItem);

// // Clear full cart
// router.put("/clear/:user_id", clearCart);

// export default router;


// backend/routes/cartRoutes.js  (or wherever your cart routes are)



import express from "express";
import { addToCart, getCart, removeCartItem, clearCart } from "../controllers/cartController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// ADD TO CART (with files)
router.post("/add", upload.any(), addToCart);

// GET CART BY USER_ID ← THIS IS WHAT YOU NEED
router.get("/:user_id", getCart);          // ← http://.../api/cart/99
// OR if you prefer:
// router.get("/get/:user_id", getCart);

router.delete("/remove/:id", removeCartItem);
router.delete("/clear/:user_id", clearCart);

export default router;







// import express from "express";
// import { addToCart, getCart, removeCartItem, clearCart } from "../controllers/cartController.js";
// import { upload } from "../middleware/upload.js";   // ← VERY IMPORTANT

// const router = express.Router();

// // THIS LINE MUST EXIST AND BE EXACTLY LIKE THIS
// router.post("/add", upload.any(), addToCart);

// router.get("/:user_id", getCart);
// router.delete("/:id", removeCartItem);
// router.delete("/clear/:user_id", clearCart);

// export default router;
