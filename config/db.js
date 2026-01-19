// import mysql from "mysql2";
// import dotenv from "dotenv";

// dotenv.config();

// export const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// db.connect((err) => {
//   if (err) {
//     console.error("❌ Database connection failed:", err.message);
//   } else {
//     console.log("✅ Connected to MySQL Database");
//   }
// });


import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Create MySQL connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,   // Number of max connections
  queueLimit: 0,         // Unlimited queueing
});

// Test the DB connection once
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL Pool Connected Successfully");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
  }
})();
