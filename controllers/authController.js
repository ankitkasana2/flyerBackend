

import { db } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// 🟢 Register new user (ASYNC / AWAIT)
export const registerUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // check if user already exists
    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert user
    await db.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hashedPassword, role]
    );

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 🔐 Login user (ASYNC / AWAIT)
export const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role)
    return res.status(400).json({ message: "Email, password, and role are required" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];

    // Check role
    if (user.role !== role)
      return res.status(401).json({ message: "Role mismatch. Access denied." });

    // Compare password correctly using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

