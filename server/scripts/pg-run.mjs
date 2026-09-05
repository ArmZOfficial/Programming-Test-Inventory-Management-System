/**
 * ตัวช่วยรันคำสั่งต่างๆ ในโหมด PostgreSQL
 *
 * บังคับ DATABASE_URL ให้ชี้ไป PostgreSQL ก่อนเสมอ (override ค่าใน .env ที่เป็น SQLite)
 * เพื่อให้สลับไปมาระหว่าง dev (SQLite) กับ PostgreSQL ได้โดยไม่ต้องแก้ไฟล์ .env
 *
 *   node scripts/pg-run.mjs deploy     # apply migration
 *   node scripts/pg-run.mjs generate   # generate Prisma Client สำหรับ PostgreSQL
 *   node scripts/pg-run.mjs seed       # ใส่ข้อมูลตัวอย่าง
 *   node scripts/pg-run.mjs test       # รันชุดทดสอบทั้งหมดกับ PostgreSQL
 *   node scripts/pg-run.mjs dev        # รัน API โดยใช้ PostgreSQL
 *
 * ปรับปลายทางได้ด้วย PG_DATABASE_URL เช่น
 *   PG_DATABASE_URL="postgresql://user:pass@db-host:5432/inventory" npm run pg:deploy
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEFAULT_URL = 'postgresql://postgres:postgres@localhost:55432/inventory';
const DATABASE_URL = process.env.PG_DATABASE_URL || DEFAULT_URL;
const SCHEMA = 'prisma/postgres/schema.prisma';
const PRISMA_CLI = path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');

const task = process.argv[2];

const TASKS = {
  deploy: [PRISMA_CLI, 'migrate', 'deploy', '--schema', SCHEMA],
  generate: [PRISMA_CLI, 'generate', '--schema', SCHEMA],
  seed: ['prisma/seed.js'],
  history: ['prisma/seed-history.js'],
  dev: ['server.js'],
  test: ['--test', 'tests/'],
};

if (!TASKS[task]) {
  console.error(`ใช้: node scripts/pg-run.mjs <${Object.keys(TASKS).join('|')}>`);
  process.exit(1);
}

// ชุดทดสอบอ่านปลายทาง PostgreSQL จาก TEST_DATABASE_URL
const env = { ...process.env, DATABASE_URL, TEST_DATABASE_URL: DATABASE_URL };

console.log(`▶ โหมด PostgreSQL — ${DATABASE_URL.replace(/:[^:@/]+@/, ':****@')}`);

// Prisma Client ถูก generate ตาม provider ของ schema ที่ใช้ล่าสุด
// จึงต้อง generate จาก schema PostgreSQL ก่อนทุกครั้ง เผื่อก่อนหน้านี้เพิ่งใช้ SQLite อยู่
if (task !== 'generate') {
  const gen = spawnSync(process.execPath, TASKS.generate, { cwd: ROOT, env, stdio: 'ignore' });
  if (gen.status !== 0) {
    console.error('✘ generate Prisma Client สำหรับ PostgreSQL ไม่สำเร็จ');
    process.exit(gen.status ?? 1);
  }
}

const result = spawnSync(process.execPath, TASKS[task], { cwd: ROOT, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
