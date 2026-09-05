# 📘 API Documentation — Inventory Management System

**Base URL (development):** `http://localhost:4000`
**รูปแบบข้อมูล:** JSON (UTF-8)
**Authentication:** ไม่มี (ระบบภายใน / dev environment)

### Header ที่จำเป็น

| Endpoint | Header |
|---|---|
| ทุก request ที่มี **body** (`POST`, `PATCH`) | `Content-Type: application/json` |
| request ที่ไม่มี body (`GET`) | ไม่ต้องระบุ header เพิ่ม |

### สรุป Endpoint ทั้งหมด

| # | Method | URL | หน้าที่ |
|---|---|---|---|
| 1 | `POST` | `/api/products` | สร้างสินค้าใหม่ |
| 2 | `PATCH` | `/api/stock/adjust` | ปรับสต็อก (+/−) พร้อมบันทึกประวัติ |
| 3 | `GET` | `/api/products/low-stock` | สินค้าที่ใกล้หมด (ค่าเริ่มต้น < 5) |
| 4 | `GET` | `/api/products` | รายการสินค้า (ค้นหา / กรอง / แบ่งหน้า) |
| 5 | `GET` | `/api/products/:id` | รายละเอียดสินค้า + ประวัติทั้งหมด |
| 6 | `GET` | `/api/stock/transactions` | ประวัติการเคลื่อนไหวทั้งระบบ |
| 7 | `GET` | `/api/categories` | รายการหมวดหมู่ |
| 8 | `POST` | `/api/categories` | สร้างหมวดหมู่ |
| 9 | `GET` | `/api/categories/:id` | รายละเอียดหมวดหมู่ + สินค้าในหมวด |
| 10 | `PATCH` | `/api/categories/:id` | แก้ไขหมวดหมู่ |
| 11 | `DELETE` | `/api/categories/:id` | ลบหมวดหมู่ (กันลบเมื่อยังมีสินค้า) |
| 12 | `GET` | `/api/health` | ตรวจสอบสถานะ API |

### HTTP Status Codes ที่ระบบใช้

| Code | ความหมาย | ใช้เมื่อ |
|---|---|---|
| `200 OK` | สำเร็จ | GET / PATCH สำเร็จ |
| `201 Created` | สร้างสำเร็จ | POST สร้างข้อมูลใหม่ |
| `400 Bad Request` | ข้อมูลไม่ถูกต้อง | ฟิลด์ไม่ครบ, ชนิดผิด, **สต็อกไม่พอ** |
| `404 Not Found` | ไม่พบข้อมูล | ไม่พบสินค้า / endpoint ไม่มีอยู่ |
| `409 Conflict` | ข้อมูลซ้ำ | SKU ซ้ำ / ชื่อหมวดหมู่ซ้ำ |
| `500 Internal Server Error` | ระบบผิดพลาด | ข้อผิดพลาดที่ไม่คาดคิด |

รูปแบบ error ทุกตัวเหมือนกันคือ `{ "error": "ข้อความอธิบายเป็นภาษาไทย" }`

---

## 1. POST /api/products

สร้างสินค้าใหม่เข้าระบบ ถ้าระบุ `stockQuantity > 0` ระบบจะบันทึกประวัติรับเข้า (`IN`) ให้อัตโนมัติ

- **Method:** `POST`
- **URL:** `/api/products`
- **Headers:** `Content-Type: application/json`

**Request Body**

| ฟิลด์ | ชนิด | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `name` | string | ✅ | ชื่อสินค้า |
| `sku` | string | ✅ | รหัสสินค้า (ห้ามซ้ำ) |
| `costPrice` | number | ✅ | ราคาทุนต่อชิ้น (≥ 0) |
| `categoryId` | int | ❌ | รหัสหมวดหมู่ (ต้องมีอยู่จริง) |
| `stockQuantity` | int | ❌ | สต็อกตั้งต้น (≥ 0, ค่าเริ่มต้น 0) |

```json
{
  "name": "Notebook Acer A14",
  "sku": "ACER-A14-001",
  "categoryId": 1,
  "costPrice": 15900,
  "stockQuantity": 10
}
```

**Response 201 (Success)**

```json
{
  "id": 1,
  "name": "Notebook Acer A14",
  "sku": "ACER-A14-001",
  "categoryId": 1,
  "costPrice": 15900,
  "stockQuantity": 10,
  "createdAt": "2026-09-05T06:12:44.831Z",
  "updatedAt": "2026-09-05T06:12:44.831Z",
  "category": {
    "id": 1,
    "name": "คอมพิวเตอร์ & โน้ตบุ๊ก",
    "description": "เครื่องคอมพิวเตอร์และโน้ตบุ๊กทุกรุ่น",
    "createdAt": "2026-09-05T06:10:02.114Z"
  }
}
```

**Response 400 (ข้อมูลไม่ครบ)**

```json
{ "error": "name, sku, costPrice จำเป็นต้องระบุ" }
```

**Response 400 (ค่าไม่ถูกต้อง)**

```json
{ "error": "costPrice ต้องเป็นตัวเลขและมีค่ามากกว่าหรือเท่ากับ 0" }
```
```json
{ "error": "stockQuantity ต้องเป็นจำนวนเต็มและห้ามติดลบ" }
```
```json
{ "error": "ไม่พบหมวดหมู่ (categoryId) ที่ระบุ" }
```

**Response 409 (SKU ซ้ำ)**

```json
{ "error": "SKU นี้มีอยู่แล้วในระบบ" }
```

**ตัวอย่าง cURL**

```bash
curl -X POST http://localhost:4000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Notebook Acer A14\",\"sku\":\"ACER-A14-001\",\"costPrice\":15900,\"stockQuantity\":10}"
```

---

## 2. PATCH /api/stock/adjust

ปรับจำนวนสต็อกของสินค้า **พร้อมบันทึกลง Stock Transaction ทุกครั้ง**

- **Method:** `PATCH`
- **URL:** `/api/stock/adjust`
- **Headers:** `Content-Type: application/json`

**Logic สำคัญ**
1. `quantity` เป็นบวก = รับเข้า (`IN`), เป็นลบ = จ่ายออก (`OUT`) และห้ามเป็น 0
2. ถ้า `stockQuantity + quantity < 0` → ปฏิเสธด้วย **400** และ **ไม่เขียนข้อมูลใดๆ ลงฐานข้อมูล**
3. การอัปเดตยอด + การบันทึกประวัติ อยู่ใน **database transaction เดียวกัน** (สำเร็จพร้อมกันหรือ rollback ทั้งคู่)

**Request Body**

| ฟิลด์ | ชนิด | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `productId` | int | ✅ | รหัสสินค้าที่ต้องการปรับ |
| `quantity` | int | ✅ | จำนวนที่ปรับ เช่น `10` หรือ `-5` (ห้ามเป็น 0) |
| `reason` | string | ✅ | เหตุผล เช่น `"รับสินค้าจาก PO#001"` |

```json
{
  "productId": 1,
  "quantity": -5,
  "reason": "ขายหน้าร้าน"
}
```

**Response 200 (Success)**

```json
{
  "id": 1,
  "name": "Notebook Acer A14",
  "sku": "ACER-A14-001",
  "categoryId": 1,
  "costPrice": 15900,
  "stockQuantity": 5,
  "createdAt": "2026-09-05T06:12:44.831Z",
  "updatedAt": "2026-09-05T06:20:11.002Z",
  "category": { "id": 1, "name": "คอมพิวเตอร์ & โน้ตบุ๊ก", "description": null, "createdAt": "2026-09-05T06:10:02.114Z" },
  "lastTransaction": {
    "id": 7,
    "productId": 1,
    "type": "OUT",
    "quantity": 5,
    "reason": "ขายหน้าร้าน",
    "createdAt": "2026-09-05T06:20:11.002Z"
  }
}
```

**Response 400 (สต็อกไม่เพียงพอ — ห้ามติดลบ)**

```json
{
  "error": "สต็อกไม่เพียงพอ ไม่สามารถปรับเป็นค่าติดลบได้",
  "currentStock": 5,
  "requested": -50
}
```

**Response 400 (ข้อมูลไม่ครบ / ไม่ถูกต้อง)**

```json
{ "error": "productId, quantity, reason จำเป็นต้องระบุ" }
```
```json
{ "error": "quantity ต้องเป็นจำนวนเต็มที่ไม่เท่ากับ 0 (บวก = รับเข้า, ลบ = จ่ายออก)" }
```

**Response 404 (ไม่พบสินค้า)**

```json
{ "error": "ไม่พบสินค้า" }
```

**ตัวอย่าง cURL**

```bash
curl -X PATCH http://localhost:4000/api/stock/adjust -H "Content-Type: application/json" -d "{\"productId\":1,\"quantity\":-5,\"reason\":\"ขายหน้าร้าน\"}"
```

---

## 3. GET /api/products/low-stock

ดึงรายการสินค้าที่มีจำนวนคงเหลือ **น้อยกว่า** เกณฑ์ที่กำหนด (Low stock alert)

- **Method:** `GET`
- **URL:** `/api/products/low-stock`
- **Headers:** ไม่ต้องระบุ

**Query Parameters**

| พารามิเตอร์ | ชนิด | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| `threshold` | number | `5` | คืนเฉพาะสินค้าที่ `stockQuantity < threshold` |

**Response 200 (Success)** — เรียงจากสต็อกน้อยไปมาก

```json
{
  "threshold": 5,
  "count": 2,
  "data": [
    {
      "id": 6,
      "name": "จอมอนิเตอร์ Dell 24\" IPS",
      "sku": "DEL-P2422H",
      "categoryId": 2,
      "costPrice": 5490,
      "stockQuantity": 0,
      "createdAt": "2026-09-05T06:10:02.500Z",
      "updatedAt": "2026-09-05T06:10:02.500Z",
      "category": { "id": 2, "name": "อุปกรณ์ต่อพ่วง", "description": null, "createdAt": "2026-09-05T06:10:02.114Z" }
    },
    {
      "id": 3,
      "name": "MacBook Air M3 13\"",
      "sku": "APL-MBA-M3",
      "categoryId": 1,
      "costPrice": 38900,
      "stockQuantity": 2,
      "createdAt": "2026-09-05T06:10:02.400Z",
      "updatedAt": "2026-09-05T06:10:02.400Z",
      "category": { "id": 1, "name": "คอมพิวเตอร์ & โน้ตบุ๊ก", "description": null, "createdAt": "2026-09-05T06:10:02.114Z" }
    }
  ]
}
```

**Response 400 (threshold ไม่ถูกต้อง)**

```json
{ "error": "threshold ต้องเป็นตัวเลขและมีค่ามากกว่าหรือเท่ากับ 0" }
```

**ตัวอย่าง cURL**

```bash
curl "http://localhost:4000/api/products/low-stock?threshold=10"
```

---

## 4. GET /api/products

ดึงรายการสินค้าทั้งหมด รองรับการค้นหา กรองตามหมวดหมู่ และแบ่งหน้า

- **Method:** `GET`
- **URL:** `/api/products`

**Query Parameters**

| พารามิเตอร์ | ชนิด | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| `q` | string | — | ค้นหาจากชื่อสินค้า หรือ SKU |
| `categoryId` | int | — | กรองตามหมวดหมู่ |
| `page` | int | `1` | หน้าที่ต้องการ |
| `limit` | int | `20` | จำนวนต่อหน้า (สูงสุด 100) |

**Response 200 (Success)**

```json
{
  "page": 1,
  "limit": 20,
  "total": 12,
  "totalPages": 1,
  "data": [
    {
      "id": 12,
      "name": "สายชาร์จ USB-C 100W",
      "sku": "CBL-USBC-100",
      "categoryId": 4,
      "costPrice": 390,
      "stockQuantity": 32,
      "createdAt": "2026-09-05T06:10:03.000Z",
      "updatedAt": "2026-09-05T06:10:03.000Z",
      "category": { "id": 4, "name": "อะไหล่ & อุปกรณ์เสริม", "description": null, "createdAt": "2026-09-05T06:10:02.114Z" }
    }
  ]
}
```

**Response 400 (พารามิเตอร์ผิด)**

```json
{ "error": "categoryId ต้องเป็นจำนวนเต็ม" }
```

**ตัวอย่าง cURL**

```bash
curl "http://localhost:4000/api/products?q=acer&page=1&limit=10"
```

---

## 5. GET /api/products/:id

ดูรายละเอียดสินค้าหนึ่งรายการ พร้อม **ประวัติการเคลื่อนไหวทั้งหมด** (ใหม่สุดอยู่บน)

- **Method:** `GET`
- **URL:** `/api/products/1`

**Response 200 (Success)**

```json
{
  "id": 1,
  "name": "Notebook Acer A14",
  "sku": "ACER-A14-001",
  "categoryId": 1,
  "costPrice": 15900,
  "stockQuantity": 5,
  "createdAt": "2026-09-05T06:12:44.831Z",
  "updatedAt": "2026-09-05T06:20:11.002Z",
  "category": { "id": 1, "name": "คอมพิวเตอร์ & โน้ตบุ๊ก", "description": null, "createdAt": "2026-09-05T06:10:02.114Z" },
  "transactions": [
    { "id": 7, "productId": 1, "type": "OUT", "quantity": 5, "reason": "ขายหน้าร้าน", "createdAt": "2026-09-05T06:20:11.002Z" },
    { "id": 1, "productId": 1, "type": "IN", "quantity": 10, "reason": "สต็อกตั้งต้นตอนสร้างสินค้า", "createdAt": "2026-09-05T06:12:44.831Z" }
  ]
}
```

**Response 404 (ไม่พบสินค้า)**

```json
{ "error": "ไม่พบสินค้า" }
```

---

## 6. GET /api/stock/transactions

ดูประวัติการเคลื่อนไหวสต็อกทั้งระบบ (ใหม่สุดอยู่บน)

- **Method:** `GET`
- **URL:** `/api/stock/transactions`

**Query Parameters**

| พารามิเตอร์ | ชนิด | คำอธิบาย |
|---|---|---|
| `productId` | int | กรองเฉพาะสินค้ารายการเดียว |
| `type` | string | `IN` หรือ `OUT` |
| `page` | int | หน้าที่ต้องการ (ค่าเริ่มต้น `1`) |
| `limit` | int | จำนวนต่อหน้า (ค่าเริ่มต้น `20`, สูงสุด 200) |

**Response 200 (Success)**

```json
{
  "count": 2,
  "total": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "data": [
    {
      "id": 7,
      "productId": 1,
      "type": "OUT",
      "quantity": 5,
      "reason": "ขายหน้าร้าน",
      "createdAt": "2026-09-05T06:20:11.002Z",
      "product": { "id": 1, "name": "Notebook Acer A14", "sku": "ACER-A14-001" }
    },
    {
      "id": 1,
      "productId": 1,
      "type": "IN",
      "quantity": 10,
      "reason": "สต็อกตั้งต้นตอนสร้างสินค้า",
      "createdAt": "2026-09-05T06:12:44.831Z",
      "product": { "id": 1, "name": "Notebook Acer A14", "sku": "ACER-A14-001" }
    }
  ]
}
```

**Response 400 (type ไม่ถูกต้อง)**

```json
{ "error": "type ต้องเป็น IN หรือ OUT เท่านั้น" }
```

**ตัวอย่าง cURL**

```bash
curl "http://localhost:4000/api/stock/transactions?type=OUT&page=1&limit=20"
```

---

## 7. GET /api/categories

ดึงรายการหมวดหมู่ทั้งหมด พร้อมจำนวนสินค้าในแต่ละหมวด

- **Method:** `GET`
- **URL:** `/api/categories`

**Response 200 (Success)**

```json
{
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "คอมพิวเตอร์ & โน้ตบุ๊ก",
      "description": "เครื่องคอมพิวเตอร์และโน้ตบุ๊กทุกรุ่น",
      "createdAt": "2026-09-05T06:10:02.114Z",
      "_count": { "products": 3 }
    },
    {
      "id": 2,
      "name": "อุปกรณ์ต่อพ่วง",
      "description": "เมาส์ คีย์บอร์ด จอภาพ หูฟัง",
      "createdAt": "2026-09-05T06:10:02.140Z",
      "_count": { "products": 4 }
    }
  ]
}
```

---

## 8. POST /api/categories

สร้างหมวดหมู่ใหม่

- **Method:** `POST`
- **URL:** `/api/categories`
- **Headers:** `Content-Type: application/json`

**Request Body**

| ฟิลด์ | ชนิด | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `name` | string | ✅ | ชื่อหมวดหมู่ (ห้ามซ้ำ) |
| `description` | string | ❌ | คำอธิบาย |

```json
{
  "name": "Office Supply",
  "description": "ของใช้ในสำนักงาน"
}
```

**Response 201 (Success)**

```json
{
  "id": 3,
  "name": "Office Supply",
  "description": "ของใช้ในสำนักงาน",
  "createdAt": "2026-09-05T06:31:00.220Z"
}
```

**Response 400 (ไม่ระบุชื่อ)**

```json
{ "error": "name จำเป็นต้องระบุ" }
```

**Response 409 (ชื่อซ้ำ)**

```json
{ "error": "ชื่อหมวดหมู่นี้มีอยู่แล้วในระบบ" }
```

---

## 9. GET /api/categories/:id

ดูรายละเอียดหมวดหมู่ พร้อมรายการสินค้าทั้งหมดในหมวดนั้น

- **Method:** `GET`
- **URL:** `/api/categories/1`

**Response 200 (Success)**

```json
{
  "id": 1,
  "name": "คอมพิวเตอร์ & โน้ตบุ๊ก",
  "description": "เครื่องคอมพิวเตอร์และโน้ตบุ๊กทุกรุ่น",
  "createdAt": "2026-09-05T06:10:02.114Z",
  "products": [
    {
      "id": 3,
      "name": "MacBook Air M3 13\"",
      "sku": "APL-MBA-M3",
      "categoryId": 1,
      "costPrice": 38900,
      "stockQuantity": 4,
      "createdAt": "2026-09-05T06:10:02.400Z",
      "updatedAt": "2026-09-05T06:10:02.400Z"
    }
  ],
  "_count": { "products": 3 }
}
```

**Response 404 (ไม่พบหมวดหมู่)**

```json
{ "error": "ไม่พบหมวดหมู่" }
```

---

## 10. PATCH /api/categories/:id

แก้ไขชื่อหรือคำอธิบายหมวดหมู่ (ส่งเฉพาะฟิลด์ที่ต้องการแก้ก็ได้)

- **Method:** `PATCH`
- **URL:** `/api/categories/1`
- **Headers:** `Content-Type: application/json`

**Request Body**

| ฟิลด์ | ชนิด | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `name` | string | ❌* | ชื่อใหม่ (ห้ามซ้ำ, ห้ามว่าง) |
| `description` | string \| null | ❌* | คำอธิบายใหม่ (ส่ง `null` เพื่อล้างค่า) |

\* ต้องส่งอย่างน้อย 1 ฟิลด์

```json
{
  "name": "IT Equipment",
  "description": "อุปกรณ์ไอทีทั้งหมด"
}
```

**Response 200 (Success)**

```json
{
  "id": 1,
  "name": "IT Equipment",
  "description": "อุปกรณ์ไอทีทั้งหมด",
  "createdAt": "2026-09-05T06:10:02.114Z"
}
```

**Response 400 (ไม่ส่งฟิลด์ / ชื่อว่าง)**

```json
{ "error": "ต้องระบุอย่างน้อย name หรือ description" }
```
```json
{ "error": "name ห้ามเป็นค่าว่าง" }
```

**Response 404 / 409**

```json
{ "error": "ไม่พบหมวดหมู่" }
```
```json
{ "error": "ชื่อหมวดหมู่นี้มีอยู่แล้วในระบบ" }
```

---

## 11. DELETE /api/categories/:id

ลบหมวดหมู่ — **ถ้ายังมีสินค้าอยู่ในหมวดจะถูกปฏิเสธ (409) เพื่อกันลบพลาด**

- **Method:** `DELETE`
- **URL:** `/api/categories/1`

**Query Parameters**

| พารามิเตอร์ | ชนิด | คำอธิบาย |
|---|---|---|
| `force` | boolean | ส่ง `true` เพื่อยืนยันลบทั้งที่ยังมีสินค้า — **สินค้าจะไม่ถูกลบ** แต่ถูกย้ายไปเป็น "ไม่ระบุหมวดหมู่" (`categoryId = null`) |

**Response 200 (Success)**

```json
{
  "message": "ลบหมวดหมู่เรียบร้อย",
  "deletedId": 1,
  "detachedProducts": 3
}
```

**Response 409 (ยังมีสินค้าอยู่ในหมวดหมู่)**

```json
{
  "error": "ลบไม่ได้ — ยังมีสินค้า 3 รายการอยู่ในหมวดหมู่นี้",
  "productCount": 3,
  "hint": "ส่ง ?force=true เพื่อลบและย้ายสินค้าเหล่านี้ไปเป็น \"ไม่ระบุหมวดหมู่\""
}
```

**Response 404 (ไม่พบหมวดหมู่)**

```json
{ "error": "ไม่พบหมวดหมู่" }
```

**ตัวอย่าง cURL**

```bash
curl -X DELETE "http://localhost:4000/api/categories/1?force=true"
```

---

## 12. GET /api/health

ตรวจสอบว่า API พร้อมใช้งาน (ใช้โดยหน้าเว็บเพื่อแสดงสถานะการเชื่อมต่อ)

- **Method:** `GET`
- **URL:** `/api/health`

**Response 200 (Success)**

```json
{
  "status": "ok",
  "service": "inventory-api",
  "timestamp": "2026-09-05T06:40:12.554Z"
}
```

---

## ภาคผนวก — Endpoint ที่ไม่มีอยู่จริง

ทุก path ที่ไม่ตรงกับตารางด้านบนจะได้รับ **404** ในรูปแบบ JSON เช่นกัน

```json
{ "error": "ไม่พบ endpoint: GET /api/unknown" }
```
