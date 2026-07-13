const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// ปิดการแคชของเบราว์เซอร์สำหรับ API ทั้งหมดเพื่อให้หน้าเว็บอัปเดตข้อมูลล่าสุดเสมอ
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ทุก endpoint ของ API อยู่ภายใต้ prefix /api
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'healthy' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Network Portal API (NDS / CDS) — ดูรายการ endpoint ได้ที่ /api/health' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
