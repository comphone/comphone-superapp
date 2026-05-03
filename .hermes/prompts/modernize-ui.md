# 🎨 /modernize-ui — COMPHONE SUPER APP UI/UX Modernization Prompt

> **วัตถุประสงค์**: Prompt นี้ใช้สำหรับปรับปรุง UI/UX ของ COMPHONE SUPER APP ให้มีรูปแบบ Hyper-Glassmorphism & Spatial UI ที่ทันสมัย สวยงาม และใช้งานง่ายทุกอุปกรณ์

---

## 1. 🧊 Design Concept: Hyper-Glassmorphism & Spatial UI

แนวทางการออกแบบหลักผสมผสาน Glassmorphism กับ Spatial Depth เพื่อสร้างประสบการณ์ที่ล้ำลึกและทันสมัย

### Deep Glass (ผิวกระจกกึ่งโปร่งใส)
- Semi-transparent surfaces พร้อม `backdrop-filter: blur()`
- สร้างความรู้สึกชั้นว่าง (layered depth) ให้กับ UI
- ใช้หลายระดับความโปร่งใสเพื่อแยกลำดับความสำคัญของเนื้อหา

```css
/* Deep Glass - ระดับมาตรฐาน */
.glass-surface {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

/* Deep Glass - ระดับหนัก (Heavy) */
.glass-surface-heavy {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

/* Deep Glass - ระดับเบา (Light) */
.glass-surface-light {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}
```

### Gradient Borders (ขอบไล่เฉดสี)
- สีหลัก: **Cyber Cyan `#00d4ff`** → **Electric Purple `#a855f7`**
- ใช้เทคนิค `border-image` หรือ pseudo-element wrapper
- สร้างจุดโฟกัสและความรู้สึก "เทคโนโลยีชั้นสูง"

```css
/* Gradient Border - แบบพื้นฐาน */
.gradient-border {
  position: relative;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
  border-radius: 16px;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, #00d4ff, #a855f7);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Gradient Border - Animated (ขอบเคลื่อนไหว) */
.gradient-border-animated::before {
  background: linear-gradient(
    var(--gradient-angle, 0deg),
    #00d4ff, #a855f7, #00d4ff
  );
  animation: gradient-rotate 3s linear infinite;
}

@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes gradient-rotate {
  to { --gradient-angle: 360deg; }
}
```

### Spatial Depth (ความลึกเชิงพื้นที่ — 3 ระดับ)
- ใช้ shadow elevation 3 ระดับเพื่อสร้างลำดับชั้นภาพ (visual hierarchy)
- แต่ละระดับแทนความสูงจากพื้นผิว ยิ่งสูงยิ่งเด่น

```css
/* Level 1: ระดับพื้น (Base) — ส่วนประกอบที่อยู่ต่ำสุด */
.elevation-1 {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Level 2: ระดับกลาง (Raised) — การ์ด, เนื้อหาหลัก */
.elevation-2 {
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 12px 24px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Level 3: ระดับสูง (Floating) — Modal, Dropdown, Tooltip */
.elevation-3 {
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 24px 48px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 0 80px rgba(0, 212, 255, 0.05);
}
```

### Micro-interactions (การตอบสนองระดับจุล)
- CSS transitions สำหรับการเปลี่ยนสถานะทั่วไป
- Web Animations API สำหรับ animation ที่ซับซ้อน
- ให้ความรู้สึก "มีชีวิต" และตอบสนองต่อผู้ใช้

```css
/* Transition พื้นฐาน */
.micro-interact {
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease,
    opacity 0.2s ease;
}

/* Hover — ยกขึ้นเล็กน้อย */
.micro-interact:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(0, 212, 255, 0.1);
}

/* Active — กดลง */
.micro-interact:active {
  transform: translateY(0) scale(0.98);
}

/* Focus — แสดง gradient ring */
.micro-interact:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(0, 212, 255, 0.5),
    0 0 0 4px rgba(168, 85, 247, 0.3);
}
```

```javascript
// Web Animations API — Pulse effect สำหรับ notification
function pulseElement(el) {
  el.animate([
    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0, 212, 255, 0.4)' },
    { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(0, 212, 255, 0)' },
    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0, 212, 255, 0)' }
  ], {
    duration: 600,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  });
}

// Web Animations API — Slide-in สำหรับ card ใหม่
function slideInCard(el, direction = 'left') {
  const offsetX = direction === 'left' ? -30 : 30;
  el.animate([
    { opacity: 0, transform: `translateX(${offsetX}px) scale(0.95)` },
    { opacity: 1, transform: 'translateX(0) scale(1)' }
  ], {
    duration: 400,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fill: 'forwards'
  });
}
```

---

## 2. 🎛️ CSS Variables Reference

ตัวแปร CSS ทั้งหมดสำหรับระบบออกแบบ (Design System) — กำหนดครั้งเดียว ใช้ได้ทุกหน้า

```css
:root {
  /* === สีหลัก (Primary Colors) === */
  --color-bg-primary: #0a0f1e;         /* พื้นหลังหลัก — น้ำเงินเข้มมาก */
  --color-bg-secondary: #111827;       /* พื้นหลังรอง */
  --color-bg-surface: #1e293b;         /* พื้นผิวการ์ด */

  /* === สี Accent === */
  --color-cyan: #00d4ff;               /* Cyber Cyan */
  --color-purple: #a855f7;             /* Electric Purple */
  --color-cyan-dim: rgba(0, 212, 255, 0.15);
  --color-purple-dim: rgba(168, 85, 247, 0.15);

  /* === Gradient === */
  --gradient-primary: linear-gradient(135deg, #00d4ff, #a855f7);
  --gradient-primary-hover: linear-gradient(135deg, #00e5ff, #b86fff);
  --gradient-surface: linear-gradient(135deg, rgba(0,212,255,0.05), rgba(168,85,247,0.05));

  /* === สีข้อความ (Text Colors) === */
  --color-text-primary: #f1f5f9;       /* ข้อความหลัก */
  --color-text-secondary: #94a3b8;     /* ข้อความรอง */
  --color-text-muted: #64748b;         /* ข้อความจาง */
  --color-text-accent: #00d4ff;        /* ข้อความเน้น */

  /* === สีสถานะ (Status Colors) === */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* === Glass Effects === */
  --glass-bg: rgba(15, 23, 42, 0.6);
  --glass-bg-heavy: rgba(15, 23, 42, 0.8);
  --glass-bg-light: rgba(15, 23, 42, 0.4);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.15);
  --glass-blur: 16px;
  --glass-blur-heavy: 24px;
  --glass-blur-light: 12px;

  /* === Spacing === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* === Border Radius === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* === Typography === */
  --font-family: 'Noto Sans Thai', 'Inter', system-ui, -apple-system, sans-serif;
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-md: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 2rem;      /* 32px */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* === Shadows / Elevation === */
  --shadow-1: 0 1px 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2);
  --shadow-2: 0 4px 8px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05);
  --shadow-3: 0 8px 16px rgba(0,0,0,0.4), 0 24px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(0,212,255,0.05);

  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
  --transition-bounce: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

  /* === Z-Index === */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
}
```

---

## 3. 🧩 Component Library

คลังส่วนประกอบ UI ที่พร้อมใช้งาน — นำไปประกอบเป็นหน้าจอได้ทันที

### Glass Card (การ์ดกระจก)

```html
<div class="glass-card">
  <div class="glass-card__header">
    <h3 class="glass-card__title">ชื่อการ์ด</h3>
    <span class="glass-card__badge">สถานะ</span>
  </div>
  <div class="glass-card__body">
    <!-- เนื้อหาการ์ด -->
  </div>
</div>
```

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-normal),
    border-color var(--transition-normal);
}

.glass-card:hover {
  border-color: var(--glass-border-hover);
  box-shadow: var(--shadow-2);
  transform: translateY(-2px);
}

.glass-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.glass-card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.glass-card__badge {
  font-size: var(--font-size-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  background: var(--color-cyan-dim);
  color: var(--color-cyan);
  font-weight: var(--font-weight-medium);
}
```

### Gradient Border Container (กรอบไล่เฉดสี)

```html
<div class="gradient-border-wrapper">
  <div class="gradient-border-content">
    <!-- เนื้อหาที่มีกรอบ gradient -->
  </div>
</div>
```

```css
.gradient-border-wrapper {
  position: relative;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: var(--gradient-primary);
}

.gradient-border-content {
  background: var(--color-bg-secondary);
  border-radius: calc(var(--radius-lg) - 1px);
  padding: var(--space-lg);
}
```

### Animated Button (ปุ่มแอนิเมชั่น)

```html
<!-- ปุ่มหลัก (Primary) -->
<button class="btn btn-primary">
  <span class="btn__text">บันทึก</span>
  <span class="btn__shimmer"></span>
</button>

<!-- ปุ่มรอง (Secondary) -->
<button class="btn btn-secondary">
  <span class="btn__text">ยกเลิก</span>
</button>

<!-- ปุ่มไอคอน (Icon) -->
<button class="btn btn-icon" aria-label="เพิ่ม">
  <svg><!-- icon --></svg>
</button>
```

```css
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  border: none;
  overflow: hidden;
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-normal);
}

.btn:active {
  transform: scale(0.96);
}

/* Primary — Gradient background */
.btn-primary {
  background: var(--gradient-primary);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.25);
}

.btn-primary:hover {
  background: var(--gradient-primary-hover);
  box-shadow: 0 6px 20px rgba(0, 212, 255, 0.35);
  transform: translateY(-1px);
}

/* Shimmer effect */
.btn__shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: none;
}

.btn-primary:hover .btn__shimmer {
  animation: shimmer 0.6s ease forwards;
}

@keyframes shimmer {
  to { transform: translateX(100%); }
}

/* Secondary — Glass style */
.btn-secondary {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur-light));
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  border-color: var(--glass-border-hover);
  background: rgba(15, 23, 42, 0.75);
}

/* Icon button */
.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur-light));
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
}

.btn-icon:hover {
  color: var(--color-cyan);
  border-color: var(--color-cyan);
  box-shadow: 0 0 12px var(--color-cyan-dim);
}
```

### KPI Card (การ์ดตัวชี้วัด)

```html
<div class="kpi-card">
  <div class="kpi-card__icon">
    <svg><!-- ไอคอน --></svg>
  </div>
  <div class="kpi-card__content">
    <span class="kpi-card__label">งานวันนี้</span>
    <span class="kpi-card__value" data-target="24">0</span>
  </div>
  <div class="kpi-card__trend kpi-card__trend--up">
    <svg><!-- arrow-up --></svg>
    <span>+12%</span>
  </div>
</div>
```

```css
.kpi-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  transition:
    transform var(--transition-bounce),
    border-color var(--transition-normal);
}

.kpi-card:hover {
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
}

.kpi-card__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--gradient-surface);
  color: var(--color-cyan);
  flex-shrink: 0;
}

.kpi-card__content {
  flex: 1;
  min-width: 0;
}

.kpi-card__label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-card__value {
  display: block;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.kpi-card__trend {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.kpi-card__trend--up { color: var(--color-success); }
.kpi-card__trend--down { color: var(--color-error); }
.kpi-card__trend--neutral { color: var(--color-text-muted); }
```

```javascript
// Counter animation สำหรับ KPI value
function animateCounter(el, target, duration = 1000) {
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing: ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ใช้งาน:
// document.querySelectorAll('.kpi-card__value').forEach(el => {
//   animateCounter(el, parseInt(el.dataset.target));
// });
```

### Navigation Item (รายการเมนูนำทาง)

```html
<nav class="nav-list">
  <a href="#" class="nav-item nav-item--active">
    <svg class="nav-item__icon"><!-- icon --></svg>
    <span class="nav-item__label">แดชบอร์ด</span>
    <span class="nav-item__indicator"></span>
  </a>
  <a href="#" class="nav-item">
    <svg class="nav-item__icon"><!-- icon --></svg>
    <span class="nav-item__label">คิวงาน</span>
  </a>
</nav>
```

```css
.nav-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.nav-item--active {
  background: var(--color-cyan-dim);
  color: var(--color-cyan);
}

.nav-item--active:hover {
  background: rgba(0, 212, 255, 0.2);
  color: var(--color-cyan);
}

/* Active indicator bar */
.nav-item__indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.nav-item--active .nav-item__indicator {
  opacity: 1;
}

/* Mobile: horizontal nav */
@media (max-width: 768px) {
  .nav-list {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .nav-list::-webkit-scrollbar { display: none; }

  .nav-item__indicator {
    left: 50%;
    top: auto;
    bottom: 0;
    transform: translateX(-50%);
    width: 60%;
    height: 3px;
  }
}
```

---

## 4. 🔄 Multi-Dashboard Synchronization

ระบบซิงค์ข้อมูลข้ามแดชบอร์ด — ให้ทุกอุปกรณ์แสดงผลตรงกันเสมอ

### Unified State: Source of Truth เดียวกัน

> ทุกอุปกรณ์ดึงข้อมูลจากแหล่งเดียวกัน: **Google Sheets ผ่าน GAS API**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Mobile PWA  │────▶│              │◀────│ PC Dashboard │
│  (Technician)│     │  Google Sheets│     │   (Admin)    │
└─────────────┘     │  via GAS API  │     └─────────────┘
                     │  (Source of   │
┌─────────────┐     │   Truth)      │     ┌─────────────┐
│   Tablet     │────▶│              │◀────│  Other Device│
│  (Field Use) │     └──────────────┘     └─────────────┘
└─────────────┘
```

**หลักการสำคัญ:**
- ไม่มี local state ที่ขัดแย้งกับ server state
- ทุกการเปลี่ยนแปลงผ่าน GAS API เท่านั้น
- ใช้ optimistic update + server confirm เพื่อประสบการณ์ที่รวดเร็ว

```javascript
// State Manager — จัดการ unified state ข้ามอุปกรณ์
class DashboardState {
  constructor(gasApiEndpoint) {
    this.api = gasApiEndpoint;
    this.cache = new Map();
    this.subscribers = new Set();
    this.pollInterval = null;
  }

  // ดึงข้อมูลจาก Source of Truth
  async fetch(key) {
    const response = await fetch(`${this.api}?action=get&key=${key}`);
    const data = await response.json();
    this.cache.set(key, data);
    this.notify(key, data);
    return data;
  }

  // อัปเดตข้อมูล (ผ่าน API เท่านั้น)
  async update(key, value) {
    // Optimistic update — อัปเดต UI ทันที
    this.cache.set(key, value);
    this.notify(key, value);

    // ส่งไป server
    try {
      const response = await fetch(this.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', key, value })
      });
      const confirmed = await response.json();
      // ยืนยันจาก server
      this.cache.set(key, confirmed);
      this.notify(key, confirmed);
    } catch (err) {
      // Rollback ถ้าล้มเหลว
      console.error(`Sync failed for ${key}:`, err);
      await this.fetch(key); // รีเซ็ตจาก server
    }
  }

  // Subscribe เพื่อรับการแจ้งเตือนเมื่อข้อมูลเปลี่ยน
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(key, data) {
    this.subscribers.forEach(cb => cb(key, data));
  }

  // Polling — ดึงข้อมูลใหม่เป็นรอบ (สำหรับระบบที่ไม่มี WebSocket)
  startPolling(intervalMs = 30000) {
    this.pollInterval = setInterval(() => {
      for (const key of this.cache.keys()) {
        this.fetch(key);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

### Cross-Device Consistency: อัปเดตทันทีข้ามอุปกรณ์

> เมื่อ Mobile PWA อัปเดตข้อมูล → PC Dashboard เห็นการเปลี่ยนแปลงทันที

**กลยุทธ์:**
1. **Short Polling** (ทุก 30 วินาที) — สำหรับข้อมูลทั่วไป
2. **Push Notification** — สำหรับการเปลี่ยนแปลงสำคัญ (สถานะงานเปลี่ยน, งานใหม่เข้า)
3. **Visible State Check** — เมื่อแท็บกลับมา active ให้ refresh ทันที

```javascript
// ตรวจจับเมื่อแท็บกลับมา active → refresh ข้อมูล
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    dashboardState.fetch('jobs');
    dashboardState.fetch('kpi');
  }
});

// ฟังก์ชันสำหรับ auto-refresh KPI และ job list
async function refreshDashboard() {
  const [jobs, kpi] = await Promise.all([
    dashboardState.fetch('jobs'),
    dashboardState.fetch('kpi')
  ]);
  renderJobs(jobs);
  renderKPI(kpi);
}
```

### Contextual UI: ภาษาออกแบบเดียวกัน แต่เน้นต่างกันตามบทบาท

> ใช้ design language เดียวกันทุกอุปกรณ์ แต่จัดลำดับความสำคัญต่างกันตาม role

| Role | โฟกัสหลัก | Default View | ข้อมูลเด่น |
|------|-----------|-------------|-----------|
| **ช่างเทคนิค (Technician)** | คิวงานวันนี้ | Job Queue | งานถัดไป, เวลา, สถานะซ่อม |
| **แอดมิน (Admin)** | ภาพรวมทั้งหมด | Overview Dashboard | KPI รวม, รายได้, สถิติ |
| **เจ้าของร้าน (Owner)** | กำไร/ขาดทุน | Financial Summary | รายได้, ค่าใช้จ่าย, กำไรสุทธิ |

```javascript
// ตรวจสอบ role และปรับ UI ตามบทบาท
function applyRoleContext(role) {
  const root = document.documentElement;

  // ลบ context เดิม
  root.removeAttribute('data-role');

  // ตั้งค่าใหม่
  root.setAttribute('data-role', role);

  switch (role) {
    case 'technician':
      // แสดง job queue ด้านบน, ซ่อน financial
      root.style.setProperty('--dashboard-primary-section', 'job-queue');
      root.style.setProperty('--dashboard-secondary-section', 'stats');
      break;
    case 'admin':
      // แสดง overview ด้านบน, job queue รองลงมา
      root.style.setProperty('--dashboard-primary-section', 'overview');
      root.style.setProperty('--dashboard-secondary-section', 'job-queue');
      break;
    case 'owner':
      // แสดง financial ด้านบน
      root.style.setProperty('--dashboard-primary-section', 'financial');
      root.style.setProperty('--dashboard-secondary-section', 'overview');
      break;
  }
}
```

```css
/* จัดลำดับ section ตาม role */
[data-role="technician"] .section-job-queue { order: 1; }
[data-role="technician"] .section-stats { order: 2; }
[data-role="technician"] .section-financial { display: none; }

[data-role="admin"] .section-overview { order: 1; }
[data-role="admin"] .section-job-queue { order: 2; }
[data-role="admin"] .section-financial { order: 3; }

[data-role="owner"] .section-financial { order: 1; }
[data-role="owner"] .section-overview { order: 2; }
[data-role="owner"] .section-job-queue { order: 3; }
```

---

## 5. ✅ Implementation Checklist

คู่มือทีละขั้นตอนสำหรับปรับปรุง UI/UX ของแต่ละหน้า

### Phase 1: พื้นฐาน (Foundation) — วันที่ 1-2
- [ ] เพิ่ม CSS Variables ทั้งหมดใน `:root` ของไฟล์ CSS หลัก
- [ ] เพิ่ม `@property` declaration สำหรับ `--gradient-angle`
- [ ] สร้างไฟล์ `components/glass.css` แยกสำหรับ glass effects
- [ ] สร้างไฟล์ `components/buttons.css` สำหรับ animated buttons
- [ ] สร้างไฟล์ `components/cards.css` สำหรับ glass cards & KPI cards
- [ ] สร้างไฟล์ `components/nav.css` สำหรับ navigation
- [ ] ตั้งค่า `font-family` เป็น Noto Sans Thai + Inter

### Phase 2: หน้าหลัก (Main Dashboard) — วันที่ 3-4
- [ ] แทนที่ background ด้วย `--color-bg-primary` gradient
- [ ] ปรับ KPI cards เป็น glass style + counter animation
- [ ] ใส่ gradient border ให้การ์ดสำคัญ
- [ ] เพิ่ม micro-interactions (hover, active states)
- [ ] ปรับ navigation เป็นรูปแบบใหม่ + active indicator

### Phase 3: ระบบซิงค์ (Sync System) — วันที่ 5-6
- [ ] สร้าง `DashboardState` class สำหรับจัดการ state
- [ ] เชื่อมต่อกับ GAS API endpoint
- [ ] เพิ่ม polling mechanism (30 วินาที)
- [ ] เพิ่ม visibility change listener
- [ ] ทดสอบ cross-device sync (Mobile ↔ PC)

### Phase 4: Contextual UI (บทบาทผู้ใช้) — วันที่ 7
- [ ] เพิ่ม `data-role` attribute บน `<html>` element
- [ ] สร้าง CSS rules สำหรับแต่ละ role
- [ ] ทดสอบมุมมอง technician, admin, owner
- [ ] ตรวจสอบว่าข้อมูลสำคัญของแต่ละ role อยู่ด้านบน

### Phase 5: Responsive & Polish — วันที่ 8
- [ ] ทดสอบทุกหน้าบน Mobile (375px), Tablet (768px), Desktop (1280px)
- [ ] ปรับ spacing และ font size ตาม breakpoint
- [ ] เพิ่ม loading skeleton สำหรับข้อมูลที่โหลดช้า
- [ ] เพิ่ม error states สำหรับกรณี sync ล้มเหลว
- [ ] ตรวจสอบ accessibility (contrast, focus states, aria labels)

### Phase 6: Performance & Final — วันที่ 9-10
- [ ] วิเคราะห์ performance ด้วย Lighthouse
- [ ] เพิ่ม `will-change` สำหรับ elements ที่มี animation
- [ ] ลด `backdrop-filter` บนอุปกรณ์ที่ไม่รองรับ
- [ ] ทดสอบ PWA install & offline behavior
- [ ] สรุปและบันทึก known issues

---

## 6. 📱 Responsive Rules

กฎการออกแบบแบบ Mobile-first — เขียนสำหรับมือถือก่อน แล้วขยายขึ้น

### Breakpoints

```css
/* === Mobile First: ค่าเริ่มต้นสำหรับหน้าจอเล็กสุด === */

/* Mobile: 0 - 767px (default — ไม่ต้องใส่ media query) */
/* ออกแบบที่นี่ก่อน */

/* Tablet: 768px+ */
@media (min-width: 768px) {
  /* ปรับ grid columns, spacing, font sizes */
}

/* Desktop: 1280px+ */
@media (min-width: 1280px) {
  /* ใช้ layout เต็มรูปแบบ, sidebar, multi-column */
}

/* Large Desktop: 1536px+ */
@media (min-width: 1536px) {
  /* ขยาย max-width, เพิ่ม whitespace */
}
```

### Grid System

```css
/* Mobile: Single column */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  padding: var(--space-md);
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-lg);
    padding: var(--space-lg);
  }
}

/* Desktop: 3-4 columns */
@media (min-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-lg);
    padding: var(--space-xl);
    max-width: 1536px;
    margin: 0 auto;
  }
}
```

### Font Scaling

```css
/* Mobile: ขนาดเริ่มต้น */
html {
  font-size: 14px;
}

/* Tablet */
@media (min-width: 768px) {
  html { font-size: 15px; }
}

/* Desktop */
@media (min-width: 1280px) {
  html { font-size: 16px; }
}
```

### Navigation Responsive

```css
/* Mobile: Bottom tab bar */
.nav-sidebar {
  display: none;
}

.nav-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur-heavy));
  border-top: 1px solid var(--glass-border);
  padding: var(--space-xs) 0;
  z-index: var(--z-sticky);
}

/* Desktop: Sidebar */
@media (min-width: 1280px) {
  .nav-bottom {
    display: none;
  }

  .nav-sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(var(--glass-blur-heavy));
    border-right: 1px solid var(--glass-border);
    padding: var(--space-lg) var(--space-md);
    z-index: var(--z-sticky);
  }
}
```

### Touch Targets (ขนาดพื้นที่สัมผัส)

```css
/* ปุ่มและลิงก์ต้องมีขนาดอย่างน้อย 44x44px สำหรับมือถือ */
@media (pointer: coarse) {
  .btn,
  .nav-item,
  .kpi-card {
    min-height: 44px;
    min-width: 44px;
  }

  .btn {
    padding: var(--space-sm) var(--space-lg);
  }

  .nav-item {
    padding: var(--space-md);
  }
}
```

### Performance: ลด Glass Effects บนอุปกรณ์อ่อนแอ

```css
/* ตรวจจับอุปกรณ์ที่ไม่รองรับ backdrop-filter */
@supports not (backdrop-filter: blur(16px)) {
  .glass-surface,
  .glass-card,
  .kpi-card,
  .btn-secondary {
    background: var(--color-bg-surface);
    backdrop-filter: none;
  }
}

/* ลด animation สำหรับผู้ใช้ที่ตั้งค่า reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📌 สรุปหลักการสำคัญ

| หมวด | หลักการ |
|------|---------|
| **Visual** | Hyper-Glassmorphism + Gradient Borders + 3-Level Depth |
| **Interaction** | Micro-interactions ทุกการสัมผัส — hover, active, focus |
| **State** | Unified State จาก Google Sheets ผ่าน GAS API |
| **Sync** | Cross-device real-time ด้วย polling + visibility check |
| **Context** | ปรับ UI ตาม role — technician, admin, owner |
| **Responsive** | Mobile-first, 3 breakpoints (768px, 1280px, 1536px) |
| **Performance** | `@supports` fallback + `prefers-reduced-motion` |
| **Accessibility** | 44px touch targets, focus-visible, aria labels |

---

*สร้างโดย Hermes Agent — COMPHONE SUPER APP Modernization Sprint 3b*
