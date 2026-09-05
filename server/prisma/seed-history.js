/**
 * สร้างประวัติการเคลื่อนไหวสต็อกย้อนหลังแบบสมจริง (เดโม/พัฒนาเท่านั้น)
 *
 *   npm run seed:history
 *
 * จำลองการใช้งานจริงย้อนหลัง 90 วัน: ขายออกเรื่อยๆ, เบิกใช้ภายใน, ของชำรุด,
 * ลูกค้าคืนของ, และรับสินค้าเข้าตาม PO เมื่อสต็อกใกล้หมด
 *
 * ⚠️ สคริปต์นี้จะ "ลบประวัติเดิมทั้งหมด" แล้วสร้างใหม่ พร้อมคำนวณ stockQuantity
 *    ของทุกสินค้าใหม่ให้ตรงกับประวัติ — ห้ามรันบนฐานข้อมูลจริง (production)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAYS_BACK = 90;
const MIN_EVENTS = 28; // ต่อสินค้า 1 รายการ
const MAX_EVENTS = 58;

/* --------- PRNG แบบกำหนด seed ได้ เพื่อให้ผลลัพธ์ซ้ำเดิมทุกครั้ง --------- */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260905);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/* ----------------------------- เหตุผล ----------------------------- */
let invoiceNo = 1000;
let poNo = 500;
let rmaNo = 100;

const outReasons = [
  () => `ขายหน้าร้าน บิล #INV-${++invoiceNo}`,
  () => `ขายออนไลน์ ออเดอร์ #ORD-${++invoiceNo}`,
  () => `ขายส่งร้านค้าปลีก ใบสั่งซื้อ #SO-${++invoiceNo}`,
  () => 'เบิกใช้ภายในสำนักงาน',
  () => 'เบิกให้ฝ่ายขายใช้เป็นเครื่องสาธิต',
  () => 'สินค้าชำรุดจากการขนส่ง',
  () => 'สินค้าเสียหายระหว่างจัดเก็บ',
  () => 'ตัวอย่างสินค้าส่งให้ลูกค้า',
  () => `โอนย้ายออกไปสาขา ${pick(['ลาดพร้าว', 'บางนา', 'เชียงใหม่', 'ขอนแก่น'])}`,
  () => 'ปรับยอดหลังนับสต็อก (ของขาด)',
];

const inReasons = [
  () => `รับสินค้าจาก PO#${++poNo}`,
  () => `รับสินค้าจาก PO#${++poNo} (เติมสต็อกด่วน)`,
  () => `ลูกค้าคืนสินค้า RMA-${++rmaNo}`,
  () => 'รับคืนจากเครื่องสาธิต',
  () => `โอนย้ายเข้าจากสาขา ${pick(['ลาดพร้าว', 'บางนา', 'เชียงใหม่', 'ขอนแก่น'])}`,
  () => 'ปรับยอดหลังนับสต็อก (ของเกิน)',
];

/** สินค้าราคาแพงขายทีละน้อย ของใช้สิ้นเปลืองขายทีละเยอะ */
function scaleFor(costPrice) {
  if (costPrice >= 10000) return { out: [1, 2], in: [2, 5] };
  if (costPrice >= 2000) return { out: [1, 4], in: [5, 12] };
  if (costPrice >= 500) return { out: [1, 8], in: [10, 30] };
  return { out: [2, 20], in: [40, 120] };
}

async function main() {
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  if (products.length === 0) {
    console.log('⚠️  ยังไม่มีสินค้าในระบบ — รัน `npm run seed` ก่อน');
    return;
  }

  console.log(`🧹 ล้างประวัติเดิม แล้วจำลองการใช้งานย้อนหลัง ${DAYS_BACK} วัน...`);
  await prisma.stockTransaction.deleteMany();

  const now = Date.now();
  const dayMs = 86400000;
  let total = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const product of products) {
    const scale = scaleFor(product.costPrice);
    const rows = [];

    // 1) เปิดสต็อกตั้งต้นเมื่อ 90 วันก่อน
    let stock = randInt(scale.in[0], scale.in[1]) * 2;
    const openedAt = new Date(now - DAYS_BACK * dayMs - randInt(1, 12) * 3600000);
    rows.push({
      productId: product.id,
      type: 'IN',
      quantity: stock,
      reason: 'สต็อกตั้งต้นตอนเปิดใช้ระบบ',
      createdAt: openedAt,
    });

    // 2) สุ่มเวลาของเหตุการณ์ในช่วง 90 วัน แล้วเรียงตามลำดับเวลา
    const eventCount = randInt(MIN_EVENTS, MAX_EVENTS);
    const times = Array.from({ length: eventCount }, () => {
      const daysAgo = rand() * (DAYS_BACK - 1);
      // เวลาทำการ 8:00–19:00
      const hour = randInt(8, 19);
      const d = new Date(now - daysAgo * dayMs);
      d.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
      return d;
    }).sort((a, b) => a - b);

    for (const at of times) {
      // สต็อกใกล้หมด → รับเข้า, ไม่งั้นส่วนใหญ่เป็นการจ่ายออก
      const mustRestock = stock <= scale.out[1];
      const isIn = mustRestock || rand() < 0.24;

      if (isIn) {
        const qty = randInt(scale.in[0], scale.in[1]);
        stock += qty;
        rows.push({
          productId: product.id,
          type: 'IN',
          quantity: qty,
          reason: pick(inReasons)(),
          createdAt: at,
        });
        totalIn++;
      } else {
        const qty = Math.min(stock, randInt(scale.out[0], scale.out[1]));
        if (qty <= 0) continue; // ไม่มีของให้ตัด ข้ามไป (กันสต็อกติดลบ)
        stock -= qty;
        rows.push({
          productId: product.id,
          type: 'OUT',
          quantity: qty,
          reason: pick(outReasons)(),
          createdAt: at,
        });
        totalOut++;
      }
    }

    // 3) บันทึกประวัติ + ตั้งยอดคงเหลือให้ตรงกับประวัติ (ใน transaction เดียวกัน)
    await prisma.$transaction([
      prisma.stockTransaction.createMany({ data: rows }),
      prisma.product.update({ where: { id: product.id }, data: { stockQuantity: stock } }),
    ]);

    total += rows.length;
    console.log(
      `   ✔ ${product.sku.padEnd(14)} ${String(rows.length).padStart(3)} รายการ → คงเหลือ ${stock} ชิ้น`
    );
  }

  // 3.5) จงใจให้บางรายการเหลือน้อย เพื่อให้เห็นการทำงานของ Low stock alert
  const lowTargets = [
    { sku: 'DEL-P2422H', finalStock: 0, reason: `ขายส่งยกล็อต ใบสั่งซื้อ #SO-${++invoiceNo}` },
    { sku: 'RAM-KST-16', finalStock: 2, reason: `ขายหน้าร้าน บิล #INV-${++invoiceNo}` },
    { sku: 'SNY-XM5', finalStock: 3, reason: 'โอนย้ายออกไปสาขา บางนา' },
    { sku: 'APL-MBA-M3', finalStock: 4, reason: `ขายออนไลน์ ออเดอร์ #ORD-${++invoiceNo}` },
  ];

  for (const t of lowTargets) {
    const p = await prisma.product.findUnique({ where: { sku: t.sku } });
    if (!p || p.stockQuantity <= t.finalStock) continue;

    const qty = p.stockQuantity - t.finalStock;
    await prisma.$transaction([
      prisma.stockTransaction.create({
        data: {
          productId: p.id,
          type: 'OUT',
          quantity: qty,
          reason: t.reason,
          createdAt: new Date(now - randInt(2, 36) * 3600000),
        },
      }),
      prisma.product.update({ where: { id: p.id }, data: { stockQuantity: t.finalStock } }),
    ]);
    total++;
    totalOut++;
    console.log(`   ✔ ${t.sku.padEnd(14)} ตัดเพิ่ม ${qty} ชิ้น → เหลือ ${t.finalStock} (สำหรับ low-stock alert)`);
  }

  // 4) ตรวจสอบความถูกต้อง: ยอดคงเหลือต้อง = ผลรวม IN − OUT ของสินค้านั้น
  let mismatch = 0;
  for (const product of products) {
    const txs = await prisma.stockTransaction.findMany({ where: { productId: product.id } });
    const computed = txs.reduce((s, t) => s + (t.type === 'IN' ? t.quantity : -t.quantity), 0);
    const current = await prisma.product.findUnique({ where: { id: product.id } });
    if (computed !== current.stockQuantity || computed < 0) {
      mismatch++;
      console.error(`   ✘ ${product.sku}: ประวัติรวมได้ ${computed} แต่ยอดคงเหลือ ${current.stockQuantity}`);
    }
  }

  console.log('');
  console.log(`✅ สร้างประวัติทั้งหมด ${total} รายการ (รับเข้า ${totalIn + products.length} / จ่ายออก ${totalOut})`);
  console.log(
    mismatch === 0
      ? '✅ ตรวจสอบแล้ว: ยอดคงเหลือทุกสินค้าตรงกับผลรวมประวัติ และไม่มีค่าติดลบ'
      : `❌ พบข้อมูลไม่ตรงกัน ${mismatch} รายการ`
  );
}

main()
  .catch((e) => {
    console.error('❌ สร้างประวัติล้มเหลว:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
