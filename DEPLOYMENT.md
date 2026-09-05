# 🚢 จาก Dev Mode → พร้อมใช้งานจริง (Production Readiness)

> **สถานะปัจจุบัน: ระบบนี้ตั้งค่าเป็น _development mode_ ทั้งหมด** ยังไม่เหมาะกับการเปิดใช้งานจริง
> เอกสารนี้บอกว่า "ตอนนี้เป็นอะไร" และ "ต้องทำอะไรบ้างถึงจะขึ้น production ได้"

---

## 1. ตอนนี้เป็น Dev Mode ยังไงบ้าง

| หัวข้อ | สถานะตอนนี้ (dev) | ทำไมยังใช้จริงไม่ได้ |
|---|---|---|
| **ฐานข้อมูล** | **SQLite** — เป็นไฟล์เดียว `server/prisma/dev.db` | เขียนได้ทีละ connection, ไม่มี replication/backup, scale หลาย instance ไม่ได้ |
| **ไฟล์ DB** | อยู่ในเครื่อง และถูก `.gitignore` ไว้ | ถ้า deploy ขึ้น container ที่ไม่มี volume ข้อมูลหายทุกครั้งที่ deploy |
| **ข้อมูลในระบบ** | เป็น **ข้อมูล seed ตัวอย่าง** (4 หมวดหมู่, 12 สินค้า, ประวัติจำลอง) | ไม่ใช่ข้อมูลจริง ต้องล้างก่อนใช้งานจริง |
| **Migration** | ใช้ `prisma migrate dev` (สร้าง migration ใหม่ + reset ได้) | คำสั่งนี้ **ห้ามใช้บน production** เพราะอาจลบข้อมูล |
| **CORS** | `app.use(cors())` = อนุญาตทุก origin | ใครก็ยิง API ได้จากทุกเว็บ |
| **Authentication** | **ไม่มีเลย** | ใครเข้าถึง URL ได้ ก็แก้สต็อกได้ |
| **Rate limiting** | ไม่มี | เสี่ยงถูกยิงถล่ม / abuse |
| **HTTP headers** | ไม่มี helmet | ขาด security headers พื้นฐาน |
| **Logging** | `console.log` / `console.error` | ไม่มี request log, ไม่มี log level, ตามปัญหาย้อนหลังยาก |
| **Error handling** | คืน `500 Internal server error` และ log ลง console | ไม่มีระบบแจ้งเตือน (Sentry ฯลฯ) |
| **Frontend** | รันด้วย `vite` dev server (port 5173) + proxy ไป 4000 | dev server ไม่ใช่ web server สำหรับ production |
| **Process** | `node server.js` ธรรมดา | ถ้า process ตาย ไม่มีอะไรปลุกขึ้นมาใหม่ |
| **Backup** | ไม่มี | ข้อมูลหายคือหายถาวร |

---

## 2. เช็กลิสต์ก่อนขึ้นจริง

- [ ] ย้ายจาก SQLite → **PostgreSQL** (หรือ MySQL)
- [ ] เปลี่ยนไปใช้ `prisma migrate deploy`
- [ ] ล้างข้อมูล seed ตัวอย่างออก
- [ ] จำกัด CORS ให้เหลือเฉพาะโดเมนหน้าเว็บจริง
- [ ] เพิ่ม **Authentication** (อย่างน้อย API key หรือ JWT)
- [ ] เพิ่ม `helmet` + `express-rate-limit`
- [ ] เพิ่ม request logging (`morgan` / `pino`)
- [ ] build frontend เป็นไฟล์ static แล้ว serve ด้วย web server จริง
- [ ] ตั้ง process manager (PM2 / systemd / container restart policy)
- [ ] ตั้ง backup ฐานข้อมูลอัตโนมัติ
- [ ] เปิด HTTPS
- [ ] ตั้ง health check + monitoring

---

## 3. ขั้นตอนทำจริง (ทีละข้อ)

### 3.1 เปลี่ยนฐานข้อมูลเป็น PostgreSQL

แก้ `server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"   // เดิม: "sqlite"
  url      = env("DATABASE_URL")
}
```

ตั้งค่า `DATABASE_URL` ใหม่ (ห้าม commit ไฟล์ `.env` ขึ้น git)

```env
DATABASE_URL="postgresql://user:password@db-host:5432/inventory?schema=public&connection_limit=10"
```

จากนั้นสร้าง migration ชุดใหม่ (migration เดิมเป็นไวยากรณ์ SQLite ใช้กับ Postgres ไม่ได้)

```bash
rm -rf server/prisma/migrations
cd server && npx prisma migrate dev --name init_postgres
```

> **ข้อดีที่ได้ทันที:** ย้ายไป Postgres แล้ว การกันสต็อกติดลบจะแข็งแรงขึ้นอีกขั้น
> เพราะ `prisma.$transaction` จะทำงานบน MVCC จริง รองรับหลาย instance พร้อมกันได้
> (โค้ด API **ไม่ต้องแก้เลย** เพราะ logic ทั้งหมดอยู่ใน transaction อยู่แล้ว)

**แนะนำเพิ่ม (Postgres รองรับ):** ใส่ constraint กันสต็อกติดลบที่ชั้น DB เป็นด่านสุดท้าย

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK ("stockQuantity" >= 0);
```

### 3.2 Migration บน production

**ห้ามใช้** `prisma migrate dev` บน production เด็ดขาด ให้ใช้:

```bash
npx prisma migrate deploy
```

เพิ่ม script ไว้แล้วใน `server/package.json`:

```bash
npm run migrate:deploy   # apply migration ที่ commit ไว้ ไม่สร้างใหม่ ไม่ reset
npm start                # รันเซิร์ฟเวอร์แบบ production
```

### 3.3 ล้างข้อมูลตัวอย่าง

`npm run seed` มีไว้สำหรับ dev/demo เท่านั้น — **อย่ารันบน production**
ถ้าเผลอรันไปแล้ว ให้ลบสินค้า/หมวดหมู่ตัวอย่างออกก่อนเปิดใช้จริง

### 3.4 จำกัด CORS

แก้ `server/index.js`

```js
const allowed = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : false }));
```

```env
CORS_ORIGIN=https://inventory.yourcompany.com
```

### 3.5 เพิ่ม Authentication (ขั้นต่ำ)

ตอนนี้ **ไม่มีระบบล็อกอินเลย** ใครยิง API ได้ก็แก้สต็อกได้ ขั้นต่ำที่ควรมีคือ API key:

```bash
npm install helmet express-rate-limit morgan
```

```js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

app.use(helmet());
app.use(morgan('combined'));
app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));

// ตรวจ API key เฉพาะคำสั่งที่เปลี่ยนแปลงข้อมูล
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (req.get('x-api-key') !== process.env.API_KEY) {
    return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });
  }
  next();
});
```

ถ้าต้องรู้ว่า "ใครเป็นคนปรับสต็อก" ควรทำ JWT + เพิ่มคอลัมน์ `createdBy` ใน `StockTransaction`

### 3.6 Build frontend

```bash
cd client
npm run build          # ได้ไฟล์ static ที่ client/dist
```

ตั้ง `client/.env.production` ให้ชี้ไป API จริง

```env
VITE_API_BASE_URL=https://api.yourcompany.com/api
```

แล้ว deploy `client/dist` ขึ้น Nginx / Vercel / Netlify / Cloudflare Pages
(ถ้าใช้ Nginx อย่าลืม fallback ทุก path ไป `index.html` เพราะเป็น SPA)

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 3.7 รันแบบไม่ตาย + Docker

```bash
npm install -g pm2
pm2 start server.js --name inventory-api
pm2 save && pm2 startup
```

หรือใช้ Docker — `server/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### 3.8 Backup + Monitoring

```bash
# สำรอง Postgres ทุกวัน
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%F).sql.gz
```

- ตั้ง uptime monitor ยิงที่ `GET /api/health` ทุก 1–5 นาที
- ต่อ Sentry (หรือคล้ายกัน) เข้ากับ error handler กลางใน `server/index.js`

---

## 4. ตัวแปรสภาพแวดล้อมสำหรับ production

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@db-host:5432/inventory?schema=public"
PORT=4000
CORS_ORIGIN=https://inventory.yourcompany.com
API_KEY=<สุ่มค่ายาวๆ เก็บใน secret manager>
```

> เก็บค่าเหล่านี้ใน secret manager ของ host (Railway / Render / AWS SSM ฯลฯ)
> **อย่า commit ไฟล์ `.env` ขึ้น git** — repo นี้ ignore ไว้แล้ว และมี `server/.env.example` เป็นตัวอย่าง

---

## 5. สิ่งที่ "พร้อมอยู่แล้ว" ไม่ต้องแก้

- ✅ Logic กันสต็อกติดลบ + บันทึกประวัติ อยู่ใน database transaction เดียวกันแล้ว (ย้าย DB ได้เลยไม่ต้องแก้โค้ด)
- ✅ Migration ถูก commit ไว้ใน repo (`server/prisma/migrations/`) ไม่ได้ push schema แบบมั่ว
- ✅ Validation ครบทุก endpoint + รูปแบบ error เป็นมาตรฐานเดียวกัน
- ✅ มี `GET /api/health` สำหรับ uptime monitor
- ✅ ชุดทดสอบ 30 เคส ใช้เป็น regression test ก่อน deploy ได้ทันที
- ✅ Frontend อ่าน base URL จาก env แยก dev/production ได้
