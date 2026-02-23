import { db } from "../config/db.js";
import path from "path";
import fs from "fs";
import { DIRS_EXPORT, renameFile } from "../middleware/upload.js";
import { createNotification } from "../controllers/notificationController.js";
// // ---------------------------
// // GET All Orders
// // ---------------------------
export const getOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM flyer_orders ORDER BY created_at DESC"
    );

    // Parse JSON fields for DJs, host, sponsors
    const formatted = rows.map((order) => ({
      ...order,
      djs: order.djs ? JSON.parse(order.djs) : [],
      host: order.host ? JSON.parse(order.host) : {},
      sponsors: order.sponsors ? JSON.parse(order.sponsors) : [],
    }));

    res.status(200).json({ orders: formatted });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------
// GET Single Order by ID
// ---------------------------

// GET SINGLE ORDER + JOIN FLYER TEMPLATE DETAILS
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        o.*,
        f.title AS flyer_title,
        f.price AS flyer_price,
        f.image_url AS flyer_image,
        f.form_type AS flyer_type,
        JSON_EXTRACT(f.categories, '$') AS flyer_categories_raw
      FROM flyer_orders o
      LEFT JOIN flyers f ON o.flyer_is = f.id
      WHERE o.id = ?
      LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = rows[0];

    // Parse JSON fields safely
    const safeParse = (field) => {
      try {
        return field ? JSON.parse(field) : Array.isArray([]) ? [] : {};
      } catch {
        return Array.isArray([]) ? [] : {};
      }
    };

    const formattedOrder = {
      ...order,
      djs: safeParse(order.djs),
      host: safeParse(order.host),
      sponsors: safeParse(order.sponsors),
      flyer: {
        id: order.flyer_is,
        title: order.flyer_title || "Unknown Flyer",
        price: order.flyer_price,
        image: order.flyer_image,
        type: order.flyer_type || "standard",
        categories: order.flyer_categories_raw
          ? safeParse(order.flyer_categories_raw)
          : [],
      },
    };

    // Clean up — remove raw fields
    delete formattedOrder.flyer_title;
    delete formattedOrder.flyer_price;
    delete formattedOrder.flyer_image;
    delete formattedOrder.flyer_type;
    delete formattedOrder.flyer_categories_raw;

    res.status(200).json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    console.error("Error fetching order with flyer:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET ALL ORDERS FOR A SPECIFIC USER (BY web_user_id)
export const getOrdersByUser = async (req, res) => {
  try {
    const { web_user_id } = req.params;

    if (!web_user_id) {
      return res.status(400).json({
        success: false,
        message: "web_user_id is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        id,
        presenting,
        event_title,
        event_date,
        address_phone,
        flyer_is,
        flyer_info,
        venue_logo,
        djs,
        host,
        sponsors,
        delivery_time,
        custom_notes,
        total_price,
        status,
        created_at
      FROM flyer_orders
      WHERE web_user_id = ?
      ORDER BY created_at DESC
      LIMIT 50`,
      [web_user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        orders: [],
      });
    }

    const formatted = rows.map((order) => ({
      ...order,
      djs: order.djs ? JSON.parse(order.djs) : [],
      host: order.host ? JSON.parse(order.host) : {},
      sponsors: order.sponsors ? JSON.parse(order.sponsors) : [],
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      orders: formatted,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Normalize delivery time values from frontend to DB enum
const normalizeDeliveryTime = (v) => {
  if (!v) return null;
  const lower = String(v).toLowerCase();
  if (lower.includes("1")) return "1 Hours";
  if (lower.includes("5")) return "5 Hours";
  if (lower.includes("24")) return "24 Hours";
  // fallback: return null (or choose a default)
  return null;
};

// ADD THIS FUNCTION at the top of your createOrder (or in controller file)

// export const createOrder = async (req, res) => {
//   // ADD THIS FUNCTION at the top of your createOrder (or in controller file)
// const normalizeDeliveryTime = (value) => {
//   if (!value) return null;
//   const v = String(value).trim().toLowerCase();

//   if (v.includes("1") && v.includes("hour")) return "1 Hours";
//   if (v.includes("5") && v.includes("hour")) return "5 Hours";
//   if (v.includes("24") || v.includes("day")) return "24 Hours";

//   // Fallback: try exact match first
//   if (["1 Hours", "5 Hours", "24 Hours"].includes(value)) return value;

//   return null; // MySQL will accept NULL for nullable ENUM
// };

//   try {
//     // Build files map
//     const files = {};
//     if (req.files) {
//       req.files.forEach(f => {
//         if (!files[f.fieldname]) files[f.fieldname] = [];
//         files[f.fieldname].push(f);
//       });
//     }

//     const b = req.body;
//     const toBool = (val) => (val === "true" || val === true || val == 1) ? 1 : 0;

//     // REQUIRED INSERT WITH ALL NON-NULL COLUMNS
//     const [result] = await db.query(
//       `INSERT INTO flyer_orders
//        (presenting, event_title, event_date, flyer_info, address_phone,
//         story_size_version, custom_flyer, animated_flyer, instagram_post_size,
//         delivery_time, custom_notes, email, web_user_id, flyer_is, total_price)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         b.presenting,
//         b.event_title,
//         b.event_date,
//         b.flyer_info || null,
//         b.address_phone,
//         toBool(b.story_size_version),
//         toBool(b.custom_flyer),
//         toBool(b.animated_flyer),
//         toBool(b.instagram_post_size),
//         normalizeDeliveryTime(b.delivery_time),
//         b.custom_notes || null,
//         b.email || null,
//         b.user_id || b.web_user_id || null,
//         b.flyer_is || null,
//         b.total_price || null,
//       ]
//     );

//     const orderId = result.insertId;

//     // === File renaming logic (same as before) ===
//     const renameTo = (fileObj, folder, prefix) => {
//       if (!fileObj) return null;
//       const ext = path.extname(fileObj.originalname);
//       const newName = `${prefix}_${orderId}${ext}`;
//       const newPath = path.join(folder, newName);
//       try {
//         fs.renameSync(fileObj.path, newPath);
//         return `/uploads/${path.basename(folder)}/${newName}`;
//       } catch (err) {
//         console.error("Rename failed:", err);
//         return null;
//       }
//     };

//     let venueLogoPath = null;
//     if (files.venue_logo?.[0]) {
//       venueLogoPath = renameTo(files.venue_logo[0], DIRS_EXPORT.venue_logo, "venue");
//     }

//     const djs = (JSON.parse(b.djs || "[]")).map((dj, i) => ({
//       name: dj.name || dj || "",
//       image: files[`dj_${i}`]?.[0] ? renameTo(files[`dj_${i}`][0], DIRS_EXPORT.djs, `dj_${i + 1}`) : null
//     }));

//     const hostRaw = JSON.parse(b.host || "{}");
//     const host = {
//       name: hostRaw.name || hostRaw || "",
//       image: files.host_file?.[0] ? renameTo(files.host_file[0], DIRS_EXPORT.host, "host") : null
//     };

//     const sponsors = (JSON.parse(b.sponsors || "[]")).map((sp, i) => ({
//       name: sp.name || sp || null,
//       image: files[`sponsor_${i}`]?.[0] ? renameTo(files[`sponsor_${i}`][0], DIRS_EXPORT.sponsors, `sponsor_${i + 1}`) : null
//     }));

//     // Update with media
//     await db.query(
//       `UPDATE flyer_orders SET venue_logo = ?, djs = ?, host = ?, sponsors = ? WHERE id = ?`,
//       [venueLogoPath, JSON.stringify(djs), JSON.stringify(host), JSON.stringify(sponsors), orderId]
//     );

//     // Return full order
//     const [rows] = await db.query("SELECT * FROM flyer_orders WHERE id = ?", [orderId]);
//     const order = rows[0];
//     order.djs = JSON.parse(order.djs || "[]");
//     order.host = JSON.parse(order.host || "{}");
//     order.sponsors = JSON.parse(order.sponsors || "[]");

//     res.status(201).json({ message: "Order created!", order });

//   } catch (error) {
//     console.error("FATAL ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

export const createOrder = async (req, res) => {
    console.log("🔥 CREATE ORDER HIT!")  // ← ANDAR
  console.log("Body keys:", Object.keys(req.body))  // ← ANDAR
  const normalizeDeliveryTime = (value) => {
    if (!value) return null;
    const v = String(value).trim().toLowerCase();
    if (v.includes("1") && v.includes("hour")) return "1 Hours";
    if (v.includes("5") && v.includes("hour")) return "5 Hours";
    if (v.includes("24") || v.includes("day")) return "24 Hours";
    if (["1 Hours", "5 Hours", "24 Hours"].includes(value)) return value;
    return null;
  };

  try {
    const b = req.body;

    // Build files map from req.files (multer.any())
    const files = {};
    if (req.files) {
      req.files.forEach((f) => {
        files[f.fieldname] = f; // single file per field
      });
    }

    const toBool = (val) => val === "true" || val === true || val === "1";

    // INSERT BASE ORDER — FLAT FIELDS (MATCH POSTMAN)
    const [result] = await db.query(
      `INSERT INTO flyer_orders 
   (presenting, event_title, event_date, flyer_info, address_phone,
    story_size_version, custom_flyer, animated_flyer, instagram_post_size,
    delivery_time, custom_notes, email, web_user_id, flyer_is, total_price)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.presenting || "",
        b.event_title || "",
        b.event_date || null,
        b.flyer_info || "",
        b.address_phone || "",
        toBool(b.story_size_version),
        toBool(b.custom_flyer),
        toBool(b.animated_flyer),
        toBool(b.instagram_post_size),
        normalizeDeliveryTime(b.delivery_time),
        b.custom_notes || null,
        b.email || null,
        b.web_user_id || null,
        b.flyer_is || null,
        b.total_price || null,
      ]
    );

    const orderId = result.insertId;

    // FILE RENAMING LOGIC — MATCH FRONTEND FIELDS
    const renameTo = (fileObj, folder, prefix) => {
      if (!fileObj || !fileObj.path) return null;

      const ext = path.extname(fileObj.originalname) || ".jpg";
      const newName = `${prefix}_${orderId}${ext}`;
      const newPath = path.join(folder, newName);

      try {
        // Make sure folder exists
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }

        // Use copy + delete instead of rename (works across drives)
        fs.copyFileSync(fileObj.path, newPath);
        fs.unlinkSync(fileObj.path); // delete temp file

        return `/uploads/${path.basename(folder)}/${newName}`;
      } catch (err) {
        console.error("File save failed:", err.message);
        return null;
      }
    };

    // FILE HANDLING — MATCH POSTMAN FIELD NAMES
   let venueLogoPath = null;
if (files.venue_logo) {
  venueLogoPath = renameTo(files.venue_logo, DIRS_EXPORT.venue_logo, "venue");
} else if (b.venue_logo_url) {
  venueLogoPath = b.venue_logo_url; // Library URL directly save
}

    // DJs
   // DJs - NAYA (file + library URL dono handle)
const djs = [];
const djsArray = JSON.parse(b.djs || "[]");
djsArray.forEach((dj, i) => {
  const file = files[`dj_${i}`];
  const urlFromLibrary = b[`dj_url_${i}`] || null;

  const image = file
    ? renameTo(file, DIRS_EXPORT.djs, `dj_${i + 1}`)
    : urlFromLibrary;
  djs.push({ name: dj.name || "", image });
});

    // Host
    const hostRaw = JSON.parse(b.host || "{}");
  // NAYA:
const host = {
  name: hostRaw.name || "",
  image: files.host_file
    ? renameTo(files.host_file, DIRS_EXPORT.host, "host")
    : b.host_url_0 || null,  // ← Library URL fallback
};

    // // Sponsors
    // const sponsors = [];
    // for (let i = 1; i <= 3; i++) {
    //   const file = files[`sponsors.sponsor${i}`] || files[`sponsors[sponsor${i}]`];
    //   const image = file ? renameTo(file, DIRS_EXPORT.sponsors, `sponsor_${i}`) : null;
    //   sponsors.push({ name: null, image });
    // }
   const sponsors = [];
for (let i = 0; i < 3; i++) {
  const file = files[`sponsor_${i}`];
  const urlFromLibrary = b[`sponsor_url_${i}`] || null;
  const image = file
    ? renameTo(file, DIRS_EXPORT.sponsors, `sponsor_${i + 1}`)
    : urlFromLibrary; // File nahi to library URL use karo
  sponsors.push({ name: null, image });
}

    // UPDATE ORDER WITH MEDIA
    await db.query(
      "UPDATE flyer_orders SET venue_logo = ?, djs = ?, host = ?, sponsors = ? WHERE id = ?",
      [
        venueLogoPath,
        JSON.stringify(djs),
        JSON.stringify(host),
        JSON.stringify(sponsors),
        orderId,
      ]
    );
    // Inside createOrder after success
    await createNotification(
      "New Order Received",
      `Order #${orderId} created by ${b.web_user_id || b.email || "Guest"}`,
      "success"
    );

    // RETURN FULL ORDER
    const [rows] = await db.query("SELECT * FROM flyer_orders WHERE id = ?", [
      orderId,
    ]);
    const order = rows[0];
    order.djs = JSON.parse(order.djs || "[]");
    order.host = JSON.parse(order.host || "{}");
    order.sponsors = JSON.parse(order.sponsors || "[]");

    res.status(201).json({ message: "Order created successfully!", order });
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// UPDATE ORDER STATUS (pending → processing → completed → cancelled)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required",
      });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "processing",
      "completed",
      "cancelled",
      "delivered",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be: pending, processing, completed, cancelled, delivered",
      });
    }

    // Check if order exists
    const [existing] = await db.query(
      "SELECT id, status FROM flyer_orders WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const oldStatus = existing[0].status;

    await createNotification(
      "Order Status Updated",
      `Order #${id} changed to "${status}"`,
      "warning"
    );

    // Update status
    await db.query(
      "UPDATE flyer_orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    res.status(200).json({
      success: true,
      message: `Order status updated from "${oldStatus}" → "${status}"`,
      order_id: parseInt(id),
      new_status: status,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
