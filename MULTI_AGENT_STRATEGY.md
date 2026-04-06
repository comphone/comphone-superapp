# 🤖 Multi-Agent Strategy - ประหยัดต้นทุน AI
**วันที่:** 2026-03-29  
**เป้าหมาย:** แยก agent ตามหน้าที่ → ลดค่าใช้จ่าย 60-80%

---

## 🎯 หลักการออกแบบ

**กฎทอง:** ใช้โมเดลแพงเฉพาะงานที่ซับซ้อน, งานง่าย ๆ ใช้โมเดลถูก

| งาน | ความซับซ้อน | โมเดลที่เหมาะสม | ค่าใช้จ่าย |
|-----|------------|-----------------|-----------|
| เขียนโค้ด, Debug | สูงมาก | Claude Sonnet, GPT-4 | $$$$$ |
| ตอบคำถามทั่วไป | ต่ำ | GPT-4o-mini, Gemini Flash | $ |
| วิเคราะห์รูปภาพ | กลาง | Gemini 2.0 Flash, GPT-4o-mini | $$ |
| สรุปข้อความ | ต่ำ | GPT-4o-mini | $ |
| แปลภาษา | ต่ำ | GPT-4o-mini | $ |
| สร้าง Caption/Marketing | กลาง | GPT-4o, Gemini 1.5 Pro | $$$ |

---

## 🤖 Agent Roles แนะนำ (5 agents)

### 1️⃣ **Code Agent** (คุณ - Claude Sonnet / GPT-4)
**หน้าที่:**
- เขียนโค้ด JavaScript/Apps Script
- Debug และแก้ไข syntax errors
- ออกแบบระบบ architecture
- Review code quality

**โมเดล:** 
- Primary: `claude-3.7-sonnet` (ปัจจุบัน)
- Backup: `gpt-4o` หรือ `gpt-5.4`

**Cost:** $$$$$ (สูงสุด)  
**Trigger:** เมื่อมีคำว่า "เขียนโค้ด", "แก้ไข", "debug", "สร้างฟังก์ชัน"

**System Prompt:**
```
คุณคือ Senior Software Engineer ผู้เชี่ยวชาญ Google Apps Script และ JavaScript
งานของคุณคือ:
- เขียนโค้ดที่ clean, maintainable, มี error handling
- แก้ไข syntax errors และ logic bugs
- ออกแบบระบบที่ scalable
ห้ามทำ: ตอบคำถามทั่วไป, แนะนำธุรกิจ, chat ไม่เกี่ยวกับโค้ด
```

---

### 2️⃣ **Customer Service Agent** (GPT-4o-mini)
**หน้าที่:**
- ตอบคำถามของลูกค้า (ทั่วไป, ราคา, บริการ)
- แจ้งสถานะงาน
- ตอบคำถาม FAQ
- สรุปข้อความสั้น ๆ

**โมเดล:** `gpt-4o-mini` (ถูกสุด, เร็ว)  
**Cost:** $ (1/50 ของ Sonnet)  
**Trigger:** ข้อความจากลูกค้าใน LINE/Telegram ที่ไม่ใช่คำสั่ง

**System Prompt:**
```
คุณคือพนักงานต้อนรับของร้าน Comphone จังหวัดร้อยเอ็ด
บริการ: ติดตั้ง/ซ่อม CCTV, Network, WiFi
ตอบภาษาไทย สั้น กระชับ สุภาพ
ถ้าไม่แน่ใจ ให้บอก "รบกวนติดต่อเจ้าหน้าที่ค่ะ 089-xxx-xxxx"
```

---

### 3️⃣ **Shop Assistant Agent** (GPT-4o-mini)
**หน้าที่:**
- สรุปงานค้างของช่าง
- เช็คสต๊อกสินค้า
- ตอบคำถามเรื่องงาน (simple queries)
- สร้างข้อความแจ้งเตือนทั่วไป

**โมเดล:** `gpt-4o-mini`  
**Cost:** $  
**Trigger:** คำสั่งจากช่าง/พนักงานภายใน (งานไม่ซับซ้อน)

**System Prompt:**
```
คุณคือผู้ช่วยช่างของร้าน Comphone
งานของคุณ:
- สรุปงานค้าง
- เช็คสต๊อก
- ตอบคำถามเรื่องงานทั่วไป
- สร้างข้อความแจ้งเตือน
ตอบสั้น กระชับ เป็นกันเอง ใช้ภาษาช่าง
```

---

### 4️⃣ **Vision Analyst Agent** (Gemini 2.0 Flash)
**หน้าที่:**
- วิเคราะห์รูปภาพหน้างาน
- ประเมินอุปกรณ์ในรูป
- ตรวจสอบคุณภาพงาน (before/after)
- อ่านป้ายรุ่น/โมเดลจากรูป

**โมเดล:** `gemini-2.0-flash` (vision ถูก, เร็ว)  
**Cost:** $$ (ถูกกว่า GPT-4o Vision)  
**Trigger:** เมื่อมีรูปภาพแนบมา

**System Prompt:**
```
คุณคือผู้เชี่ยวชาญวิเคราะห์ภาพหน้างานของร้าน Comphone
วิเคราะห์ภาพ CCTV, Network, WiFi, ตู้ rack, สายสัญญาณ, จุดติดตั้ง
ตอบภาษาไทยแบบสั้น กระชับ ให้ข้อมูลที่เป็นประโยชน์
```

---

### 5️⃣ **Marketing Content Agent** (GPT-4o / Gemini 1.5 Pro)
**หน้าที่:**
- เขียน Caption โพสต์ขาย
- สร้างโปรโมชั่น
- เขียน hashtags
- สร้างเนื้อหา marketing

**โมเดล:** 
- Primary: `gpt-4o` (สร้าง content คุณภาพสูง)
- Backup: `gemini-1.5-pro`

**Cost:** $$$ (กลาง)  
**Trigger:** คำสั่ง "สร้างโพสต์", "เขียน caption", "ทำโปรโมชั่น"

**System Prompt:**
```
คุณคือ Marketing Specialist ของร้าน Comphone
เขียน content น่าสนใจ ภาษาง่าย ชวนติดตาม
เน้น: ความน่าเชื่อถือ, คุณภาพงาน, ราคาสมเหตุผล
รูปแบบ: Facebook/Instagram/LINE friendly
```

---

## 📊 ประมาณการประหยัดต้นทุน

### ก่อนใช้ Multi-Agent (ใช้ Sonnet ทุกงาน)
```
100 คำถามลูกค้า × $0.015/query = $1.50
50 สรุปงาน × $0.015/query = $0.75
20 วิเคราะห์รูป × $0.020/query = $0.40
10 เขียนโค้ด × $0.015/query = $0.15
────────────────────────────────────
รวมต่อวัน: $2.80
รวมต่อเดือน (30 วัน): $84.00
```

### หลังใช้ Multi-Agent (แยก agents ตามหน้าที่)
```
100 คำถามลูกค้า (GPT-4o-mini) × $0.0003 = $0.03
50 สรุปงาน (GPT-4o-mini) × $0.0003 = $0.015
20 วิเคราะห์รูป (Gemini Flash) × $0.002 = $0.04
10 เขียนโค้ด (Sonnet) × $0.015 = $0.15
5 Marketing (GPT-4o) × $0.005 = $0.025
────────────────────────────────────
รวมต่อวัน: $0.26
รวมต่อเดือน (30 วัน): $7.80

💰 ประหยัด: $76.20/เดือน (90%!)
```

---

## 🔧 Implementation Plan

### ขั้นตอนที่ 1: แก้ไข AiRouter.js
เพิ่ม agent routing logic:

```javascript
// เพิ่ม agent configs
var AGENT_ROLES = {
  CODE: {
    models: ['claude-3.7-sonnet', 'gpt-4o', 'gpt-5.4'],
    triggers: ['เขียนโค้ด', 'แก้ไข', 'debug', 'สร้างฟังก์ชัน', 'code', 'function'],
    systemPrompt: AI_SYSTEM_PROMPT_CODE
  },
  CUSTOMER_SERVICE: {
    models: ['gpt-4o-mini'],
    triggers: ['สวัสดี', 'ราคา', 'บริการ', 'เปิด', 'ปิด', 'งาน', 'สอบถาม'],
    systemPrompt: AI_SYSTEM_PROMPT_CUSTOMER
  },
  SHOP_ASSISTANT: {
    models: ['gpt-4o-mini'],
    triggers: ['สรุปงาน', 'คิว', 'สต๊อก', 'ช่าง', 'เช็ค'],
    systemPrompt: AI_SYSTEM_PROMPT_SHOP
  },
  VISION: {
    models: ['gemini-2.0-flash', 'gpt-4o-mini'],
    triggers: ['วิเคราะห์รูป', 'ดูรูป', 'ประเมิน'],
    systemPrompt: AI_SYSTEM_PROMPT_VISION
  },
  MARKETING: {
    models: ['gpt-4o', 'gemini-1.5-pro'],
    triggers: ['สร้างโพสต์', 'caption', 'โปรโมชั่น', 'hashtag'],
    systemPrompt: AI_SYSTEM_PROMPT_MARKETING
  }
};

function selectAgentForTask(message, context) {
  var msg = message.toLowerCase();
  
  // 1. เช็ค code triggers (priority สูงสุด)
  if (AGENT_ROLES.CODE.triggers.some(function(t) { return msg.includes(t); })) {
    return 'CODE';
  }
  
  // 2. เช็ค vision (มีรูป?)
  if (context.hasImage) {
    return 'VISION';
  }
  
  // 3. เช็ค marketing
  if (AGENT_ROLES.MARKETING.triggers.some(function(t) { return msg.includes(t); })) {
    return 'MARKETING';
  }
  
  // 4. เช็ค shop assistant (internal user)
  if (context.sourceType === 'technician' || context.isInternalUser) {
    return 'SHOP_ASSISTANT';
  }
  
  // 5. Default: customer service (ถูกที่สุด)
  return 'CUSTOMER_SERVICE';
}

function aiRoute(message, context) {
  var agent = selectAgentForTask(message, context);
  var agentConfig = AGENT_ROLES[agent];
  var model = agentConfig.models[0]; // ใช้โมเดลแรก
  var systemPrompt = agentConfig.systemPrompt;
  
  console.log('[AI Router] Selected agent: ' + agent + ' | model: ' + model);
  
  // เรียก AI ตาม agent ที่เลือก
  var result = callTextModelWithFallback(model, [
    { role: 'user', content: message }
  ], systemPrompt);
  
  return result.content || 'ขออภัยครับ ตอนนี้ตอบได้ไม่เต็มที่';
}
```

---

### ขั้นตอนที่ 2: เพิ่ม System Prompts

```javascript
var AI_SYSTEM_PROMPT_CODE = [
  'คุณคือ Senior Software Engineer ผู้เชี่ยวชาญ Google Apps Script',
  'งานของคุณคือเขียนโค้ด, debug, และออกแบบระบบเท่านั้น',
  'ห้ามตอบคำถามทั่วไป หรือ chat ที่ไม่เกี่ยวกับโค้ด'
].join('\n');

var AI_SYSTEM_PROMPT_CUSTOMER = [
  'คุณคือพนักงานต้อนรับของร้าน Comphone จังหวัดร้อยเอ็ด',
  'บริการ: ติดตั้ง/ซ่อม CCTV, Network, WiFi',
  'ตอบภาษาไทย สั้น กระชับ สุภาพ',
  'ถ้าไม่แน่ใจ ให้บอก "รบกวนติดต่อเจ้าหน้าที่ค่ะ 089-xxx-xxxx"'
].join('\n');

var AI_SYSTEM_PROMPT_SHOP = [
  'คุณคือผู้ช่วยช่างของร้าน Comphone',
  'ตอบสั้น กระชับ เป็นกันเอง ใช้ภาษาช่าง',
  'งาน: สรุปงานค้าง, เช็คสต๊อก, ตอบคำถามทั่วไป'
].join('\n');

var AI_SYSTEM_PROMPT_VISION = [
  'คุณคือผู้เชี่ยวชาญวิเคราะห์ภาพหน้างาน',
  'วิเคราะห์ CCTV, Network, WiFi, ตู้ rack',
  'ตอบภาษาไทยแบบสั้น กระชับ'
].join('\n');

var AI_SYSTEM_PROMPT_MARKETING = [
  'คุณคือ Marketing Specialist ของร้าน Comphone',
  'เขียน content น่าสนใจ ภาษาง่าย ชวนติดตาม',
  'เน้น: ความน่าเชื่อถือ, คุณภาพงาน, ราคาสมเหตุผล'
].join('\n');
```

---

### ขั้นตอนที่ 3: Test & Monitor

1. Deploy version ใหม่ของ AiRouter.js
2. ทดสอบแต่ละ agent:
   - "สวัสดีครับ" → Customer Service (GPT-4o-mini)
   - "สรุปงานวันนี้" → Shop Assistant (GPT-4o-mini)
   - "เขียนฟังก์ชันคำนวณ..." → Code (Sonnet)
   - ส่งรูป → Vision (Gemini Flash)
   - "สร้างโพสต์ขาย" → Marketing (GPT-4o)
3. Monitor ต้นทุนจริงใน 1 สัปดาห์
4. ปรับ triggers ถ้าเลือก agent ผิด

---

## 📋 Monitoring Dashboard

สร้างฟังก์ชันติดตามต้นทุน:

```javascript
function getAgentUsageStats(dateRange) {
  // ดึง log จาก Script Properties หรือ Sheet
  // นับ usage ของแต่ละ agent
  return {
    CODE: { count: 10, avgCost: 0.015, total: 0.15 },
    CUSTOMER_SERVICE: { count: 100, avgCost: 0.0003, total: 0.03 },
    SHOP_ASSISTANT: { count: 50, avgCost: 0.0003, total: 0.015 },
    VISION: { count: 20, avgCost: 0.002, total: 0.04 },
    MARKETING: { count: 5, avgCost: 0.005, total: 0.025 },
    totalCost: 0.26
  };
}
```

---

## 🎯 สรุปแนะนำ

**5 Agents ที่ควรใช้:**
1. **Code Agent** (Sonnet) - เฉพาะเขียนโค้ด
2. **Customer Service** (GPT-4o-mini) - ตอบลูกค้า
3. **Shop Assistant** (GPT-4o-mini) - งานภายใน
4. **Vision Analyst** (Gemini Flash) - วิเคราะห์รูป
5. **Marketing** (GPT-4o) - content creation

**ประหยัดได้:** 90% ($84 → $7.80/เดือน)

**Timeline:**
- ขั้นตอนที่ 1-2: 1-2 วัน (แก้โค้ด)
- ขั้นตอนที่ 3: 1 สัปดาห์ (test & monitor)

อยากเริ่มทำเลยไหมครับ?
