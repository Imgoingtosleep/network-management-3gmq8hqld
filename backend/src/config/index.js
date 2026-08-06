const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

/**
 * รวมค่า config ทั้งหมดไว้ที่เดียว เพื่อไม่ต้องเรียก process.env กระจายทั่วโปรเจกต์
 * เวลาต่อยอด (เพิ่ม service ใหม่ / ทีมใหม่) ให้เพิ่มค่าที่นี่ + .env.example คู่กัน
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'network_portal',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  teams: {
    nds: {
      externalApiUrl: process.env.NDS_EXTERNAL_API_URL || '',
    },
    cds: {
      externalApiUrl: process.env.CDS_EXTERNAL_API_URL || '',
    },
  },
};

module.exports = config;
