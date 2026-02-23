// import { db } from "../../config/db.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config();

// const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// // 🟢 Register new user (ASYNC / AWAIT)
// export const registerWebUser = async (req, res) => {
//   return 'girish';
// };

// // 🔐 Login user (ASYNC / AWAIT)
// export const loginWebUser = async (req, res) => {
//   return 'girish';
// };

import { db } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "2h";

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env");
  process.exit(1);
}

// Centralized error handler
const serverError = (res, error, msg = "Server Error") => {
  console.error("Web Auth Error:", error);
  return res.status(500).json({ message: msg });
};

const getJwtUser = (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { ok: false, status: 401, message: "Authorization token missing" };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ok: true, decoded };
  } catch (error) {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }
};

// // 🟢 REGISTER Web User
// export const registerWebUser = async (req, res) => {
//   try {
//     const { fullname, email, password } = req.body;

//     if (!fullname || !email || !password)
//       return res.status(400).json({ message: "Fullname, email, and password are required" });

//     if (password.length < 6)
//       return res.status(400).json({ message: "Password must be at least 6 characters long" });

//     // Check if user already exists
//     const [existing] = await db.query(
//       "SELECT id FROM web_users WHERE email = ? LIMIT 1",
//       [email]
//     );
//     if (existing.length > 0)
//       return res.status(409).json({ message: "Email already registered" });

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert new web user
//     const [result] = await db.query(
//       "INSERT INTO web_users (fullname, email, password) VALUES (?, ?, ?)",
//       [fullname, email, hashedPassword]
//     );

//     return res.status(201).json({
//       message: "User registered successfully",
//       userId: result.insertId,
//     });
//   } catch (error) {
//     return serverError(res, error, "Failed to register user");
//   }
// };

// REGISTER OR LOGIN VIA GOOGLE / APPLE / COGNITO
// You send: { fullname, email, user_id } → we trust it
export const registerWebUser = async (req, res) => {
  try {
    const { fullname, email, user_id } = req.body;

    if (!email || !user_id) {
      return res.status(400).json({
        success: false,
        message: "email and user_id are required",
      });
    }

    // Optional: Validate prefix
    if (!/^google_|apple_|cognito_/.test(user_id)) {
      return res.status(400).json({
        success: false,
        message: "user_id must start with google_, apple_, or cognito_",
      });
    }

    const [existing] = await db.query(
      `SELECT id, fullname, email, user_id FROM web_users 
       WHERE email = ? OR user_id = ? 
       LIMIT 1`,
      [email, user_id]
    );

    let user;

    if (existing.length > 0) {
      user = existing[0];
      // Update name/email if changed
      await db.query(
        "UPDATE web_users SET fullname = ?, email = ? WHERE id = ?",
        [fullname || user.fullname, email, user.id]
      );
    } else {
      // INSERT NEW SOCIAL USER — password = NULL
      const [result] = await db.query(
        `INSERT INTO web_users (fullname, email, user_id, password) 
         VALUES (?, ?, ?, NULL)`,
        [fullname || "User", email, user_id]
      );

      user = {
        id: result.insertId,
        fullname: fullname || "User",
        email,
        user_id,
      };
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_id: user.user_id,
        fullname: user.fullname,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: existing.length > 0 ? "Login successful" : "Account created via social login",
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Social login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};





// LOGIN USING user_id (Google, Apple, Cognito)
export const loginWebUser = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    // Search by user_id (from Google/Apple/Cognito)
    const [rows] = await db.query(
      `SELECT id, fullname, email, user_id 
       FROM web_users 
       WHERE user_id = ? 
       LIMIT 1`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found with this user_id",
      });
    }

    const user = rows[0];

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_id: user.user_id,
        fullname: user.fullname,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES || "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful via social provider",
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Social login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// UPDATE PROFILE (fullname/email)
export const updateWebUserProfile = async (req, res) => {
  try {
    const auth = getJwtUser(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, message: auth.message });
    }

    const userId = auth.decoded?.id;
    const { fullname, email } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    if (!fullname || !email) {
      return res.status(400).json({
        success: false,
        message: "fullname and email are required",
      });
    }

    const [emailRows] = await db.query(
      "SELECT id FROM web_users WHERE email = ? AND id != ? LIMIT 1",
      [email, userId]
    );

    if (emailRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already used by another account",
      });
    }

    await db.query(
      "UPDATE web_users SET fullname = ?, email = ? WHERE id = ?",
      [fullname, email, userId]
    );

    const [rows] = await db.query(
      "SELECT id, user_id, fullname, email FROM web_users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_id: user.user_id,
        fullname: user.fullname,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      token,
      user,
    });
  } catch (error) {
    return serverError(res, error, "Failed to update profile");
  }
};

// CHANGE PASSWORD
export const changeWebUserPassword = async (req, res) => {
  try {
    const auth = getJwtUser(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, message: auth.message });
    }

    const userId = auth.decoded?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const [rows] = await db.query(
      "SELECT id, password FROM web_users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = rows[0];

    // For social users with NULL password, force them to set first password by sending currentPassword as account email.
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password is not set for this account. Use forgot password flow first.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE web_users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return serverError(res, error, "Failed to change password");
  }
};
