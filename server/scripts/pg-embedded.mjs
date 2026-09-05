/**
 * PostgreSQL ตัวจริงแบบฝังในโปรเจกต์ — ใช้ทดสอบโหมด PostgreSQL ในเครื่องตัวเอง
 * โดยไม่ต้องติดตั้ง PostgreSQL หรือ Docker
 *
 *   npm run pg:start     # เปิดค้างไว้ที่ localhost:55432
 *
 * แล้วเปิดอีก terminal:
 *   npm run pg:deploy    # apply migration
 *   npm run pg:seed      # ใส่ข้อมูลตัวอย่าง
 *   npm run pg:test      # รันชุดทดสอบทั้งหมดกับ PostgreSQL
 *   npm run pg:dev       # รัน API โดยใช้ PostgreSQL
 *
 * ⚠️ สำหรับ dev/ทดสอบเท่านั้น — production ให้ชี้ DATABASE_URL ไปที่ PostgreSQL จริง
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PG_EMBEDDED_PORT || 55432);
const DATA_DIR = path.join(__dirname, '..', 'prisma', '.pg-data');

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
});

try {
  await pg.initialise();
} catch {
  /* เคยสร้าง data dir ไว้แล้ว ข้ามขั้นตอน initdb */
}

await pg.start();

// สร้างฐานข้อมูลด้วย encoding UTF8 เสมอ — สำคัญมากเพราะข้อมูลเป็นภาษาไทย
// (บน Windows ค่า default ของ initdb อาจเป็น WIN1252 ซึ่งเก็บภาษาไทยไม่ได้)
const client = pg.getPgClient();
await client.connect();
try {
  const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'inventory'");
  if (rows.length === 0) {
    await client.query(
      "CREATE DATABASE inventory WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0"
    );
    console.log('✔ สร้างฐานข้อมูล inventory (UTF8) แล้ว');
  }
} finally {
  await client.end();
}

console.log(`🐘 PostgreSQL พร้อมใช้งานที่ localhost:${PORT}`);
console.log(`   ข้อมูลเก็บที่ ${DATA_DIR}`);
console.log(`   DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/inventory"`);
console.log('   กด Ctrl+C เพื่อหยุด');

const shutdown = async () => {
  console.log('\nกำลังปิด PostgreSQL...');
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
