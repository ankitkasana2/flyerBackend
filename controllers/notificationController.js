import { db } from "../config/db.js";

// CREATE NOTIFICATION (CALL THIS FROM OTHER APIs)
export const createNotification = async (title, message, type = 'info') => {
  try {
    await db.query(
      "INSERT INTO admin_notifications (title, message, type) VALUES (?, ?, ?)",
      [title, message, type]
    );
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

// GET ALL NOTIFICATIONS (FOR ADMIN PANEL)
export const getNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50"
    );

    const unreadCount = rows.filter(n => n.is_read === 0).length;

    res.status(200).json({
      success: true,
      unread_count: unreadCount,
      notifications: rows
    });

  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// MARK AS READ
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "UPDATE admin_notifications SET is_read = 1 WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// MARK ALL AS READ
export const markAllRead = async (req, res) => {
  try {
    await db.query("UPDATE admin_notifications SET is_read = 1");

    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });

  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};