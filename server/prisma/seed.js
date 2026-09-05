/**
 * Seed ข้อมูลตัวอย่าง — รันด้วย `npm run seed`
 * ปลอดภัยต่อการรันซ้ำ (upsert ด้วย unique key)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'คอมพิวเตอร์ & โน้ตบุ๊ก', description: 'เครื่องคอมพิวเตอร์และโน้ตบุ๊กทุกรุ่น' },
  { name: 'อุปกรณ์ต่อพ่วง', description: 'เมาส์ คีย์บอร์ด จอภาพ หูฟัง' },
  { name: 'อุปกรณ์สำนักงาน', description: 'เครื่องเขียนและของใช้ในออฟฟิศ' },
  { name: 'อะไหล่ & อุปกรณ์เสริม', description: 'RAM SSD สายชาร์จ อะแดปเตอร์' },
];

const products = [
  { name: 'Notebook Acer Aspire A14', sku: 'ACER-A14-001', cat: 0, costPrice: 15900, stock: 12 },
  { name: 'Notebook Lenovo IdeaPad 3', sku: 'LNV-IP3-002', cat: 0, costPrice: 13500, stock: 3 },
  { name: 'MacBook Air M3 13"', sku: 'APL-MBA-M3', cat: 0, costPrice: 38900, stock: 2 },
  { name: 'เมาส์ไร้สาย Logitech M331', sku: 'LOG-M331', cat: 1, costPrice: 590, stock: 48 },
  { name: 'คีย์บอร์ด Keychron K2', sku: 'KEY-K2-RGB', cat: 1, costPrice: 2890, stock: 7 },
  { name: 'จอมอนิเตอร์ Dell 24" IPS', sku: 'DEL-P2422H', cat: 1, costPrice: 5490, stock: 0 },
  { name: 'หูฟัง Sony WH-1000XM5', sku: 'SNY-XM5', cat: 1, costPrice: 11900, stock: 4 },
  { name: 'กระดาษ A4 80 แกรม (รีม)', sku: 'PPR-A4-80', cat: 2, costPrice: 115, stock: 250 },
  { name: 'ปากกาลูกลื่น (กล่อง 50 ด้าม)', sku: 'PEN-BOX50', cat: 2, costPrice: 320, stock: 18 },
  { name: 'SSD Samsung 980 1TB NVMe', sku: 'SSD-980-1TB', cat: 3, costPrice: 2450, stock: 15 },
  { name: 'RAM Kingston 16GB DDR4', sku: 'RAM-KST-16', cat: 3, costPrice: 1290, stock: 1 },
  { name: 'สายชาร์จ USB-C 100W', sku: 'CBL-USBC-100', cat: 3, costPrice: 390, stock: 32 },
];

/** ความเคลื่อนไหวตัวอย่าง — qty ลบ = จ่ายออก (OUT), บวก = รับเข้า (IN) */
const movements = [
  { sku: 'ACER-A14-001', qty: -2, reason: 'ขายหน้าร้าน บิล #INV-1042' },
  { sku: 'ACER-A14-001', qty: -1, reason: 'เบิกให้ฝ่ายขายใช้เป็นเครื่องสาธิต' },
  { sku: 'LOG-M331', qty: -6, reason: 'ขายส่งให้ร้านค้าปลีก PO#556' },
  { sku: 'LOG-M331', qty: -2, reason: 'สินค้าชำรุดจากการขนส่ง' },
  { sku: 'PPR-A4-80', qty: -25, reason: 'เบิกใช้ภายในสำนักงาน ประจำเดือน' },
  { sku: 'PPR-A4-80', qty: 50, reason: 'รับสินค้าจาก PO#008' },
  { sku: 'SSD-980-1TB', qty: -4, reason: 'ขายหน้าร้าน บิล #INV-1048' },
  { sku: 'PEN-BOX50', qty: -3, reason: 'เบิกใช้ภายในสำนักงาน' },
  { sku: 'CBL-USBC-100', qty: -9, reason: 'ขายออนไลน์ ออเดอร์เดือนนี้' },
  { sku: 'SNY-XM5', qty: -3, reason: 'ขายหน้าร้าน บิล #INV-1051' },
  { sku: 'LNV-IP3-002', qty: -2, reason: 'ขายหน้าร้าน บิล #INV-1053' },
  { sku: 'KEY-K2-RGB', qty: -4, reason: 'ตัวอย่างสินค้าส่งให้ลูกค้า' },
  { sku: 'RAM-KST-16', qty: 10, reason: 'รับสินค้าจาก PO#011 (เติมสต็อกด่วน)' },
  { sku: 'RAM-KST-16', qty: -8, reason: 'ขายส่งช่างประกอบคอม' },
];

async function main() {
  console.log('🌱 กำลัง seed ข้อมูลตัวอย่าง...');

  const createdCategories = [];
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: c,
    });
    createdCategories.push(cat);
  }
  console.log(`   ✔ หมวดหมู่ ${createdCategories.length} รายการ`);

  let created = 0;
  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (exists) continue;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          categoryId: createdCategories[p.cat].id,
          costPrice: p.costPrice,
          stockQuantity: p.stock,
        },
      });
      if (p.stock > 0) {
        await tx.stockTransaction.create({
          data: {
            productId: product.id,
            type: 'IN',
            quantity: p.stock,
            reason: 'สต็อกตั้งต้นตอนสร้างสินค้า',
          },
        });
      }
    });
    created++;
  }
  console.log(`   ✔ สินค้า ${created} รายการใหม่ (ข้ามรายการที่มี SKU ซ้ำ)`);

  // ---- ประวัติการเคลื่อนไหวตัวอย่าง (มีทั้งจ่ายออก OUT และรับเข้าเพิ่ม IN) ----
  let moves = 0;
  for (const m of movements) {
    const product = await prisma.product.findUnique({ where: { sku: m.sku } });
    if (!product) continue;

    // idempotent: ข้ามถ้าเคยบันทึกเหตุผลนี้ให้สินค้าตัวนี้แล้ว
    const dup = await prisma.stockTransaction.findFirst({
      where: { productId: product.id, reason: m.reason },
    });
    if (dup) continue;

    const newStock = product.stockQuantity + m.qty;
    if (newStock < 0) continue; // กันสต็อกติดลบเหมือน API จริง

    await prisma.$transaction([
      prisma.product.update({ where: { id: product.id }, data: { stockQuantity: newStock } }),
      prisma.stockTransaction.create({
        data: {
          productId: product.id,
          type: m.qty > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(m.qty),
          reason: m.reason,
        },
      }),
    ]);
    moves++;
  }
  console.log(`   ✔ ประวัติการเคลื่อนไหว ${moves} รายการ (รับเข้า/จ่ายออก)`);
  console.log('✅ Seed เสร็จสมบูรณ์');
}

main()
  .catch((e) => {
    console.error('❌ Seed ล้มเหลว:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
