# 🆓 Free Models for Code Agent - Analysis
**วันที่:** 2026-03-29  
**เป้าหมาย:** ใช้โมเดลฟรีเขียนโค้ดง่าย ๆ ประหยัด Sonnet ไว้เฉพาะงานซับซ้อน

---

## 🎯 กลยุทธ์ที่แนะนำ: **2-Tier Code Agent**

```
Code Agent (Tiered):
├─ Tier 1: Free Models → งานง่าย (70% ของงาน)
│  ├─ Simple function
│  ├─ Bug fixes
│  └─ Code explanation
│
└─ Tier 2: Sonnet → งานซับซ้อน (30% ของงาน)
   ├─ Complex architecture
   ├─ Performance optimization
   └─ Critical production code
```

---

## 🆓 โมเดลฟรีที่แนะนำสำหรับเขียนโค้ด (OpenRouter)

### 1️⃣ **DeepSeek-R1 (Free)** ⭐ แนะนำสูงสุด
**Model ID:** `deepseek/deepseek-r1:free`

**ข้อดี:**
- ✅ เขียนโค้ดได้ดีมาก (ใกล้เคียง GPT-4)
- ✅ Reasoning ชัดเจน
- ✅ รองรับ context ยาว
- ✅ อธิบายโค้ดได้ดี
- ✅ ฟรีโดยสมบูรณ์ (OpenRouter)

**ข้อเสีย:**
- ❌ ไม่รองรับรูปภาพ (text-only)
- ⚠️ อาจช้ากว่าโมเดลเสียเงิน

**เหมาะกับ:**
- เขียนฟังก์ชันทั่วไป
- แก้บั๊กง่าย ๆ
- Refactor code
- Code review

---

### 2️⃣ **Qwen 2.5 Coder 32B (Free)**
**Model ID:** `qwen/qwen-2.5-coder-32b-instruct:free`

**ข้อดี:**
- ✅ เขียนโค้ดได้ดีมาก (เน้น coding)
- ✅ รองรับหลายภาษา
- ✅ Context window ใหญ่ (32K tokens)
- ✅ ฟรี

**ข้อเสีย:**
- ❌ ไม่รองรับรูปภาพ
- ⚠️ อาจไม่ค่อยดีในงาน reasoning ซับซ้อน

**เหมาะกับ:**
- Simple CRUD functions
- Helper utilities
- Code generation

---

### 3️⃣ **Llama 3.1 8B (Free)**
**Model ID:** `meta-llama/llama-3.1-8b-instruct:free`

**ข้อดี:**
- ✅ ฟรี + เร็ว
- ✅ General purpose ดี
- ✅ Lightweight

**ข้อเสีย:**
- ❌ ไม่รองรับรูปภาพ
- ⚠️ เขียนโค้ดได้แค่ระดับ basic
- ⚠️ Context สั้นกว่าตัวอื่น

**เหมาะกับ:**
- Simple scripts
- Code comments
- Basic debugging

---

## 🖼️ โมเดลฟรีที่รองรับรูปภาพ (Vision)

### 1️⃣ **Llama 3.2 Vision 11B (Free)** ⭐ แนะนำ
**Model ID:** `meta-llama/llama-3.2-11b-vision-instruct:free`

**ข้อดี:**
- ✅ รองรับรูปภาพ
- ✅ ฟรี
- ✅ วิเคราะห์ภาพได้ดีระดับหนึ่ง

**ข้อเสีย:**
- ⚠️ ไม่เท่า Gemini Flash หรือ GPT-4o Vision
- ⚠️ บางครั้งอ่านรายละเอียดไม่ละเอียดพอ

**เหมาะกับ:**
- วิเคราะห์รูปภาพทั่วไป
- ระบุอุปกรณ์ในภาพ
- OCR พื้นฐาน

---

### 2️⃣ **Qwen 2 VL 7B (Free)**
**Model ID:** `qwen/qwen-2-vl-7b-instruct:free`

**ข้อดี:**
- ✅ รองรับรูปภาพ
- ✅ ฟรี
- ✅ OCR ดี

**ข้อเสีย:**
- ⚠️ Model เล็ก (7B) → ความแม่นยำต่ำกว่า

---

## 🏗️ แนะนำ Architecture: **3-Tier Code Agent**

```javascript
CODE Agent Strategy:
┌─────────────────────────────────────────┐
│ Tier 1: Free Model (DeepSeek R1)       │ → 50% ของงาน
│ ├─ Simple functions                     │
│ ├─ Bug fixes                            │
│ └─ Code explanation                     │
├─────────────────────────────────────────┤
│ Tier 2: Mid-range (GPT-4o-mini/4o)    │ → 30% ของงาน
│ ├─ Medium complexity                    │
│ ├─ Integration code                     │
│ └─ API implementations                  │
├─────────────────────────────────────────┤
│ Tier 3: Premium (Sonnet)               │ → 20% ของงาน
│ ├─ Complex architecture                │
│ ├─ Performance-critical                 │
│ ├─ Production system design             │
│ └─ Critical debugging                   │
└─────────────────────────────────────────┘
```

---

## 💡 Implementation Strategy

### ขั้นตอนที่ 1: เพิ่ม Free Models Config

```javascript
var AI_MODELS = {
  // ... existing models ...
  
  // Free Code Models (OpenRouter)
  CODE_FREE: 'deepseek/deepseek-r1:free',
  CODE_FREE_ALT: 'qwen/qwen-2.5-coder-32b-instruct:free',
  
  // Free Vision Models
  VISION_FREE: 'meta-llama/llama-3.2-11b-vision-instruct:free'
};

var OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
var OPENROUTER_API_KEY = 'your-openrouter-key'; // ตั้งใน Script Properties
```

---

### ขั้นตอนที่ 2: แก้ไข CODE Agent

```javascript
var AGENT_ROLES = {
  CODE: {
    // 3-tier model selection
    models: {
      FREE: ['deepseek/deepseek-r1:free', 'qwen/qwen-2.5-coder-32b-instruct:free'],
      MID: ['gpt-4o', 'gpt-4o-mini'],
      PREMIUM: ['claude-3-7-sonnet-20250219', 'gpt-5.4']
    },
    triggers: ['เขียนโค้ด', 'แก้ไข', 'debug', 'function'],
    systemPrompt: 'AI_SYSTEM_PROMPT_CODE',
    
    // Complexity detection keywords
    complexKeywords: [
      'architecture', 'ออกแบบระบบ', 'optimization', 'ประสิทธิภาพ',
      'production', 'critical', 'สำคัญ', 'ซับซ้อน', 'complex'
    ],
    simpleKeywords: [
      'simple', 'ง่าย', 'basic', 'helper', 'utility', 'แก้บั๊ก', 'fix bug'
    ]
  },
  // ... other agents ...
};
```

---

### ขั้นตอนที่ 3: Complexity Detection

```javascript
/**
 * ตรวจจับความซับซ้อนของงาน code
 * @return {string} 'FREE' | 'MID' | 'PREMIUM'
 */
function detectCodeComplexity(message, context) {
  var msg = message.toLowerCase();
  var agentConfig = AGENT_ROLES.CODE;
  
  // 1. เช็ค explicit complexity hints
  if (context.forceModel === 'PREMIUM') return 'PREMIUM';
  if (context.forceModel === 'FREE') return 'FREE';
  
  // 2. เช็ค complex keywords
  for (var i = 0; i < agentConfig.complexKeywords.length; i++) {
    if (msg.indexOf(agentConfig.complexKeywords[i]) >= 0) {
      console.log('[Code Complexity] PREMIUM (complex keyword found)');
      return 'PREMIUM';
    }
  }
  
  // 3. เช็ค simple keywords
  for (var j = 0; j < agentConfig.simpleKeywords.length; j++) {
    if (msg.indexOf(agentConfig.simpleKeywords[j]) >= 0) {
      console.log('[Code Complexity] FREE (simple keyword found)');
      return 'FREE';
    }
  }
  
  // 4. เช็คความยาวข้อความ
  if (message.length < 100) {
    console.log('[Code Complexity] FREE (short message)');
    return 'FREE';
  }
  
  if (message.length > 500) {
    console.log('[Code Complexity] PREMIUM (long message)');
    return 'PREMIUM';
  }
  
  // 5. Default: MID tier
  console.log('[Code Complexity] MID (default)');
  return 'MID';
}
```

---

### ขั้นตอนที่ 4: OpenRouter Integration

```javascript
/**
 * เรียก OpenRouter API (Free models)
 */
function callOpenRouter(model, messages, systemPrompt, maxTokens) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('OPENROUTER_API_KEY');
  
  if (!apiKey) {
    return {
      success: false,
      error: 'OPENROUTER_API_KEY not configured'
    };
  }
  
  var payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt }
    ].concat(messages),
    max_tokens: maxTokens || 2000
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'HTTP-Referer': 'https://comphone-app.example.com',
      'X-Title': 'Comphone Super App'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(OPENROUTER_ENDPOINT, options);
    var json = JSON.parse(response.getContentText());
    
    if (json.choices && json.choices[0] && json.choices[0].message) {
      return {
        success: true,
        content: json.choices[0].message.content,
        model: model,
        usage: json.usage
      };
    }
    
    return {
      success: false,
      error: json.error || 'Unknown error'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      retryable: true
    };
  }
}
```

---

### ขั้นตอนที่ 5: แก้ไข aiRoute() สำหรับ Code Agent

```javascript
function aiRoute(userMessage, context) {
  // ... existing code ...
  
  var agentRole = selectAgentForTask(text, context);
  
  if (agentRole === 'CODE') {
    // Detect complexity
    var tier = detectCodeComplexity(text, context);
    var agentConfig = AGENT_ROLES.CODE;
    var modelList = agentConfig.models[tier];
    var model = modelList[0];
    
    console.log('[CODE Agent] tier=' + tier + ' model=' + model);
    
    var systemPrompt = getSystemPromptForAgent('CODE');
    
    // Try free model first (if tier = FREE)
    if (tier === 'FREE' && model.indexOf(':free') >= 0) {
      var freeResult = callOpenRouter(model, [{ role: 'user', content: text }], systemPrompt);
      
      if (freeResult.success) {
        console.log('[CODE Agent] FREE model success: ' + model);
        return freeResult.content;
      }
      
      // Fallback to MID tier
      console.warn('[CODE Agent] FREE model failed, fallback to MID');
      tier = 'MID';
      model = agentConfig.models[tier][0];
    }
    
    // Use KNP API for MID/PREMIUM
    var messages = [{ role: 'user', content: text }];
    var result = callTextModelWithFallback(model, messages, systemPrompt);
    return result.content || '⚠️ ระบบ AI ขัดข้อง กรุณาลองใหม่';
  }
  
  // ... existing code for other agents ...
}
```

---

## 📊 ประมาณการประหยัด (ใหม่)

### ก่อนใช้ Tiered Code Agent:
```
10 code tasks/day × $0.015 (Sonnet) = $0.15/day
× 30 days = $4.50/month
```

### หลังใช้ Tiered Code Agent (50% free, 30% mid, 20% premium):
```
5 tasks (FREE)    × $0.000 = $0.00
3 tasks (MID)     × $0.005 = $0.015
2 tasks (PREMIUM) × $0.015 = $0.030
────────────────────────────────
รวมต่อวัน: $0.045
× 30 days = $1.35/month

ประหยัดได้: $3.15/month (70%!)
```

---

## 🎯 แนะนำขั้นตอนการทำ

### Phase 1: Setup (30 นาที)
1. สมัคร OpenRouter account (ฟรี)
2. Get API key
3. ตั้งค่า `OPENROUTER_API_KEY` ใน Script Properties

### Phase 2: Implementation (2-3 ชั่วโมง)
1. เพิ่ม OpenRouter models config
2. สร้าง `detectCodeComplexity()` function
3. สร้าง `callOpenRouter()` function
4. แก้ไข `aiRoute()` สำหรับ CODE agent
5. Test & Deploy

### Phase 3: Monitor (1 สัปดาห์)
1. ดู free model success rate
2. ดู fallback rate
3. ปรับ complexity detection

---

## ⚠️ ข้อควรระวัง

1. **Free models มี rate limit**
   - OpenRouter free tier มี limit
   - ถ้าเกิน limit จะ fallback ไป MID tier

2. **Quality ของ free models**
   - DeepSeek R1 ดีมาก (ใกล้เคียง GPT-4)
   - แต่บางครั้งอาจช้ากว่า
   - ควร test จริงก่อน deploy production

3. **Vision models ฟรี**
   - Llama 3.2 Vision ดีแต่ไม่เท่า Gemini Flash
   - แนะนำใช้ Gemini Flash ($0.002) คุ้มกว่า

---

## 🏆 สรุปแนะนำ

### สำหรับ Code Agent:
✅ **ใช้ DeepSeek R1 (free)** สำหรับงานง่าย (50%)  
✅ **ใช้ GPT-4o** สำหรับงานกลาง (30%)  
✅ **ใช้ Sonnet** สำหรับงานซับซ้อน (20%)  

### สำหรับ Vision Agent:
❌ **ไม่แนะนำใช้ free vision models**  
✅ **ใช้ Gemini Flash ($0.002)** คุ้มกว่า (ดีกว่า + ถูกอยู่แล้ว)

---

**พร้อมเริ่มทำไหมครับ?** เริ่มจาก Phase 1 เลยได้
