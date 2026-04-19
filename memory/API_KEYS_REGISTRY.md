# 🔑 API Keys & Endpoints Registry
**COMPHONE SUPER APP V5.5**

เอกสารนี้รวบรวม API Keys, Tokens, และ Endpoints ทั้งหมดที่ใช้ในระบบ เพื่อป้องกันการสูญหายและใช้สำหรับการตั้งค่าระบบใหม่

---

## 1. Google Apps Script (GAS)
| รายการ | ค่า | หมายเหตุ |
|--------|-----|---------|
| **Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` | ใช้สำหรับ `clasp` |
| **Web App URL (@441)** | `https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec` | Endpoint หลักของระบบ |
| **Spreadsheet ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | Database หลัก |
| **Root Folder ID** | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | เก็บรูปภาพและ PDF |

---

## 2. LINE Messaging API
| รายการ | ค่า | หมายเหตุ |
|--------|-----|---------|
| **Channel Access Token** | `[ดูใน LINE Developers Console > Messaging API]` | ใช้ส่งข้อความ/Flex Message |
| **Channel Secret** | `[ดูใน LINE Developers Console > Basic settings]` | ใช้ยืนยัน Webhook |
| **Webhook URL** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` | ชี้ไปที่ Cloudflare Worker |

---

## 3. LINE Group IDs (สำหรับแจ้งเตือน)
| กลุ่ม | ID | หมายเหตุ |
|-------|----|---------|
| **Technician (ช่าง)** | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` | แจ้งงานใหม่, มอบหมายงาน |
| **Accounting (บัญชี)** | `C7b939d1d367e6b854690e58b392e88cc` | แจ้งบิล, ชำระเงิน, ภาษี |
| **Procurement (จัดซื้อ)** | `Cfd103d59e77acf00e2f2f801d391c566` | แจ้งสต็อกต่ำ, สั่งซื้อ |
| **Sales (เซลส์)** | `Cb7cc146227212f70e4f171ef3f2bce15` | แจ้งยอดขาย |
| **Executive (ผู้บริหาร)** | `Cb85204740fa90e38de63c727554e551a` | สรุปภาพรวม, Health Alert |

---

## 4. AI & External Services
| Service | ค่า | หมายเหตุ |
|---------|-----|---------|
| **Gemini API Key** | `[ดูใน Google AI Studio > API Keys]` | ใช้สำหรับ Slip Verify, Smart Assign |
| **Slip Verify API** | `https://api.slipok.com/api/line/apikey/...` | (ถ้ามี) ใช้ตรวจสอบสลิปโอนเงิน |

---

## 5. Cloudflare Worker
| รายการ | ค่า | หมายเหตุ |
|--------|-----|---------|
| **Account ID** | `838d6a5a046bfaa2a2003bd8005dd80b` | |
| **Worker URL** | `https://comphone-line-webhook.narinoutagit.workers.dev` | |
| **API Token** | `[ดูใน Cloudflare Dashboard > My Profile > API Tokens]` | ใช้สำหรับ `wrangler deploy` |

---

## 6. System Configuration (Script Properties)
| Property | ค่าตัวอย่าง | หมายเหตุ |
|----------|------------|---------|
| `TAX_MODE` | `VAT7` | `VAT7`, `ZERO`, `EXEMPT`, `MIXED` |
| `BRANCH_ID` | `HQ` | รหัสสาขาปัจจุบัน |
| `COMPANY_NAME` | `ร้านคอมโฟน` | ชื่อบริษัทสำหรับออกใบเสร็จ |
| `COMPANY_TAX_ID` | `1234567890123` | เลขประจำตัวผู้เสียภาษี |
| `RATE_LIMIT_PER_MIN` | `60` | จำนวน Request สูงสุดต่อนาที |
| `ALLOWED_ORIGINS` | `*` | CORS Origins ที่อนุญาต |

---
*เอกสารนี้สร้างโดย Manus AI | อัปเดตล่าสุด: 18 เมษายน 2569*
