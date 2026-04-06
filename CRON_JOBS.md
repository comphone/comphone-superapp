# CRON Jobs Configuration - Automatic Tasks

## ⏰ Daily Summary Jobs (ประหยัด 30-40%)

### 1. **Morning Summary - 06:00 น.**
- ส่งสรุปงานประจำวัน
- ตรวจสต๊อคสินค้า
- แจ้งงานเร่งด่วน
- ตรวจสถานะ GPS ช่าง

**Benefit:** ไม่ต้องรอคำถาม, ออก API 1 ครั้ง/วัน

### 2. **Mid-day Check - 12:00 น.**
- สรุปงานที่กำลังดำเนินการ
- แจ้งงานที่เสร็จแล้ว
- ตรวจสต๊อค Critical items

**Benefit:** อัปเดตสรุป ไม่เรียก API

### 3. **Evening Report - 18:00 น.**
- รายงานสรุปประจำวัน
- ประมาณการวันถัดไป
- Backup ฐานข้อมูล

**Benefit:** เตรียมข้อมูลให้พร้อม

### 4. **Weekly Inventory Check - วันจันทร์ 09:00 น.**
- สรุปสต๊อครายละเอียด
- แจ้งเตือนสินค้าต้องสั่ง
- ตรวจสอบสินค้าเสื่อมค่า

**Benefit:** Plan สั่งของล่วงหน้า

---

## 🛰️ GPS Periodic Updates (ประหยัด 20-30%)

### 5. **Technician Location Update - ทุก 2 ชม.**
- เช็ค GPS ช่างโต้
- อัปเดตตำแหน่ง
- ตรวจสอบการเคลื่อนไหว

**Time:** 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 น.
**Benefit:** ไม่ต้องใช้ API on-demand

---

## 📋 Database Maintenance (ประหยัด 15-20%)

### 6. **Cache Refresh - ทุกชั่วโมง**
- โหลด DB_JOBS ใหม่
- โหลด DB_INVENTORY ใหม่
- อัปเดต cache (60 min TTL)

**Benefit:** Query ครั้งต่อไปไม่ต้อง read file

### 7. **Daily Backup - 22:00 น.**
- Copy DB_JOBS.csv → backup/
- Copy DB_CUSTOMERS.csv → backup/
- Copy DB_INVENTORY.csv → backup/

**Benefit:** Data safety

---

## 💰 Expected Savings

| Task | Normal Cost | Cron Cost | Savings |
|------|----------|-----------|---------|
| 10 job queries/day | 10 API calls | 1 morning summary | 90% |
| 20 status checks/day | 20 API calls | 6 scheduled checks | 70% |
| Inventory checks | 5+ checks | 1 daily check | 80% |
| **Total Daily** | ~50+ API calls | ~10 API calls | **80%** ✅ |

---

## 🚀 Implementation Plan

### Phase 1: Setup (Today)
- [ ] Install cron scheduler
- [ ] Create cron job scripts
- [ ] Test morning summary

### Phase 2: Expand (This week)
- [ ] Add mid-day checks
- [ ] Enable GPS updates
- [ ] Cache refresh

### Phase 3: Optimize (Next week)
- [ ] Analyze API usage
- [ ] Fine-tune intervals
- [ ] Add more automations

---

## 📝 How to Enable Cron Jobs

**Windows Task Scheduler:**
```
OpenClaw → Settings → Scheduler
Add periodic task for: cache_refresh.py, daily_summary.py, gps_update.py
```

**Configuration Example:**
```json
{
  "jobs": [
    {
      "name": "morning_summary",
      "schedule": "0 8 * * *",
      "script": "daily_summary.py",
      "enabled": true
    },
    {
      "name": "gps_update",
      "schedule": "0 */2 * * *",
      "script": "gps_periodic.py",
      "enabled": true
    },
    {
      "name": "cache_refresh",
      "schedule": "0 * * * *",
      "script": "cache_refresh.py",
      "enabled": true
    }
  ]
}
```

---

**Status:** 📋 Ready to implement
**Estimated Savings:** 80% API cost reduction
**Setup Time:** 30 minutes
