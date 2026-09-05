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
  console.log('✅ Seed เสร็จสมบูรณ์');
}

main()
  .catch((e) => {
    console.error('❌ Seed ล้มเหลว:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
