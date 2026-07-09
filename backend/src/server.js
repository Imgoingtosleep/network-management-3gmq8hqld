const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');

async function start() {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`🚀 Network Portal API running on http://localhost:${config.port} [${config.env}]`);
    console.log(`   → NDS routes:  http://localhost:${config.port}/api/nds`);
    console.log(`   → CDS routes:  http://localhost:${config.port}/api/cds`);
  });
}

start();
