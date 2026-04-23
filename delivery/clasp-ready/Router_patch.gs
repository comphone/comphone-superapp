// COMPHONE SUPER APP V5.5
// ============================================================
// Router_patch.gs — เพิ่ม case นี้ใน Router.gs
// วางไว้ใน dispatchActionV55_() ก่อน default case
// ============================================================

// ── วิธีใช้ ──────────────────────────────────────────────────
// เปิด Router.gs → ค้นหา "case 'getDashboardData':"
// เพิ่ม 2 case ด้านล่างนี้ก่อน case นั้น:

/*

      // ── Customer Portal (Public — ไม่ต้อง Auth) ──
      case 'getJobStatusPublic':
        return getJobStatusPublic(
          payload.job_id || payload.jobId || '',
          payload.phone || ''
        );

*/

// ── และใน AUTH_REQUIRED_ACTIONS_ ──────────────────────────────
// ไม่ต้องเพิ่ม 'getJobStatusPublic' เพราะเป็น public action
// ตรวจสอบว่า auth check ใน dispatchActionV55_ ข้าม public actions ได้

// ── ตัวอย่าง URL สำหรับลูกค้า ────────────────────────────────
// https://[your-pwa-url]/customer_portal.html?job=J0001&api=[WEB_APP_URL]
// หรือ QR Code ที่ generate จาก generateJobQR() ใน GAS
