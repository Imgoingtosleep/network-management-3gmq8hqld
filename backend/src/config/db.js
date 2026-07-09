const config = require('./index');

/**
 * Placeholder สำหรับการเชื่อมต่อฐานข้อมูลจริงในอนาคต
 * (เช่น pg, mysql2, mongoose ฯลฯ) — ตอนนี้ยังไม่ผูกกับ DB จริง
 * เพื่อให้โครงสร้างพร้อมต่อยอดได้ทันทีโดยไม่ต้องแก้ไฟล์อื่น
 *
 * ตัวอย่างเมื่อพร้อมใช้งานจริง (PostgreSQL ด้วย pg):
 *
 *   const { Pool } = require('pg');
 *   const pool = new Pool({
 *     host: config.db.host,
 *     port: config.db.port,
 *     database: config.db.name,
 *     user: config.db.user,
 *     password: config.db.password,
 *   });
 *   module.exports = pool;
 */

async function connectDB() {
  // TODO: ใส่ logic เชื่อมต่อฐานข้อมูลจริงตรงนี้
  console.log(`[db] (mock) ready to connect -> ${config.db.host}:${config.db.port}/${config.db.name}`);
}

module.exports = { connectDB };
