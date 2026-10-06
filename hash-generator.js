const crypto = require('crypto');
const password = process.argv[2];

if (!password) {
  console.log('กรุณาระบุรหัสผ่านที่ต้องการเข้ารหัส ตัวอย่าง: node hash-generator.js mypassword123');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(`\nรหัสผ่าน (Plain): ${password}`);
console.log(`รหัสที่เข้ารหัสแล้ว (SHA-256): ${hash}`);
console.log(`\n--- นำรหัสยาวๆ นี้ไปใส่ในไฟล์ .env.server แทนรหัสเดิมได้เลยครับ ---`);
