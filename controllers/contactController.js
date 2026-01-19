import { db } from "../config/db.js";
import { createNotification } from "../controllers/notificationController.js";  // Import your existing notification function

// CREATE CONTACT MESSAGE + NOTIFY ADMIN
export const createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, subject, message"
      });
    }

    // Save to DB
    await db.query(
      "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
      [name, email, subject, message]
    );

    // Notify admin
    await createNotification(
      "New Contact Message",
      `From ${name} (${email}): ${subject}`,
      "info"
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully! We'll respond soon."
    });

  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message
    });
  }
};

// GET ALL MESSAGES (ADMIN ONLY)
export const getMessages = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100"
    );

    res.json({
      success: true,
      count: rows.length,
      messages: rows
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


