const { Pool } = require("pg");

console.log("DATABASE_URL FOUND:", !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
.then(() => console.log("✅ PostgreSQL Connected"))
.catch(err => console.error("❌ DB ERROR:", err));

module.exports = pool;