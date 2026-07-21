# COMPHONE LINE Webhook Worker

Cloudflare Worker รับ webhook จาก LINE แล้วตอบรับทันที ก่อนส่ง **raw request body เดิมทุก byte** พร้อม `X-Line-Signature` ไปยัง GAS ด้วย `ctx.waitUntil()`

## สถาปัตยกรรมปัจจุบัน

```text
LINE Platform
  -> POST /line/webhook + X-Line-Signature
Cloudflare Worker
  -> ตรวจว่ามี signature
  -> ตรวจ HMAC เพิ่มที่ edge เมื่อมี LINE_CHANNEL_SECRET
  -> ตอบรับทันที
  -> ส่ง raw body และ signature เดิมด้วย ctx.waitUntil()
GAS Web App
  -> ตรวจ LINE signature แบบ fail-closed
  -> ประมวลผล AI Vision, queue, audit และ room notification/reply toggles
```

Worker รุ่นนี้ **ไม่ใช้ Cloudflare Queue** และห้าม parse/เขียน payload ใหม่ก่อนส่ง GAS เพราะ LINE signature ผูกกับ body เดิม

## ติดตั้งและตรวจโค้ด

```powershell
cd C:\Users\Server\comphone-superapp\workers\line-webhook
npm ci
node --check src/index.js
node --check scripts/verify-production.mjs
```

## Secret และค่าคอนฟิก

| ชื่อ | ที่จัดเก็บ | หน้าที่ |
|---|---|---|
| `GAS_URL` | `wrangler.toml` | URL production GAS; ไม่ใช่ secret |
| `LINE_CHANNEL_SECRET` | Cloudflare Worker Secret | ตรวจ HMAC ที่ edge เพิ่มเติม; GAS ยังตรวจซ้ำเสมอ |
| `CLOUDFLARE_API_TOKEN` | Local environment / GitHub Actions Secret | ใช้ deploy เท่านั้น ห้าม commit |

ตั้งค่า edge secret แบบไม่พิมพ์ค่าลงไฟล์:

```powershell
npx wrangler secret put LINE_CHANNEL_SECRET
```

## Deploy จากเครื่อง

```powershell
npx wrangler login
npm run deploy
npm run verify:production
```

`verify:production` จะยืนยันว่า:

- `/health` ตอบรุ่นตรงกับ `package.json`
- Worker รายงาน signed-raw mode
- webhook ที่ไม่มี `X-Line-Signature` ถูกปฏิเสธด้วย HTTP 401
- `/diag/gas` ติดต่อ GAS production ได้

## Deploy ผ่าน GitHub Actions

เพิ่ม Repository Actions Secret ชื่อ `CLOUDFLARE_API_TOKEN` ที่มีสิทธิ์แก้ Workers Scripts แล้ว workflow `Deploy LINE Webhook Worker` จะทำ `npm ci`, syntax check, deploy และ production verification ตามลำดับ

ห้ามเก็บ LINE token, channel secret หรือ Cloudflare token ใน README, BLUEPRINT, source code หรือ Git history

## LINE Webhook URL

```text
https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook
```

หลัง deploy และ verifier ผ่าน ให้ส่งภาพจริงหนึ่งภาพในห้องทดสอบที่ตั้ง Bot reply เป็น Off จากนั้นตรวจ `getVisionLineIngressStatus` ว่า `line_source_photos` เพิ่มขึ้น โดยระบบต้องบันทึกเบื้องหลังแต่ไม่รบกวนห้อง
