# Comphone SuperApp AI — LINE Webhook Cloudflare Worker

Worker นี้ทำหน้าที่เป็น **Async Proxy** ระหว่าง LINE Platform กับ GAS WebApp
เพื่อให้ตอบกลับ LINE ได้ภายใน **< 50ms** โดยไม่ต้องรอ GAS ประมวลผล

## Architecture

```
LINE Platform
    │
    │ POST (HTTPS)
    ▼
Cloudflare Worker  ← ตอบ 200 OK ทันที (< 50ms)
    │
    │ async (ctx.waitUntil)
    ▼
Cloudflare Queue
    │
    │ batch forward
    ▼
GAS WebApp (doPost)
```

## การ Deploy

### 1. ติดตั้ง Dependencies

```bash
cd workers/line-webhook
npm install
```

### 2. ตั้งค่า Secrets

```bash
# LINE Channel Secret (จาก LINE Developers Console)
npm run secret:line
# พิมพ์ค่า LINE_CHANNEL_SECRET แล้วกด Enter

# GAS WebApp URL (จาก GAS Deploy)
npm run secret:gas
# พิมพ์ค่า GAS_WEBHOOK_URL แล้วกด Enter
```

### 3. สร้าง Cloudflare Queue

เข้า Cloudflare Dashboard → Workers & Pages → Queues → Create Queue

สร้าง 2 queues:
- `line-events` — queue หลัก
- `line-events-dlq` — dead letter queue

### 4. Deploy Worker

```bash
npm run deploy
```

ระบบจะแสดง Worker URL เช่น:
`https://comphone-line-webhook.YOUR_SUBDOMAIN.workers.dev`

### 5. ตั้งค่า LINE Webhook URL

เข้า [LINE Developers Console](https://developers.line.biz/) → Channel → Messaging API

ตั้ง **Webhook URL** เป็น Worker URL ที่ได้จากขั้นตอนที่ 4

### 6. ทดสอบ

```bash
# ดู real-time logs
npm run tail

# ทดสอบ local
npm run dev
```

## Environment Variables

| Variable | วิธีตั้งค่า | คำอธิบาย |
|---|---|---|
| `LINE_CHANNEL_SECRET` | `wrangler secret put` | ใช้ verify HMAC-SHA256 signature |
| `GAS_WEBHOOK_URL` | `wrangler secret put` | URL ของ GAS Web App |

**ห้าม hardcode ค่าเหล่านี้ในโค้ดโดยเด็ดขาด**

## Security

Worker ตรวจสอบ `X-Line-Signature` header ด้วย HMAC-SHA256 ก่อนประมวลผลทุก request
หาก signature ไม่ถูกต้อง จะตอบกลับ `401 Unauthorized` ทันที

## Fallback

หาก Cloudflare Queue ไม่พร้อมใช้งาน Worker จะ forward ตรงไปยัง GAS WebApp แบบ synchronous
เพื่อให้ระบบทำงานต่อเนื่องได้แม้ Queue มีปัญหา
