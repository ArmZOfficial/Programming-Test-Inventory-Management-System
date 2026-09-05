/**
 * Inventory Management System — Express API
 * Export app (ไม่ listen) เพื่อให้ test import ไปใช้ได้
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ให้ test / handler เข้าถึง prisma client ตัวเดียวกันได้
app.locals.prisma = prisma;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const isInt = (v) => Number.isInteger(v);
const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** ครอบ async handler เพื่อส่ง error เข้า error middleware อัตโนมัติ */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------------------ *
 * Health check
 * ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-api', timestamp: new Date().toISOString() });
});

/* ------------------------------------------------------------------ *
 * 3.1 POST /api/products — สร้างสินค้าใหม่
 * ------------------------------------------------------------------ */
app.post(
  '/api/products',
  wrap(async (req, res) => {
    const { name, sku, categoryId, costPrice, stockQuantity } = req.body || {};

    if (!name || !sku || costPrice === undefined || costPrice === null) {
      return res.status(400).json({ error: 'name, sku, costPrice จำเป็นต้องระบุ' });
    }
    if (!isNonNegativeNumber(costPrice)) {
      return res.status(400).json({ error: 'costPrice ต้องเป็นตัวเลขและมีค่ามากกว่าหรือเท่ากับ 0' });
    }

    const initialStock = stockQuantity === undefined || stockQuantity === null ? 0 : stockQuantity;
    if (!isInt(initialStock) || initialStock < 0) {
      return res.status(400).json({ error: 'stockQuantity ต้องเป็นจำนวนเต็มและห้ามติดลบ' });
    }
    if (categoryId !== undefined && categoryId !== null && !isInt(categoryId)) {
      return res.status(400).json({ error: 'categoryId ต้องเป็นจำนวนเต็ม' });
    }

    try {
      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: String(name).trim(),
            sku: String(sku).trim(),
            categoryId: categoryId ?? null,
            costPrice,
            stockQuantity: initialStock,
          },
          include: { category: true },
        });

        // เปิดยอดพร้อมสต็อกตั้งต้น → บันทึกเป็น transaction แรกไว้ให้ประวัติครบ
        if (initialStock > 0) {
          await tx.stockTransaction.create({
            data: {
              productId: created.id,
              type: 'IN',
              quantity: initialStock,
              reason: 'สต็อกตั้งต้นตอนสร้างสินค้า',
            },
          });
        }
        return created;
      });

      return res.status(201).json(product);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'SKU นี้มีอยู่แล้วในระบบ' });
      }
      if (err.code === 'P2003' || err.code === 'P2025') {
        return res.status(400).json({ error: 'ไม่พบหมวดหมู่ (categoryId) ที่ระบุ' });
      }
      throw err;
    }
  })
);

/* ------------------------------------------------------------------ *
 * 3.3 GET /api/products/low-stock  (ต้องประกาศก่อน /api/products/:id)
 * ------------------------------------------------------------------ */
app.get(
  '/api/products/low-stock',
  wrap(async (req, res) => {
    const raw = req.query.threshold;
    const threshold = raw === undefined || raw === '' ? 5 : Number(raw);

    if (!Number.isFinite(threshold) || threshold < 0) {
      return res.status(400).json({ error: 'threshold ต้องเป็นตัวเลขและมีค่ามากกว่าหรือเท่ากับ 0' });
    }

    const products = await prisma.product.findMany({
      where: { stockQuantity: { lt: threshold } },
      include: { category: true },
      orderBy: { stockQuantity: 'asc' },
    });

    res.json({ threshold, count: products.length, data: products });
  })
);

/* ------------------------------------------------------------------ *
 * 4.1 GET /api/products — list + filter + pagination
 * ------------------------------------------------------------------ */
app.get(
  '/api/products',
  wrap(async (req, res) => {
    const { categoryId, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where = {};
    if (categoryId !== undefined && categoryId !== '') {
      const cid = Number(categoryId);
      if (!Number.isInteger(cid)) {
        return res.status(400).json({ error: 'categoryId ต้องเป็นจำนวนเต็ม' });
      }
      where.categoryId = cid;
    }
    if (q) {
      where.OR = [{ name: { contains: String(q) } }, { sku: { contains: String(q) } }];
    }

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ page, limit, total, totalPages: Math.ceil(total / limit) || 1, data });
  })
);

/* ------------------------------------------------------------------ *
 * 4.2 GET /api/products/:id — รายละเอียด + ประวัติ transaction
 * ------------------------------------------------------------------ */
app.get(
  '/api/products/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id ต้องเป็นจำนวนเต็ม' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    res.json(product);
  })
);

/* ------------------------------------------------------------------ *
 * 3.2 PATCH /api/stock/adjust — ปรับสต็อก + log ทุกครั้ง (atomic)
 * ------------------------------------------------------------------ */
app.patch(
  '/api/stock/adjust',
  wrap(async (req, res) => {
    const { productId, quantity, reason } = req.body || {};

    if (productId === undefined || quantity === undefined || !reason) {
      return res.status(400).json({ error: 'productId, quantity, reason จำเป็นต้องระบุ' });
    }
    if (!isInt(productId)) {
      return res.status(400).json({ error: 'productId ต้องเป็นจำนวนเต็ม' });
    }
    if (!isInt(quantity) || quantity === 0) {
      return res
        .status(400)
        .json({ error: 'quantity ต้องเป็นจำนวนเต็มที่ไม่เท่ากับ 0 (บวก = รับเข้า, ลบ = จ่ายออก)' });
    }
    if (String(reason).trim() === '') {
      return res.status(400).json({ error: 'reason ห้ามเป็นค่าว่าง' });
    }

    // อ่าน + เขียนอยู่ใน transaction เดียวกัน กัน race condition และกันสต็อกติดลบ
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) return { status: 404, body: { error: 'ไม่พบสินค้า' } };

      const newStock = product.stockQuantity + quantity;
      if (newStock < 0) {
        return {
          status: 400,
          body: {
            error: 'สต็อกไม่เพียงพอ ไม่สามารถปรับเป็นค่าติดลบได้',
            currentStock: product.stockQuantity,
            requested: quantity,
          },
        };
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
        include: { category: true },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          productId,
          type: quantity > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(quantity),
          reason: String(reason).trim(),
        },
      });

      return { status: 200, body: { ...updated, lastTransaction: transaction } };
    });

    res.status(result.status).json(result.body);
  })
);

/* ------------------------------------------------------------------ *
 * 4.4 GET /api/stock/transactions — ประวัติทั้งหมด (filter ?productId=)
 * ------------------------------------------------------------------ */
app.get(
  '/api/stock/transactions',
  wrap(async (req, res) => {
    const { productId, type } = req.query;
    const where = {};

    if (productId !== undefined && productId !== '') {
      const pid = Number(productId);
      if (!Number.isInteger(pid)) {
        return res.status(400).json({ error: 'productId ต้องเป็นจำนวนเต็ม' });
      }
      where.productId = pid;
    }
    if (type) {
      const t = String(type).toUpperCase();
      if (t !== 'IN' && t !== 'OUT') {
        return res.status(400).json({ error: 'type ต้องเป็น IN หรือ OUT เท่านั้น' });
      }
      where.type = t;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));

    const [total, data] = await Promise.all([
      prisma.stockTransaction.count({ where }),
      prisma.stockTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      count: data.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data,
    });
  })
);

/* ------------------------------------------------------------------ *
 * 4.3 GET / POST /api/categories
 * ------------------------------------------------------------------ */
app.get(
  '/api/categories',
  wrap(async (req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ count: categories.length, data: categories });
  })
);

app.post(
  '/api/categories',
  wrap(async (req, res) => {
    const { name, description } = req.body || {};
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ error: 'name จำเป็นต้องระบุ' });
    }

    try {
      const category = await prisma.category.create({
        data: { name: String(name).trim(), description: description ?? null },
      });
      return res.status(201).json(category);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'ชื่อหมวดหมู่นี้มีอยู่แล้วในระบบ' });
      }
      throw err;
    }
  })
);

/* ------------------------------------------------------------------ *
 * 404 + Error handler
 * ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).json({ error: 'ไม่พบ endpoint: ' + req.method + ' ' + req.path });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
