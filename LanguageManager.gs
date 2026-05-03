/**
 * LanguageManager.gs — Phase 34: Multi-language Support (EN/TH)
 * Features: Language detection, Translation API, User preference storage
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

// ── Translation Dictionary (EN → TH) ──
const TRANSLATIONS = {
  // Navigation
  'Dashboard': 'แดชบอร์ด',
  'Jobs': 'งาน',
  'Customers': 'ลูกค้า',
  'Inventory': 'คลังสินค้า',
  'Reports': 'รายงาน',
  'Settings': 'ตั้งค่า',
  
  // Common actions
  'Save': 'บันทึก',
  'Cancel': 'ยกเลิก',
  'Delete': 'ลบ',
  'Edit': 'แก้ไข',
  'View': 'ดู',
  'Search': 'ค้นหา',
  'Filter': 'กรอง',
  'Refresh': 'รีเฟรช',
  'Export': 'ส่งออก',
  'Import': 'นำเข้า',
  
  // Job statuses
  'Pending': 'รอดำเนินการ',
  'In Progress': 'กำลังดำเนินการ',
  'Completed': 'เสร็จสิ้น',
  'Cancelled': 'ยกเลิก',
  'On Hold': 'พักชั่วคราว',
  
  // Customer
  'Customer Name': 'ชื่อลูกค้า',
  'Phone': 'เบอร์โทรศัพท์',
  'Email': 'อีเมล',
  'Address': 'ที่อยู่',
  
  // Inventory
  'Product Name': 'ชื่อสินค้า',
  'Quantity': 'จำนวน',
  'Unit Price': 'ราคาต่อหน่วย',
  'Total': 'รวม',
  'In Stock': 'มีในสต็อก',
  'Low Stock': 'สต็อกต่ำ',
  'Out of Stock': 'สินค้าหมด',
  
  // Messages
  'Success': 'สำเร็จ',
  'Error': 'ผิดพลาด',
  'Warning': 'คำเตือน',
  'Info': 'ข้อมูล',
  'Loading...': 'กำลังโหลด...',
  'No data available': 'ไม่มีข้อมูล',
  'Are you sure?': 'คุณแน่ใจหรือไม่?',
  
  // Dashboard
  'Total Jobs': 'งานทั้งหมด',
  'Active Jobs': 'งานที่กำลังดำเนินการ',
  'Revenue': 'รายได้',
  'Profit': 'กำไร',
  'Today': 'วันนี้',
  'This Week': 'สัปดาห์นี้',
  'This Month': 'เดือนนี้',
  
  // Login/Auth
  'Login': 'เข้าสู่ระบบ',
  'Logout': 'ออกจากระบบ',
  'Username': 'ชื่อผู้ใช้',
  'Password': 'รหัสผ่าน',
  'Forgot Password?': 'ลืมรหัสผ่าน?',
  
  // System
  'Version': 'เวอร์ชัน',
  'Last Updated': 'อัปเดตล่าสุด',
  'Powered by': 'ขับเคลื่อนโดย'
};

/**
 * Get translation for a key
 * @param {string} key - English text
 * @param {string} lang - Target language ('en' or 'th')
 * @returns {string} Translated text
 */
function translate_(key, lang) {
  if (!key || lang === 'en') return key;
  return TRANSLATIONS[key] || key;
}

/**
 * API: Get user's language preference
 */
function getUserLanguageAPI(params) {
  const userId = params.userId || params.userid || 'default';
  const props = PropertiesService.getUserProperties();
  const lang = props.getProperty('USER_LANG_' + userId) || 'th'; // Default: Thai
  
  return {
    success: true,
    userId: userId,
    language: lang,
    availableLanguages: [
      { code: 'en', name: 'English' },
      { code: 'th', name: 'ไทย' }
    ]
  };
}

/**
 * API: Set user's language preference
 */
function setUserLanguageAPI(params) {
  const userId = params.userId || params.userid || 'default';
  const lang = params.language || params.lang || 'th';
  
  if (!['en', 'th'].includes(lang)) {
    return { success: false, error: 'Invalid language code. Use "en" or "th".' };
  }
  
  const props = PropertiesService.getUserProperties();
  props.setProperty('USER_LANG_' + userId, lang);
  
  return {
    success: true,
    userId: userId,
    language: lang,
    message: lang === 'th' ? 'เปลี่ยนภาษาเป็นไทยเรียบร้อยแล้ว' : 'Language changed to English successfully'
  };
}

/**
 * API: Get translations for a language
 */
function getTranslationsAPI(params) {
  const lang = params.language || params.lang || 'th';
  const keys = params.keys ? (Array.isArray(params.keys) ? params.keys : JSON.parse(params.keys)) : null;
  
  let translations = {};
  
  if (keys && Array.isArray(keys)) {
    // Return specific keys
    keys.forEach(key => {
      translations[key] = translate_(key, lang);
    });
  } else {
    // Return all translations
    if (lang === 'th') {
      translations = TRANSLATIONS;
    } else {
      // For English, return keys as values (identity mapping)
      Object.keys(TRANSLATIONS).forEach(key => {
        translations[key] = key;
      });
    }
  }
  
  return {
    success: true,
    language: lang,
    translations: translations,
    count: Object.keys(translations).length
  };
}

/**
 * API: Detect browser language
 */
function detectLanguageAPI(params) {
  const userAgent = params.userAgent || params.useragent || '';
  const acceptLang = params.acceptLanguage || params.acceptlanguage || '';
  
  // Simple detection from Accept-Language header
  let detected = 'th'; // Default: Thai
  
  if (acceptLang) {
    const langs = acceptLang.split(',').map(l => l.split(';')[0].trim().toLowerCase());
    if (langs.includes('en') || langs.includes('en-us') || langs.includes('en-gb')) {
      detected = 'en';
    }
  }
  
  return {
    success: true,
    detected: detected,
    detectedName: detected === 'th' ? 'ไทย' : 'English',
    availableLanguages: [
      { code: 'en', name: 'English' },
      { code: 'th', name: 'ไทย' }
    ]
  };
}

/**
 * Helper: Translate text in GAS backend (for system messages)
 */
function translateText(text, lang) {
  return translate_(text, lang || 'th');
}

/**
 * Helper: Get system message in user's language
 */
function getSystemMessage(messageKey, lang) {
  const messages = {
    'en': {
      'job_created': 'Job created successfully',
      'job_updated': 'Job updated successfully',
      'job_deleted': 'Job deleted successfully',
      'customer_saved': 'Customer saved successfully',
      'inventory_updated': 'Inventory updated successfully',
      'backup_created': 'Backup created successfully',
      'login_success': 'Login successful',
      'access_denied': 'Access denied',
      'invalid_request': 'Invalid request',
      'server_error': 'Internal server error'
    },
    'th': {
      'job_created': 'สร้างงานสำเร็จแล้ว',
      'job_updated': 'อัปเดตงานสำเร็จแล้ว',
      'job_deleted': 'ลบงานสำเร็จแล้ว',
      'customer_saved': 'บันทึกลูกค้าสำเร็จแล้ว',
      'inventory_updated': 'อัปเดตคลังสินค้าสำเร็จแล้ว',
      'backup_created': 'สร้างสำรองข้อมูลสำเร็จแล้ว',
      'login_success': 'เข้าสู่ระบบสำเร็จ',
      'access_denied': 'ปฏิเสธการเข้าถึง',
      'invalid_request': 'คำร้องไม่ถูกต้อง',
      'server_error': 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    }
  };
  
  const langMessages = messages[lang || 'th'] || messages['th'];
  return langMessages[messageKey] || messageKey;
}
