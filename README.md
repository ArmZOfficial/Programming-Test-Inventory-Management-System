# 📦 Inventory Management System

ระบบจัดการสินค้าคงคลัง — REST API + หน้าเว็บใช้งานจริง
**Node.js (Express) + Prisma ORM + SQLite + React (Vite)**

> ✅ ทดสอบอัตโนมัติ **46 เคส ผ่านทั้งหมด — ทั้งบน SQLite และ PostgreSQL** รันได้ในเครื่องตัวเองโดยไม่ต้องติดตั้ง database server และไม่แตะข้อมูลจริง

---

## 🗄️ รองรับ 2 ฐานข้อมูล — SQLite (dev) และ PostgreSQL (production)

โค้ด API **ชุดเดียวกัน** ใช้ได้ทั้งสองฐานข้อมูล เพราะ logic ทั้งหมดอยู่บน Prisma และอยู่ใน database transaction อยู่แล้ว

| โหมด | ใช้เมื่อ | คำสั่ง |
|---|---|---|
| **SQLite** (ค่าเริ่มต้น) | พัฒนา/ทดสอบในเครื่อง — ไม่ต้องติดตั้ง DB server | `npm run dev` · `npm test` |
| **PostgreSQL** | ใช้งานจริง หรืออยากทดสอบให้เหมือน production | `npm run pg:start` แล้ว `npm run pg:dev` · `npm run pg:test` |

✅ **ชุดทดสอบ 46 เคส ผ่านครบทั้งสองฐานข้อมูล** (SQLite 46/46 · PostgreSQL 46/46)

### ทดสอบโหมด PostgreSQL โดยไม่ต้องติดตั้งอะไรเพิ่ม

โปรเจกต์มี PostgreSQL ตัวจริงฝังมาให้ (`embedded-postgres`) — ไม่ต้องมี Docker หรือติดตั้ง PostgreSQL

```bash
cd server
npm run pg:start     # terminal ที่ 1 — เปิด PostgreSQL ที่ localhost:55432 (สร้าง DB แบบ UTF8 ให้อัตโนมัติ)
```

```bash
cd server
npm run pg:deploy    # terminal ที่ 2 — apply migration
npm run pg:seed      # ใส่ข้อมูลตัวอย่าง
npm run pg:test      # รันชุดทดสอบทั้ง 46 เคสกับ PostgreSQL
npm run pg:dev       # รัน API โดยใช้ PostgreSQL
```

ถ้ามี Docker และอยากใช้ PostgreSQL แบบ container:

```bash
docker compose up -d
```

แล้วชี้ปลายทางด้วย `PG_DATABASE_URL` เช่น

```bash
PG_DATABASE_URL="postgresql://inventory:inventory@localhost:5432/inventory" npm run pg:deploy
```

### สิ่งที่ PostgreSQL ให้เพิ่มจาก SQLite

- **CHECK constraint กันสต็อกติดลบที่ระดับฐานข้อมูล** — `stockQuantity >= 0` เป็นด่านสุดท้ายนอกเหนือจาก logic ใน API
- **จำกัดค่า `type` ให้เป็น `IN`/`OUT` เท่านั้น** และ `quantity > 0` (SQLite ทำไม่ได้)
- **ค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่** ด้วย `mode: 'insensitive'` (API ตรวจ provider ให้อัตโนมัติ)
- รองรับหลาย connection พร้อมกัน → scale ได้จริง

> ⚠️ ส่วนที่ยังต้องทำก่อนขึ้น production จริง: จำกัด CORS, เพิ่ม Authentication, helmet + rate limit, backup, HTTPS
> รายละเอียดครบใน **[DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🖼️ ตัวอย่างหน้าจอระบบ

### ภาพรวมคลังสินค้า (Dashboard)
เห็นสถานะคลังทั้งหมดในหน้าเดียว — จำนวน SKU, ชิ้นในคลัง, ใกล้หมด, หมดสต็อก, มูลค่าคงคลังรวม พร้อมความเคลื่อนไหวล่าสุดและรายการที่ต้องเติมด่วน

![Dashboard](docs/screenshots/01-dashboard.png)

### ปรับสต็อก — กันสต็อกติดลบตั้งแต่หน้าจอ
ผู้ใช้เลือก "รับเข้า / จ่ายออก" แล้วกรอกจำนวนเป็นบวกเสมอ (ไม่ต้องคิดเรื่องเครื่องหมายลบ)
ภาพนี้คือกรณีตัดสต็อก 3 ชิ้นจากของที่เหลือ 2 ชิ้น → เตือนสีแดงทันที พรีวิวขึ้น `2 → -1` และ **ปุ่มยืนยันถูกปิดไว้** ส่วนฝั่ง API ก็ปฏิเสธด้วย HTTP 400 อีกชั้นหนึ่ง

![ฟอร์มปรับสต็อก](docs/screenshots/04-stock-adjust.png)

### รายการสินค้า
ค้นหาจากชื่อ/SKU (debounce), กรองหมวดหมู่, แถบระดับสต็อก, ป้ายสถานะ 3 ระดับ และแบ่งหน้าแบบกดเลือกเลขหน้าได้

![รายการสินค้า](docs/screenshots/02-products.png)

### สินค้าใกล้หมด (Low Stock Alert)
ค่าเริ่มต้นคือน้อยกว่า 5 ชิ้นตามโจทย์ ปรับเกณฑ์ได้เอง (3 / 5 / 10 / 20 หรือกรอกเอง) และมีตัวเลขแจ้งเตือนบนเมนูด้านซ้าย

![สินค้าใกล้หมด](docs/screenshots/03-low-stock.png)

### รายละเอียดสินค้า + ประวัติรายตัว
ยอดรับเข้า/จ่ายออกสะสม มูลค่าคงคลัง และไทม์ไลน์ประวัติทั้งหมดของสินค้าชิ้นนั้น (แบ่งหน้า 15 รายการ/หน้า)

![รายละเอียดสินค้า](docs/screenshots/05-product-detail.png)

### ประวัติการเคลื่อนไหวสต็อกทั้งระบบ
ทุกการรับเข้า/จ่ายออกถูกบันทึกพร้อมเหตุผลและวันที่-เวลา กรอง IN / OUT และแบ่งหน้าได้

![ประวัติสต็อก](docs/screenshots/06-transactions.png)

### ฟอร์มเพิ่มสินค้า
ตรวจข้อมูลรายช่องทันที พร้อมพรีวิวข้อมูลและมูลค่าสต็อกตั้งต้นก่อนบันทึก (SKU ซ้ำจะถูกปฏิเสธด้วย HTTP 409)

![เพิ่มสินค้า](docs/screenshots/07-product-form.png)

### หมวดหมู่สินค้า — CRUD ครบวงจร
เพิ่ม / แก้ไข / ลบ (มีหน้าต่างยืนยัน และเตือนเมื่อหมวดหมู่ยังมีสินค้าอยู่) / ดูรายละเอียดพร้อมรายการสินค้าในหมวดนั้น

![หมวดหมู่สินค้า](docs/screenshots/09-categories.png)

### ธีมมืด (Dark mode)
สลับได้จากปุ่มมุมขวาบน ระบบจำค่าที่เลือกไว้ให้

![ธีมมืด](docs/screenshots/08-dashboard-dark.png)

---

## 📑 สารบัญเอกสาร

| เอกสาร | เนื้อหา |
|---|---|
| [ER_DIAGRAM.md](ER_DIAGRAM.md) | แผนภาพ ER, ความสัมพันธ์, เหตุผลการออกแบบ, SQL จริง |
| [API_DOCS.md](API_DOCS.md) | URL / Method / Header / Request Body / Response (success + error) ครบทุก endpoint |
| [DEPLOYMENT.md](DEPLOYMENT.md) | ขั้นตอนทำให้พร้อมใช้งานจริง (CORS, auth, backup, monitoring) |

---

## 🚀 เริ่มใช้งาน (Quick Start)

ต้องมี **Node.js 18 ขึ้นไป**

### 1) Backend (API)

```bash
cd server
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API จะรันที่ **http://localhost:4000** — ทดสอบด้วย http://localhost:4000/api/health

> `npm run seed` เป็นตัวเลือกเสริม ใช้ใส่ข้อมูลตัวอย่าง (4 หมวดหมู่ + 12 สินค้า) เพื่อให้เห็นหน้าจอมีข้อมูลทันที

```bash
npm run seed:history   # (เสริม) จำลองการใช้งานจริงย้อนหลัง 90 วัน — ประวัติรับเข้า/จ่ายออกกว่า 500 รายการ
```

> `seed:history` จะล้างประวัติเดิมแล้วสร้างใหม่ พร้อมคำนวณยอดคงเหลือให้ตรงกับประวัติ และตรวจสอบว่าไม่มีค่าติดลบ — **ใช้สำหรับ dev/demo เท่านั้น**

### 2) Frontend (หน้าเว็บ)

เปิด terminal อีกหน้าต่าง

```bash
cd client
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ **http://localhost:5173**
(dev server ตั้ง proxy `/api` ไปที่ `http://localhost:4000` ไว้แล้ว — ไม่ติดปัญหา CORS)

### 3) รันชุดทดสอบ

```bash
cd server
npm test
```

---

## ✅ ผลการทดสอบ

ใช้ `node --test` (test runner ในตัวของ Node) + `supertest` ยิงเข้า Express app จริง
โดยสร้างไฟล์ **SQLite แยกต่างหาก (`prisma/test.db`)** ที่ล้างใหม่ทุกครั้งก่อนรัน — **ไม่แตะฐานข้อมูลใช้งานจริง (`dev.db`)**

```
SQLite               PostgreSQL
ℹ tests 46           ℹ tests 46
ℹ pass 46            ℹ pass 46
ℹ fail 0             ℹ fail 0
```

ครอบคลุม:

- สร้างสินค้าสำเร็จ / SKU ซ้ำ (409) / ข้อมูลไม่ครบ (400) / ค่าติดลบ / categoryId ไม่มีจริง
- ปรับสต็อกรับเข้า (+) และจ่ายออก (−) พร้อมตรวจ log ประเภท `IN` / `OUT`
- **ตัดสต็อกเกินจำนวน → 400 และยืนยันว่าสต็อกไม่เปลี่ยน + ไม่มี transaction ถูกบันทึก**
- ตัดพอดีเหลือ 0 ต้องผ่าน, ปรับหลายครั้งติดกันยอดสะสมต้องถูกต้อง
- low-stock: ค่าเริ่มต้น < 5, กำหนด threshold เอง, การเรียงลำดับ, threshold ติดลบ
- list / filter หมวดหมู่ / ค้นหา / รายละเอียด + ประวัติ / 404
- หมวดหมู่: สร้าง, ชื่อซ้ำ (409), ไม่ระบุชื่อ (400)
- routing: `/api/products/low-stock` ต้องไม่ถูกจับเป็น `/api/products/:id`
- **CRUD หมวดหมู่ครบวงจร** — อ่านรายละเอียด, แก้ไข, ชื่อซ้ำ (409), ลบหมวดว่าง, ลบหมวดที่มีสินค้า (409), ลบแบบ force แล้วสินค้าต้องไม่หาย
- **ค้นหาสินค้า** — จากชื่อไทย/อังกฤษ, จาก SKU เต็มและบางส่วน, ไม่สนตัวพิมพ์เล็ก/ใหญ่, ค้นไม่เจอต้องไม่ error

---

## 🗂️ โครงสร้างฐานข้อมูล

```mermaid
erDiagram
    CATEGORIES ||--o{ PRODUCTS : "has many"
    PRODUCTS   ||--o{ STOCK_TRANSACTIONS : "has many"

    CATEGORIES {
        int      id          PK
        string   name        UK
        string   description
        datetime createdAt
    }

    PRODUCTS {
        int      id            PK
        string   name
        string   sku           UK
        int      categoryId    FK
        float    costPrice
        int      stockQuantity
        datetime createdAt
        datetime updatedAt
    }

    STOCK_TRANSACTIONS {
        int      id        PK
        int      productId FK
        string   type
        int      quantity
        string   reason
        datetime createdAt
    }
```

รายละเอียดเหตุผลการออกแบบทั้งหมดอยู่ใน **[ER_DIAGRAM.md](ER_DIAGRAM.md)**

**หัวใจของการออกแบบ:** `stockQuantity` ถูกเก็บไว้ที่ตาราง `Product` เพื่อให้ query เร็ว
แต่การอัปเดตยอด **ต้องเกิดคู่กับการบันทึก `StockTransaction` ภายใน database transaction เดียวกันเสมอ**
ทำให้ยอดคงเหลือกับประวัติไม่มีทางไม่ตรงกัน

---

## 🔌 API Endpoints

| # | Method | URL | หน้าที่ |
|---|---|---|---|
| 1 | `POST` | `/api/products` | สร้างสินค้าใหม่ (กัน SKU ซ้ำ → 409) |
| 2 | `PATCH` | `/api/stock/adjust` | ปรับสต็อก +/− กันติดลบ + log ทุกครั้ง |
| 3 | `GET` | `/api/products/low-stock` | สินค้าคงเหลือน้อยกว่าเกณฑ์ (ค่าเริ่มต้น < 5) |
| 4 | `GET` | `/api/products` | รายการสินค้า + ค้นหา + กรอง + แบ่งหน้า |
| 5 | `GET` | `/api/products/:id` | รายละเอียด + ประวัติการเคลื่อนไหว |
| 6 | `GET` | `/api/stock/transactions` | ประวัติทั้งระบบ (กรอง `productId`, `type`) |
| 7 | `GET` / `POST` | `/api/categories` | ดู/สร้างหมวดหมู่ |
| 8 | `GET` / `PATCH` / `DELETE` | `/api/categories/:id` | ดูรายละเอียด / แก้ไข / ลบหมวดหมู่ |
| 9 | `GET` | `/api/health` | ตรวจสอบสถานะ API |

ตัวอย่าง Request/Response ครบทุกกรณี (success + error) อยู่ใน **[API_DOCS.md](API_DOCS.md)**

### ตัวอย่างเร็ว

```bash
# สร้างสินค้า
curl -X POST http://localhost:4000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Notebook Acer A14\",\"sku\":\"ACER-A14-001\",\"costPrice\":15900,\"stockQuantity\":10}"

# ตัดสต็อก 5 ชิ้น
curl -X PATCH http://localhost:4000/api/stock/adjust -H "Content-Type: application/json" -d "{\"productId\":1,\"quantity\":-5,\"reason\":\"ขายหน้าร้าน\"}"

# สินค้าใกล้หมด
curl "http://localhost:4000/api/products/low-stock?threshold=5"
```

---

## 🎨 หน้าจอการใช้งาน (UI/UX)

ออกแบบให้ "คนคุมสต็อกจริง" ใช้ได้โดยไม่ต้องอบรม

> ดูภาพหน้าจอทุกหน้าได้ที่หัวข้อ [ตัวอย่างหน้าจอระบบ](#-ตัวอย่างหน้าจอระบบ) ด้านบน

| หน้า | เส้นทาง | จุดเด่น |
|---|---|---|
| ภาพรวม | `/dashboard` | เห็นสถานะคลังทั้งหมดใน 3 วินาที: จำนวน SKU, ชิ้นรวม, ใกล้หมด, หมดสต็อก, มูลค่าคงคลัง + ความเคลื่อนไหวล่าสุด |
| รายการสินค้า | `/products` | **ค้นหาจากชื่อสินค้าและรหัสสินค้า (SKU)** แบบ debounce, กรองหมวดหมู่, แบ่งหน้า, แถบระดับสต็อก, ปุ่มปรับสต็อกในแถว |
| เพิ่มสินค้า | `/products/new` | validate ทันทีรายช่อง + พรีวิวข้อมูลและมูลค่าก่อนบันทึก |
| สินค้าใกล้หมด | `/low-stock` | ปรับเกณฑ์ได้ (3/5/10/20 หรือกรอกเอง) + badge บนเมนูบอกจำนวนที่ต้องเติม |
| รายละเอียดสินค้า | `/products/:id` | ยอดรับเข้า/จ่ายออกสะสม + ไทม์ไลน์ประวัติทั้งหมด |
| ประวัติสต็อก | `/transactions` | ดูทุกความเคลื่อนไหว กรอง IN / OUT + แบ่งหน้า (20 รายการ/หน้า) |
| หมวดหมู่ | `/categories` | **CRUD ครบ** — เพิ่ม / แก้ไข / ลบ (มีหน้าต่างยืนยัน) / ดูรายละเอียดพร้อมรายการสินค้าในหมวด |

**หลักการ UX ที่ใช้**

- **ไม่ให้ผู้ใช้คิดเรื่องเครื่องหมายลบ** — ฟอร์มปรับสต็อกให้เลือก "รับเข้า / จ่ายออก" แล้วกรอกจำนวนบวกเสมอ ระบบใส่เครื่องหมายให้
- **เห็นผลก่อนกดยืนยัน** — พรีวิว `คงเหลือปัจจุบัน → หลังปรับ` และเตือนสีแดงทันทีถ้าจะติดลบ (กันตั้งแต่ฝั่ง UI ก่อนถึง API)
- **ปุ่มเหตุผลสำเร็จรูป** — เช่น "รับสินค้าจาก PO", "สินค้าชำรุด" ลดการพิมพ์ซ้ำและทำให้ประวัติสม่ำเสมอ
- **ไอคอน SVG ทั้งระบบ (Lucide)** — คมชัดทุกความละเอียด สีตามธีมอัตโนมัติ bundle มากับแอป ไม่ต้องโหลดจาก CDN
- **แบ่งหน้าแบบเลือกเลขหน้าได้** — ทุกหน้าที่มีรายการยาว (สินค้า / ประวัติสต็อก / ใกล้หมด / ประวัติรายสินค้า) กดเลขหน้า, ก่อนหน้า-ถัดไป และพิมพ์เลขกระโดดไปหน้าที่ต้องการได้
- **สื่อสารด้วยสี 3 ระดับ** — ปกติ (เขียว) / ใกล้หมด (เหลือง) / หมดสต็อก (แดง) พร้อมไอคอนกำกับ ไม่พึ่งสีอย่างเดียว
- **feedback ทุก action** — toast แจ้งผลสำเร็จ/ผิดพลาด พร้อมข้อความจาก API ตรงๆ
- **สถานะครบทุกแบบ** — loading (skeleton), empty state ที่บอกว่าให้ทำอะไรต่อ, error state ที่กดลองใหม่ได้
- **บอกเมื่อ API ล่ม** — แถบสถานะบน sidebar + คำแนะนำวิธีเปิด backend
- **ใช้ได้ทุกจอ + ธีมมืด/สว่าง** — responsive ตั้งแต่มือถือถึงเดสก์ท็อป, semantic HTML + `aria-*` และ `data-role` สำหรับต่อยอด

---

## 🗃️ โครงสร้างโปรเจกต์

```
inventory-system/
├── server/                    # Backend API
│   ├── index.js               # Express app + ทุก endpoint (export app ให้ test ใช้)
│   ├── server.js              # entry point (listen)
│   ├── prisma/
│   │   ├── schema.prisma      # นิยาม 3 ตาราง (SQLite — dev/test)
│   ├── postgres/          # schema + migration สำหรับ PostgreSQL (production)
│   │   ├── seed.js            # ข้อมูลตัวอย่าง
│   │   ├── migrations/        # SQL migration ของ SQLite
│   └── seed-history.js    # จำลองการใช้งานย้อนหลัง 90 วัน
│   └── tests/api.test.js      # ชุดทดสอบ 46 เคส (รันได้ทั้ง SQLite และ PostgreSQL)
│
├── client/                    # Frontend (React + Vite)
│   └── src/
│       ├── api/inventoryApi.js    # axios instance + ฟังก์ชันเรียก API ทั้งหมด
│       ├── components/            # Toast, ProductTable, StockAdjustModal, ui
│       ├── pages/                 # Dashboard, ProductList, ProductForm, ProductDetail,
│       │                          # LowStock, Transactions, Categories
│       ├── styles.css             # design system (สี/ระยะ/เงา เป็น CSS variables)
│       └── App.jsx                # layout + routing
│
├── ER_DIAGRAM.md
├── API_DOCS.md
└── README.md
```

---

## ⚙️ การตั้งค่า

`server/.env` (ดูตัวอย่างที่ `server/.env.example`)

```env
DATABASE_URL="file:./dev.db"
PORT=4000
```

ถ้าต้องการให้ frontend ยิงไป backend คนละเครื่อง สร้าง `client/.env`

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## 🧠 หมายเหตุทางเทคนิค

- **กันสต็อกติดลบแบบกัน race condition** — การอ่านยอดปัจจุบันและการเขียนอยู่ใน `prisma.$transaction` เดียวกัน สองคำสั่งที่ตัดสต็อกพร้อมกันจึงไม่ทำให้ยอดติดลบ
- **ลำดับ route สำคัญ** — `/api/products/low-stock` ถูกประกาศก่อน `/api/products/:id` ไม่งั้น Express จะจับ `low-stock` เป็น `id` (มีเทสคุมกรณีนี้ไว้)
- **`quantity` ในตาราง transaction เก็บเป็นค่าบวกเสมอ** ทิศทางดูจาก `type` (`IN`/`OUT`) ทำให้รวมยอดรับ/ยอดจ่ายได้ตรงๆ
- **error กลางระบบ** — ทุก endpoint คืน `{ error: "..." }` รูปแบบเดียวกัน ทำให้ frontend แสดงผลได้ด้วย logic ชุดเดียว
