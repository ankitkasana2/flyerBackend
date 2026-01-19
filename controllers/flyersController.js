

import { db } from "../config/db.js";

// import { db } from "../config/db.js";
import path from "path";
import fs from "fs";


import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// ---------------------------
// GET Flyers
// ---------------------------
export const getFlyers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM flyers ORDER BY created_at DESC");

    const formatted = rows.map((f) => ({
      ...f,
      categories: f.categories ? JSON.parse(f.categories) : [],
      recentlyAdded: !!f.recently_added,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching flyers:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};






// S3 Client (v3) — lighter & faster
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadBase64ToS3 = async (base64String) => {
  if (!base64String.startsWith("data:image/")) return null;

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1].includes("png") ? "png" : "jpg";
  const buffer = Buffer.from(matches[2], "base64");
  const key = `${process.env.S3_FOLDER}/template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${ext}`,
      ACL: "public-read",
    }));

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (err) {
    console.error("Base64 → S3 failed:", err);
    return null;
  }
};

// NO MORE fs, path, BASE_URL, FLYERS_UPLOAD_DIR — ALL GONE!

export const createFlyers = async (req, res) => {
  try {
    let flyers = [];

    if (req.body.flyers) {
      flyers = typeof req.body.flyers === "string" ? JSON.parse(req.body.flyers) : req.body.flyers;
    } else if (req.body.title) {
      flyers = [req.body];
    } else {
      return res.status(400).json({ message: "No flyer data" });
    }

    if (!Array.isArray(flyers) || flyers.length === 0) {
      return res.status(400).json({ message: "Invalid flyers" });
    }

    const uploadedFiles = req.files || [];  // ← NOW FROM S3 (multer-s3)
    const results = [];

    for (let i = 0; i < flyers.length; i++) {
      const flyer = flyers[i];
      const {
        title,
        price,
        formType = "standard",
        recentlyAdded = false,
        categories = [],
        image_url = "",
        fileNameOriginal
      } = flyer;

      if (!title || !price) {
        results.push({ index: i, status: "skipped", reason: "Missing title/price" });
        continue;
      }

      let finalImageUrl = null;

      // 1. REAL FILE UPLOAD → FROM S3 (multer-s3 gives .location)
      const uploadedFile = uploadedFiles[i];
      if (uploadedFile) {
        finalImageUrl = uploadedFile.location;  // THIS IS THE FULL S3 PUBLIC URL
        console.log("S3 UPLOAD SUCCESS:", finalImageUrl);
      }
      // 2. BASE64 FROM FRONTEND → Convert & Upload to S3 (optional, see below)
      else if (image_url && image_url.startsWith("data:image/")) {
        // We'll add S3 base64 upload in 30 seconds (keep reading)
        finalImageUrl = await uploadBase64ToS3(image_url); // ← Future function
      }
      // 3. NORMAL HTTP URL
      else if (image_url && image_url.startsWith("http")) {
        finalImageUrl = image_url;
      }

      // SAVE TO DATABASE
      await db.query(
        `INSERT INTO flyers (title, price, form_type, recently_added, categories, image_url, file_name_original)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          price,
          formType,
          recentlyAdded ? 1 : 0,
          JSON.stringify(categories),
          finalImageUrl,
          fileNameOriginal || null
        ]
      );

      results.push({
        index: i,
        status: "saved",
        title,
        image_url: finalImageUrl,
        source: uploadedFile ? "S3 File Upload" : image_url.startsWith("data:") ? "Base64 → S3" : "External URL"
      });
    }

    res.status(201).json({
      success: true,
      message: "All flyers uploaded to AWS S3!",
      s3_bucket: process.env.AWS_S3_BUCKET,
      s3_folder: process.env.S3_FOLDER,
      results
    });

  } catch (err) {
    console.error("createFlyers error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};











export const updateFlyer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      price,
      form_type,        // ← CHANGE TO form_type (snake_case)
      categories,       // ← ARRAY FROM FRONTEND
      recently_added    // ← recently_added (snake_case)
    } = req.body;

    if (!title && !price && !form_type && !categories && recently_added === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "No fields to update" 
      });
    }

    // Build dynamic UPDATE query
    let updates = [];
    let values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    // if (price !== undefined) {
    //   updates.push("price = ?");
    //   values.push(price);
    // }
    if (price !== undefined) {
  let formattedPrice = String(price).trim();

  // Add $ only if not already present
  if (!formattedPrice.startsWith("$")) {
    formattedPrice = "$" + formattedPrice;
  }

  updates.push("price = ?");
  values.push(formattedPrice);
}
    if (form_type !== undefined) {
      updates.push("form_type = ?");
      values.push(form_type);
    }
    if (categories !== undefined) {
      updates.push("categories = ?");
      values.push(JSON.stringify(categories));  // ← SAVE FULL ARRAY
    }
    if (recently_added !== undefined) {
      updates.push("recently_added = ?");
      values.push(recently_added ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No valid fields to update" 
      });
    }

    values.push(id);
    const query = `UPDATE flyers SET ${updates.join(", ")} WHERE id = ?`;

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Flyer not found" 
      });
    }

    res.json({ 
      success: true,
      message: "Flyer updated successfully" 
    });

  } catch (err) {
    console.error("Update flyer error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server Error", 
      error: err.message 
    });
  }
};


export const deleteFlyer = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM flyers WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Flyer not found" });
    }

    res.json({ message: "Flyer deleted successfully" });
  } catch (err) {
    console.error("Error deleting flyer:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------------------
// GET Flyer by ID
// ---------------------------
export const getFlyerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query("SELECT * FROM flyers WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Flyer not found" });
    }

    const flyer = rows[0];

    const formatted = {
      ...flyer,
      categories: flyer.categories ? JSON.parse(flyer.categories) : [],
      recentlyAdded: !!flyer.recently_added,
    };

    res.json(formatted);

  } catch (err) {
    console.error("Error fetching flyer by ID:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};





