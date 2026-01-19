// import { db } from "../config/db.js";

// export const addToCart = async (req, res) => {
//   const {
//     user_id,
//     flyer_id,
//     presenting,
//     event_title,
//     image_url,
//     event_date,
//     address_phone,
//     delivery_time
//   } = req.body;

//   // Validate required fields
//   if (!user_id || !flyer_id) {
//     return res.status(400).json({
//       success: false,
//       message: "user_id and flyer_id are required",
//     });
//   }

//   try {
//     // Check if already in cart
//     const [existing] = await db.execute(
//       `SELECT id FROM cart 
//        WHERE user_id = ? AND flyer_id = ? AND status = 'active'`,
//       [user_id, flyer_id]
//     );

//     if (existing.length > 0) {
//       return res.status(200).json({
//         success: true,
//         message: "Item is already in your cart",
//       });
//     }

//     // Insert new row with new columns
//     await db.execute(
//       `INSERT INTO cart 
//         (user_id, flyer_id, presenting, event_title, image_url, date, address_and_phone, delivery_time, added_time, status)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')`,
//       [
//         user_id,
//         flyer_id,
//         presenting || "",
//         event_title || "",
//         image_url || "",
//         event_date || null,         // event_date → date column
//         address_phone || "",
//         delivery_time || ""
//       ]
//     );

//     res.status(201).json({
//       success: true,
//       message: "Item added to cart successfully!",
//     });

//   } catch (error) {
//     console.error("❌ addToCart error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };




// export const getCart = async (req, res) => {
//   const { user_id } = req.params;

//   try {
//     const [rows] = await db.execute(
//       `SELECT * FROM cart 
//        WHERE BINARY user_id = ? 
//        AND status = 'active'`,
//       [user_id]
//     );

//     res.status(200).json({
//       success: true,
//       data: rows,
//     });

//   } catch (error) {
//     console.error("❌ getCart error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };


// // ==================================================
// // REMOVE ITEM FROM CART
// // ==================================================
// export const removeCartItem = async (req, res) => {
//   const { id } = req.params;

//   try {
//     await db.execute(
//       `UPDATE cart SET status = 'removed' WHERE id = ?`,
//       [id]
//     );

//     res.status(200).json({
//       success: true,
//       message: "Cart item removed",
//     });

//   } catch (error) {
//     console.error("❌ removeCartItem error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// // ==================================================
// // CLEAR CART
// // ==================================================
// export const clearCart = async (req, res) => {
//   const { user_id } = req.params;

//   try {
//     await db.execute(
//       `UPDATE cart SET status = 'ordered' 
//        WHERE user_id = ? AND status = 'active'`,
//       [user_id]
//     );

//     res.status(200).json({
//       success: true,
//       message: "Cart cleared successfully!",
//     });

//   } catch (error) {
//     console.error("❌ clearCart error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };





import { db } from "../config/db.js";
import path from "path";
import fs from "fs";
import { DIRS_EXPORT } from "../middleware/upload.js";

// Helper: Safe JSON parse
const safeParse = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

// Helper: Convert to boolean (1/0)
const toBool = (val) => (val === "true" || val === true || val === "1" || val === 1) ? 1 : 0;

// Helper: Normalize delivery time
const normalizeDeliveryTime = (value) => {
  if (!value) return null;
  const v = String(value).toLowerCase().trim();
  if (v.includes("1") && v.includes("hour")) return "1 Hours";
  if (v.includes("5") && v.includes("hour")) return "5 Hours";
  if (v.includes("24") || v.includes("day")) return "24 Hours";
  if (["1 Hours", "5 Hours", "24 Hours"].includes(value)) return value;
  return null;
};

// Helper: Safe file rename
const renameTo = (fileObj, folder, prefix, orderId) => {
  if (!fileObj) return null;
  const ext = path.extname(fileObj.originalname);
  const newName = `${prefix}_${orderId}${ext}`;
  const newPath = path.join(folder, newName);
  try {
    fs.renameSync(fileObj.path, newPath);
    return `/uploads/${path.basename(folder)}/${newName}`;
  } catch (err) {
    console.error("Rename failed:", err.message);
    return null;
  }
};

// ADD TO CART — NOW SUPERCHARGED LIKE ORDERS
export const addToCart = async (req, res) => {
  try {
    // Build files map from upload.any()
    const files = {};
    if (req.files) {
      req.files.forEach(f => {
        if (!files[f.fieldname]) files[f.fieldname] = [];
        files[f.fieldname].push(f);
      });
    }

    const b = req.body;

    // Required
    if (!b.user_id || !b.flyer_is) {
      return res.status(400).json({ success: false, message: "user_id and flyer_is are required" });
    }

    // Check if already in cart
    const [existing] = await db.query(
      `SELECT id FROM cart WHERE user_id = ? AND flyer_is = ? AND status = 'active'`,
      [b.user_id, b.flyer_is]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "This flyer is already in your cart",
        cartItemId: existing[0].id
      });
    }

    // Insert base cart item
    const [result] = await db.query(
      `INSERT INTO cart 
       (user_id, flyer_is, presenting, event_title, event_date, address_and_phone, flyer_info,
        delivery_time, custom_notes, email,
        story_size_version, custom_flyer, animated_flyer, instagram_post_size,
        total_price, added_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')`,
      [
        b.user_id,
        b.flyer_is,
        b.presenting || "",
        b.event_title || "",
        b.event_date || null,
        b.address_phone || "",
        b.flyer_info || "",
        normalizeDeliveryTime(b.delivery_time),
        b.custom_notes || "",
        b.email || null,
        toBool(b.story_size_version),
        toBool(b.custom_flyer),
        toBool(b.animated_flyer),
        toBool(b.instagram_post_size),
        b.total_price || null,
      ]
    );

    const cartItemId = result.insertId;

    // Parse JSON fields
    const djsRaw = safeParse(b.djs) || [];
    const hostRaw = safeParse(b.host);
    const sponsorsRaw = safeParse(b.sponsors) || [];

    let venueLogoPath = null;
    const djs = [];
    const host = { name: hostRaw?.name || "", image: null };
    const sponsors = [];

    // Handle files
    if (files.venue_logo?.[0]) {
      venueLogoPath = renameTo(files.venue_logo[0], DIRS_EXPORT.venue_logo, "cart_venue", cartItemId);
    }

    djsRaw.forEach((dj, i) => {
      const file = files[`dj_${i}`]?.[0];
      const image = file ? renameTo(file, DIRS_EXPORT.djs, `cart_dj_${i + 1}`, cartItemId) : null;
      djs.push({ name: dj.name || "", image });
    });

    if (files.host_file?.[0]) {
      host.image = renameTo(files.host_file[0], DIRS_EXPORT.host, "cart_host", cartItemId);
    }

    sponsorsRaw.forEach((sp, i) => {
      const file = files[`sponsor_${i}`]?.[0];
      const image = file ? renameTo(file, DIRS_EXPORT.sponsors, `cart_sponsor_${i + 1}`, cartItemId) : null;
      sponsors.push({ name: sp.name || null, image });
    });

    // Update cart item with media
    await db.query(
      `UPDATE cart SET 
         venue_logo = ?, djs = ?, host = ?, sponsors = ?
       WHERE id = ?`,
      [
        venueLogoPath,
        JSON.stringify(djs),
        JSON.stringify(host),
        JSON.stringify(sponsors),
        cartItemId
      ]
    );

    res.status(201).json({
      success: true,
      message: "Flyer added to cart with all customizations!",
      cartItemId
    });

  } catch (error) {
    console.error("addToCart ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add to cart",
      error: error.message
    });
  }
};




// // Keep your other functions unchanged
// export const getCart = async (req, res) => {
//   const { user_id } = req.params;
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM cart WHERE user_id = ? AND status = 'active' ORDER BY added_time DESC`,
//       [user_id]
//     );

//     // Parse JSON fields
//     const formatted = rows.map(item => ({
//       ...item,
//       djs: item.djs ? JSON.parse(item.djs) : [],
//       host: item.host ? JSON.parse(item.host) : {},
//       sponsors: item.sponsors ? JSON.parse(item.sponsors) : [],
//     }));

//     res.status(200).json({ success: true, data: formatted });
//   } catch (error) {
//     console.error("getCart error:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };



// GET CART FOR USER — WITH FLYER TEMPLATE JOIN + FULL DETAILS
export const getCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required"
      });
    }

    const [rows] = await db.query(
      `SELECT 
        c.*,
        f.title AS flyer_title,
        f.price AS flyer_price,
        f.image_url AS flyer_image,
        f.form_type AS flyer_type,
        JSON_EXTRACT(f.categories, '$') AS flyer_categories_raw
       FROM cart c
       LEFT JOIN flyers f ON c.flyer_is = f.id
       WHERE c.user_id = ? AND c.status = 'active'
       ORDER BY c.added_time DESC`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        cart: []
      });
    }

    // Parse JSON fields safely
    const safeParse = (field) => {
      try { return field ? JSON.parse(field) : (Array.isArray([]) ? [] : {}); }
      catch { return Array.isArray([]) ? [] : {}; }
    };

    const formattedCart = rows.map(item => ({
      id: item.id,
      user_id: item.user_id,
      flyer_is: item.flyer_is,
      presenting: item.presenting,
      event_title: item.event_title,
      event_date: item.event_date,
      address_phone: item.address_phone,
      flyer_info: item.flyer_info,
      custom_notes: item.custom_notes,
      delivery_time: item.delivery_time,
      total_price: item.total_price ? parseFloat(item.total_price) : null,

      // Customizations
      story_size_version: !!item.story_size_version,
      custom_flyer: !!item.custom_flyer,
      animated_flyer: !!item.animated_flyer,
      instagram_post_size: !!item.instagram_post_size,

      // Media
      venue_logo: item.venue_logo,
      djs: safeParse(item.djs),
      host: safeParse(item.host),
      sponsors: safeParse(item.sponsors),

      // FLYER TEMPLATE DETAILS
      flyer: {
        id: item.flyer_is,
        title: item.flyer_title || "Unknown Flyer",
        price: parseFloat(item.flyer_price) || 0,
        image: item.flyer_image,
        type: item.flyer_type || "standard",
        categories: item.flyer_categories_raw ? safeParse(item.flyer_categories_raw) : []
      },

      added_time: item.added_time
    }));

    res.status(200).json({
      success: true,
      count: formattedCart.length,
      cart: formattedCart
    });

  } catch (error) {
    console.error("getCart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message
    });
  }
};






export const removeCartItem = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE cart SET status = 'removed' WHERE id = ?`, [id]);
    res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.error("removeCartItem error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const clearCart = async (req, res) => {
  const { user_id } = req.params;
  try {
    await db.query(`UPDATE cart SET status = 'ordered' WHERE user_id = ? AND status = 'active'`, [user_id]);
    res.status(200).json({ success: true, message: "Cart cleared!" });
  } catch (error) {
    console.error("clearCart error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




// export const getCart = async (req, res) => {
//   const { user_id } = req.params;
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM cart 
//        WHERE user_id = ? AND status = 'active' 
//        ORDER BY added_time DESC`,
//       [user_id]
//     );

//     // Parse JSON fields automatically
//     const formatted = rows.map(item => ({
//       ...item,
//       djs: item.djs ? JSON.parse(item.djs) : [],
//       host: item.host ? JSON.parse(item.host) : {},
//       sponsors: item.sponsors ? JSON.parse(item.sponsors) : [],
//     }));

//     res.status(200).json({
//       success: true,
//       count: formatted.length,
//       data: formatted
//     });
//   } catch (error) {
//     console.error("getCart error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch cart",
//       error: error.message
//     });
//   }
// };