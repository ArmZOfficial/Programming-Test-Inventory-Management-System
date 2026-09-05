/**
 * Integration tests — รันได้ในเครื่องตัวเอง ไม่ต้องต่อ DB จริง
 *
 * ใช้ไฟล์ SQLite แยกต่างหาก (prisma/test.db) ที่ถูกสร้าง/ล้างใหม่ทุกครั้งที่รันเทส
 * จึงไม่แตะข้อมูลใน dev.db เลย
 *
 *   รันด้วย:  npm test
 */
const { test, before, beforeEach, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// ---- เลือกฐานข้อมูลที่จะทดสอบ (ต้องตั้งก่อน import app — dotenv ไม่ override ค่าที่ตั้งไว้แล้ว) ----
//
//   ค่าเริ่มต้น            → SQLite (prisma/test.db) รันได้ทันที ไม่ต้องมี DB server
//   ตั้ง TEST_DATABASE_URL → ทดสอบกับ PostgreSQL จริง เช่น
//        TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres" npm test
//
const PG_URL = process.env.TEST_DATABASE_URL;
const USE_PG = Boolean(PG_URL);

const TEST_DB_PATH = path.join(__dirname, '..', 'prisma', 'test.db');
process.env.DATABASE_URL = USE_PG ? PG_URL : 'file:./test.db';
process.env.NODE_ENV = 'test';

const request = require('supertest');

let app;
let prisma;

before(() => {
  // เรียก Prisma CLI ผ่าน node โดยตรง (ข้าม npx.cmd ที่ spawn ไม่ได้บน Windows + Node 26)
  const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
  const run = (args) =>
    execFileSync(process.execPath, [prismaCli, ...args], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'ignore',
    });

  if (USE_PG) {
    // PostgreSQL: คาดว่า schema ถูก migrate ไว้แล้ว (npm run pg:deploy) เหมือนบน production จริง
    // ที่ไม่รัน migrate ตอนเทส เพราะ production ก็ไม่ควร migrate อัตโนมัติจากโค้ดเทส
  } else {
    // SQLite: ล้างไฟล์ DB เทสเก่าทิ้ง แล้วสร้าง schema ใหม่จาก schema.prisma
    for (const f of [TEST_DB_PATH, TEST_DB_PATH + '-journal']) {
      if (fs.existsSync(f)) fs.rmSync(f);
    }
    run(['db', 'push', '--skip-generate']);
  }

  app = require('../index');
  prisma = app.locals.prisma;
});

beforeEach(async () => {
  // เริ่มทุกเคสด้วยตารางว่าง เพื่อให้เทสไม่ขึ้นต่อกัน
  await prisma.stockTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

after(async () => {
  if (prisma) await prisma.$disconnect();
});

/* ================================================================== */
describe('GET /api/health', () => {
  test('ตอบ 200 และสถานะ ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

/* ================================================================== */
describe('POST /api/products', () => {
  test('สร้างสินค้าใหม่สำเร็จ → 201', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Notebook Acer A14',
      sku: 'ACER-A14-001',
      costPrice: 15900,
      stockQuantity: 10,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.sku, 'ACER-A14-001');
    assert.equal(res.body.stockQuantity, 10);
    assert.ok(res.body.id > 0);
  });

  test('สต็อกตั้งต้น > 0 ต้องถูกบันทึกเป็น transaction IN', async () => {
    const created = await request(app)
      .post('/api/products')
      .send({ name: 'Mouse', sku: 'MOUSE-001', costPrice: 490, stockQuantity: 7 });

    const res = await request(app).get(`/api/stock/transactions?productId=${created.body.id}`);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].type, 'IN');
    assert.equal(res.body.data[0].quantity, 7);
  });

  test('SKU ซ้ำ → 409', async () => {
    const payload = { name: 'A', sku: 'DUP-001', costPrice: 100 };
    await request(app).post('/api/products').send(payload);
    const res = await request(app).post('/api/products').send({ ...payload, name: 'B' });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /SKU/);
  });

  test('ข้อมูลไม่ครบ (ไม่มี sku) → 400', async () => {
    const res = await request(app).post('/api/products').send({ name: 'X', costPrice: 100 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /จำเป็นต้องระบุ/);
  });

  test('stockQuantity ติดลบ → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'X', sku: 'NEG-001', costPrice: 100, stockQuantity: -5 });
    assert.equal(res.status, 400);
  });

  test('costPrice ไม่ใช่ตัวเลข → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'X', sku: 'STR-001', costPrice: 'แพง' });
    assert.equal(res.status, 400);
  });

  test('categoryId ที่ไม่มีอยู่จริง → 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'X', sku: 'FK-001', costPrice: 100, categoryId: 99999 });
    assert.equal(res.status, 400);
  });
});

/* ================================================================== */
describe('PATCH /api/stock/adjust', () => {
  let productId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Keyboard', sku: 'KB-001', costPrice: 990, stockQuantity: 10 });
    productId = res.body.id;
  });

  test('รับสินค้าเข้า (+5) → สต็อกเพิ่มเป็น 15 และ log type=IN', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: 5, reason: 'รับสินค้าจาก PO#001' });

    assert.equal(res.status, 200);
    assert.equal(res.body.stockQuantity, 15);
    assert.equal(res.body.lastTransaction.type, 'IN');
    assert.equal(res.body.lastTransaction.quantity, 5);
    assert.equal(res.body.lastTransaction.reason, 'รับสินค้าจาก PO#001');
  });

  test('จ่ายสินค้าออก (-3) → สต็อกลดเหลือ 7 และ log type=OUT', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: -3, reason: 'ขายหน้าร้าน' });

    assert.equal(res.status, 200);
    assert.equal(res.body.stockQuantity, 7);
    assert.equal(res.body.lastTransaction.type, 'OUT');
    assert.equal(res.body.lastTransaction.quantity, 3);
  });

  test('ตัดสต็อกเกินจำนวนคงเหลือ → 400 และสต็อกต้องไม่เปลี่ยน', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: -50, reason: 'ขายเกินสต็อก' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /สต็อกไม่เพียงพอ/);

    const after = await request(app).get(`/api/products/${productId}`);
    assert.equal(after.body.stockQuantity, 10, 'สต็อกต้องคงเดิมเมื่อ adjust ล้มเหลว');

    const tx = await request(app).get(`/api/stock/transactions?productId=${productId}`);
    assert.equal(tx.body.count, 1, 'ต้องไม่มี transaction ใหม่ถูกบันทึกเมื่อล้มเหลว');
  });

  test('ตัดสต็อกพอดีเหลือ 0 → สำเร็จ', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: -10, reason: 'เคลียร์สต็อก' });

    assert.equal(res.status, 200);
    assert.equal(res.body.stockQuantity, 0);
  });

  test('ไม่พบสินค้า → 404', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId: 999999, quantity: 1, reason: 'test' });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /ไม่พบสินค้า/);
  });

  test('ไม่ส่ง reason → 400', async () => {
    const res = await request(app).patch('/api/stock/adjust').send({ productId, quantity: 1 });
    assert.equal(res.status, 400);
  });

  test('quantity = 0 → 400', async () => {
    const res = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: 0, reason: 'no-op' });
    assert.equal(res.status, 400);
  });

  test('ปรับสต็อกหลายครั้งติดกัน → ยอดสะสมถูกต้องและ log ครบทุกครั้ง', async () => {
    await request(app).patch('/api/stock/adjust').send({ productId, quantity: 5, reason: 'PO#1' });
    await request(app).patch('/api/stock/adjust').send({ productId, quantity: -2, reason: 'ขาย' });
    const last = await request(app)
      .patch('/api/stock/adjust')
      .send({ productId, quantity: -1, reason: 'ชำรุด' });

    assert.equal(last.body.stockQuantity, 12);

    const tx = await request(app).get(`/api/stock/transactions?productId=${productId}`);
    assert.equal(tx.body.count, 4); // 1 ตั้งต้น + 3 ครั้ง
  });
});

/* ================================================================== */
describe('GET /api/products/low-stock', () => {
  beforeEach(async () => {
    const items = [
      { name: 'Low A', sku: 'LOW-A', costPrice: 10, stockQuantity: 2 },
      { name: 'Low B', sku: 'LOW-B', costPrice: 10, stockQuantity: 4 },
      { name: 'OK C', sku: 'OK-C', costPrice: 10, stockQuantity: 5 },
      { name: 'OK D', sku: 'OK-D', costPrice: 10, stockQuantity: 50 },
      { name: 'Zero E', sku: 'ZERO-E', costPrice: 10, stockQuantity: 0 },
    ];
    for (const it of items) await request(app).post('/api/products').send(it);
  });

  test('ค่า default threshold = 5 (คืนเฉพาะที่ < 5)', async () => {
    const res = await request(app).get('/api/products/low-stock');
    assert.equal(res.status, 200);
    assert.equal(res.body.threshold, 5);
    assert.equal(res.body.count, 3);
    const skus = res.body.data.map((p) => p.sku).sort();
    assert.deepEqual(skus, ['LOW-A', 'LOW-B', 'ZERO-E']);
  });

  test('ระบุ threshold=3 → คืนเฉพาะที่ < 3', async () => {
    const res = await request(app).get('/api/products/low-stock?threshold=3');
    assert.equal(res.body.count, 2);
  });

  test('เรียงจากสต็อกน้อยไปมาก', async () => {
    const res = await request(app).get('/api/products/low-stock?threshold=100');
    const stocks = res.body.data.map((p) => p.stockQuantity);
    assert.deepEqual(stocks, [...stocks].sort((a, b) => a - b));
  });

  test('threshold ติดลบ → 400', async () => {
    const res = await request(app).get('/api/products/low-stock?threshold=-1');
    assert.equal(res.status, 400);
  });
});

/* ================================================================== */
describe('GET /api/products (list) & /api/products/:id', () => {
  test('list คืน pagination metadata ครบ', async () => {
    await request(app)
      .post('/api/products')
      .send({ name: 'P1', sku: 'P-1', costPrice: 1, stockQuantity: 1 });

    const res = await request(app).get('/api/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.page, 1);
    assert.ok(Array.isArray(res.body.data));
  });

  test('filter ด้วย categoryId ได้', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'Electronics' });
    await request(app)
      .post('/api/products')
      .send({ name: 'In cat', sku: 'C-1', costPrice: 1, categoryId: cat.body.id });
    await request(app).post('/api/products').send({ name: 'No cat', sku: 'C-2', costPrice: 1 });

    const res = await request(app).get(`/api/products?categoryId=${cat.body.id}`);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].sku, 'C-1');
  });

  test('ค้นหาด้วย q (ชื่อ/SKU)', async () => {
    await request(app).post('/api/products').send({ name: 'Acer Nitro', sku: 'ACR-1', costPrice: 1 });
    await request(app).post('/api/products').send({ name: 'Logitech', sku: 'LOG-1', costPrice: 1 });

    const res = await request(app).get('/api/products?q=Acer');
    assert.equal(res.body.total, 1);
  });

  test('รายละเอียดสินค้าแนบประวัติ transaction', async () => {
    const p = await request(app)
      .post('/api/products')
      .send({ name: 'Detail', sku: 'D-1', costPrice: 1, stockQuantity: 3 });
    await request(app)
      .patch('/api/stock/adjust')
      .send({ productId: p.body.id, quantity: -1, reason: 'ขาย' });

    const res = await request(app).get(`/api/products/${p.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.transactions.length, 2);
  });

  test('ไม่พบสินค้า → 404', async () => {
    const res = await request(app).get('/api/products/999999');
    assert.equal(res.status, 404);
  });
});

/* ================================================================== */
describe('Categories', () => {
  test('สร้างและดึงหมวดหมู่ได้', async () => {
    const created = await request(app)
      .post('/api/categories')
      .send({ name: 'อุปกรณ์สำนักงาน', description: 'ของใช้ในออฟฟิศ' });
    assert.equal(created.status, 201);

    const list = await request(app).get('/api/categories');
    assert.equal(list.body.count, 1);
    assert.equal(list.body.data[0].name, 'อุปกรณ์สำนักงาน');
  });

  test('ชื่อหมวดหมู่ซ้ำ → 409', async () => {
    await request(app).post('/api/categories').send({ name: 'ซ้ำ' });
    const res = await request(app).post('/api/categories').send({ name: 'ซ้ำ' });
    assert.equal(res.status, 409);
  });

  test('ไม่ส่ง name → 400', async () => {
    const res = await request(app).post('/api/categories').send({});
    assert.equal(res.status, 400);
  });
});

/* ================================================================== */
describe('Routing', () => {
  test('endpoint ที่ไม่มีอยู่ → 404 JSON', async () => {
    const res = await request(app).get('/api/not-exist');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  test('/api/products/low-stock ต้องไม่ถูกจับเป็น /api/products/:id', async () => {
    const res = await request(app).get('/api/products/low-stock');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });
});

/* ================================================================== */
describe('Categories CRUD', () => {
  test('อ่านรายละเอียดหมวดหมู่ + สินค้าในหมวด', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'IT', description: 'ไอที' });
    await request(app)
      .post('/api/products')
      .send({ name: 'Laptop', sku: 'CRUD-1', costPrice: 100, categoryId: cat.body.id });

    const res = await request(app).get(`/api/categories/${cat.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'IT');
    assert.equal(res.body.products.length, 1);
    assert.equal(res.body._count.products, 1);
  });

  test('อ่านรายละเอียดหมวดหมู่ที่ไม่มีอยู่ → 404', async () => {
    const res = await request(app).get('/api/categories/999999');
    assert.equal(res.status, 404);
  });

  test('แก้ไขชื่อและคำอธิบายได้', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'เก่า' });
    const res = await request(app)
      .patch(`/api/categories/${cat.body.id}`)
      .send({ name: 'ใหม่', description: 'คำอธิบายใหม่' });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'ใหม่');
    assert.equal(res.body.description, 'คำอธิบายใหม่');
  });

  test('แก้ไขเป็นชื่อที่ซ้ำกับหมวดอื่น → 409', async () => {
    await request(app).post('/api/categories').send({ name: 'A' });
    const b = await request(app).post('/api/categories').send({ name: 'B' });

    const res = await request(app).patch(`/api/categories/${b.body.id}`).send({ name: 'A' });
    assert.equal(res.status, 409);
  });

  test('แก้ไขหมวดหมู่ที่ไม่มีอยู่ → 404', async () => {
    const res = await request(app).patch('/api/categories/999999').send({ name: 'X' });
    assert.equal(res.status, 404);
  });

  test('แก้ไขโดยส่งชื่อว่าง → 400', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'ห้ามว่าง' });
    const res = await request(app).patch(`/api/categories/${cat.body.id}`).send({ name: '   ' });
    assert.equal(res.status, 400);
  });

  test('ลบหมวดหมู่ว่าง → สำเร็จ', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'จะถูกลบ' });
    const res = await request(app).delete(`/api/categories/${cat.body.id}`);

    assert.equal(res.status, 200);
    const check = await request(app).get(`/api/categories/${cat.body.id}`);
    assert.equal(check.status, 404);
  });

  test('ลบหมวดหมู่ที่ยังมีสินค้า → 409 และต้องไม่ลบจริง', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'มีสินค้า' });
    await request(app)
      .post('/api/products')
      .send({ name: 'P', sku: 'CRUD-2', costPrice: 10, categoryId: cat.body.id });

    const res = await request(app).delete(`/api/categories/${cat.body.id}`);
    assert.equal(res.status, 409);
    assert.equal(res.body.productCount, 1);

    const check = await request(app).get(`/api/categories/${cat.body.id}`);
    assert.equal(check.status, 200, 'หมวดหมู่ต้องยังอยู่');
  });

  test('ลบพร้อม force=true → ลบได้ และสินค้าไม่หาย (categoryId เป็น null)', async () => {
    const cat = await request(app).post('/api/categories').send({ name: 'ลบแบบ force' });
    const p = await request(app)
      .post('/api/products')
      .send({ name: 'P', sku: 'CRUD-3', costPrice: 10, categoryId: cat.body.id });

    const res = await request(app).delete(`/api/categories/${cat.body.id}?force=true`);
    assert.equal(res.status, 200);
    assert.equal(res.body.detachedProducts, 1);

    const product = await request(app).get(`/api/products/${p.body.id}`);
    assert.equal(product.status, 200, 'สินค้าต้องยังอยู่');
    assert.equal(product.body.categoryId, null);
  });

  test('ลบหมวดหมู่ที่ไม่มีอยู่ → 404', async () => {
    const res = await request(app).delete('/api/categories/999999');
    assert.equal(res.status, 404);
  });
});

/* ================================================================== */
describe('ค้นหาสินค้าจากชื่อและรหัสสินค้า (SKU)', () => {
  beforeEach(async () => {
    const items = [
      { name: 'Notebook Acer Aspire', sku: 'ACER-A14-001', costPrice: 1 },
      { name: 'เมาส์ไร้สาย Logitech', sku: 'LOG-M331', costPrice: 1 },
      { name: 'กระดาษ A4 80 แกรม', sku: 'PPR-A4-80', costPrice: 1 },
    ];
    for (const it of items) await request(app).post('/api/products').send(it);
  });

  test('ค้นด้วยชื่อสินค้าภาษาอังกฤษ', async () => {
    const res = await request(app).get('/api/products?q=Notebook');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].sku, 'ACER-A14-001');
  });

  test('ค้นด้วยชื่อสินค้าภาษาไทย', async () => {
    const res = await request(app).get('/api/products?q=เมาส์');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].sku, 'LOG-M331');
  });

  test('ค้นด้วยรหัสสินค้า (SKU) เต็ม', async () => {
    const res = await request(app).get('/api/products?q=PPR-A4-80');
    assert.equal(res.body.total, 1);
  });

  test('ค้นด้วย SKU บางส่วน', async () => {
    const res = await request(app).get('/api/products?q=LOG');
    assert.equal(res.body.total, 1);
  });

  test('ไม่สนตัวพิมพ์เล็ก/ใหญ่ (acer ต้องเจอ ACER-A14-001)', async () => {
    const res = await request(app).get('/api/products?q=acer');
    assert.equal(res.body.total, 1, 'การค้นหาต้องไม่สนตัวพิมพ์เล็ก/ใหญ่');
  });

  test('ค้นแล้วไม่เจอ → total = 0 (ไม่ error)', async () => {
    const res = await request(app).get('/api/products?q=ไม่มีสินค้านี้แน่นอน');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });
});
