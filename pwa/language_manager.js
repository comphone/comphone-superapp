/**
 * Language Manager for COMPHONE SUPER APP PWA
 * Phase 34 Frontend: Multi-language Support (EN/TH)
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

// ── Translation Cache ──
let translationCache = {};
let currentLanguage = 'th'; // Default: Thai
let isLoading = false;

// ── Backend Translation Dictionary (Fallback) ──
const FALLBACK_TRANSLATIONS = {
  'en': {
    // Navigation
    'Dashboard': 'Dashboard',
    'Jobs': 'Jobs',
    'Customers': 'Customers',
    'Inventory': 'Inventory',
    'Reports': 'Reports',
    'Settings': 'Settings',
    
    // Common actions
    'Save': 'Save',
    'Cancel': 'Cancel',
    'Delete': 'Delete',
    'Edit': 'Edit',
    'View': 'View',
    'Search': 'Search',
    'Filter': 'Filter',
    'Refresh': 'Refresh',
    'Export': 'Export',
    'Import': 'Import',
    
    // Job statuses
    'Pending': 'Pending',
    'In Progress': 'In Progress',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
    'On Hold': 'On Hold',
    
    // Customer
    'Customer Name': 'Customer Name',
    'Phone': 'Phone',
    'Email': 'Email',
    'Address': 'Address',
    
    // Inventory
    'Product Name': 'Product Name',
    'Quantity': 'Quantity',
    'Unit Price': 'Unit Price',
    'Total': 'Total',
    'In Stock': 'In Stock',
    'Low Stock': 'Low Stock',
    'Out of Stock': 'Out of Stock',
    
    // Messages
    'Success': 'Success',
    'Error': 'Error',
    'Warning': 'Warning',
    'Info': 'Info',
    'Loading...': 'Loading...',
    'No data available': 'No data available',
    'Are you sure?': 'Are you sure?',
    
    // Dashboard
    'Total Jobs': 'Total Jobs',
    'Active Jobs': 'Active Jobs',
    'Revenue': 'Revenue',
    'Profit': 'Profit',
    'Today': 'Today',
    'This Week': 'This Week',
    'This Month': 'This Month',
    
    // Login/Auth
    'Login': 'Login',
    'Logout': 'Logout',
    'Username': 'Username',
    'Password': 'Password',
    'Forgot Password?': 'Forgot Password?',
    
    // System
    'Version': 'Version',
    'Last Updated': 'Last Updated',
    'Powered by': 'Powered by',
    
    // Language Toggle
    'Switch to English': 'Switch to English',
    'Switch to Thai': 'Switch to Thai',
    'Language': 'Language'
  },
  'th': {
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
    'Powered by': 'ขับเคลื่อนโดย',
    
    // Language Toggle
    'Switch to English': 'เปลี่ยนเป็น English',
    'Switch to Thai': 'เปลี่ยนเป็นไทย',
    'Language': 'ภาษา'
  }
};

/**
 * Initialize Language Manager
 */
async function initLanguageManager() {
  try {
    // 1. Load saved language from localStorage
    const savedLang = localStorage.getItem('comphone_language');
    if (savedLang && ['en', 'th'].includes(savedLang)) {
      currentLanguage = savedLang;
    } else {
      // 2. Detect from browser
      currentLanguage = detectBrowserLanguage();
    }
    
    // 3. Try to load from backend (optional - fallback if fails)
    try {
      await loadTranslationsFromBackend();
    } catch (e) {
      console.warn('[LanguageManager] Backend load failed, using fallback:', e.message);
      translationCache = FALLBACK_TRANSLATIONS[currentLanguage] || FALLBACK_TRANSLATIONS['th'];
    }
    
    // 4. Apply translations to page
    applyTranslations();
    
    // 5. Update toggle button state
    updateLanguageToggleUI();
    
    console.log(`[LanguageManager] Initialized: ${currentLanguage}`);
  } catch (error) {
    console.error('[LanguageManager] Init error:', error);
    currentLanguage = 'th';
    translationCache = FALLBACK_TRANSLATIONS['th'];
  }
}

/**
 * Detect browser language
 */
function detectBrowserLanguage() {
  try {
    const lang = navigator.language || navigator.userLanguage || 'th';
    return lang.toLowerCase().startsWith('en') ? 'en' : 'th';
  } catch (e) {
    return 'th';
  }
}

/**
 * Load translations from GAS Backend
 */
async function loadTranslationsFromBackend() {
  if (isLoading) return;
  isLoading = true;
  
  try {
    const response = await fetch(
      `${window.COMPHONE_CONFIG?.gasUrl || ''}?action=getTranslations&language=${currentLanguage}`
    );
    const result = await response.json();
    
    if (result.success && result.translations) {
      translationCache = result.translations;
      console.log(`[LanguageManager] Loaded ${result.count} translations from backend`);
    } else {
      throw new Error('Invalid backend response');
    }
  } catch (error) {
    console.warn('[LanguageManager] Backend fetch failed:', error);
    // Use fallback
    translationCache = FALLBACK_TRANSLATIONS[currentLanguage] || FALLBACK_TRANSLATIONS['th'];
  } finally {
    isLoading = false;
  }
}

/**
 * Translate text
 * @param {string} key - Text to translate (English)
 * @param {object} params - Optional parameters for interpolation
 * @returns {string} Translated text
 */
function t(key, params = {}) {
  if (!key) return '';
  
  // Get translation
  let translated = translationCache[key] || FALLBACK_TRANSLATIONS[currentLanguage]?.[key] || key;
  
  // Simple interpolation: {param} -> value
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      translated = translated.replace(`{${param}}`, params[param]);
    });
  }
  
  return translated;
}

/**
 * Switch language
 * @param {string} lang - 'en' or 'th'
 */
async function switchLanguage(lang) {
  if (!['en', 'th'].includes(lang)) {
    console.error('[LanguageManager] Invalid language:', lang);
    return;
  }
  
  if (lang === currentLanguage) return;
  
  const oldLang = currentLanguage;
  currentLanguage = lang;
  
  // Save to localStorage
  localStorage.setItem('comphone_language', lang);
  
  // Try to save to backend (optional)
  try {
    await fetch(
      `${window.COMPHONE_CONFIG?.gasUrl || ''}?action=setUserLanguage&language=${lang}&userId=${getCurrentUserId() || 'default'}`
    );
  } catch (e) {
    console.warn('[LanguageManager] Backend save failed:', e);
  }
  
  // Reload translations
  translationCache = FALLBACK_TRANSLATIONS[lang] || FALLBACK_TRANSLATIONS['th'];
  
  // Try to load from backend
  try {
    await loadTranslationsFromBackend();
  } catch (e) {
    // Already using fallback
  }
  
  // Apply to page
  applyTranslations();
  updateLanguageToggleUI();
  
  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('languageChanged', { 
    detail: { oldLang, newLang: lang } 
  }));
  
  console.log(`[LanguageManager] Switched to: ${lang}`);
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
  try {
    // Find all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        // Check if element has specific attribute to update
        if (el.hasAttribute('data-i18n-attr')) {
          const attr = el.getAttribute('data-i18n-attr');
          el.setAttribute(attr, t(key));
        } else {
          // Update textContent, preserve child nodes like icons
          const iconElements = el.querySelectorAll('i, .icon, .material-icons, .bi');
          if (iconElements.length > 0) {
            // Has icons - only update text nodes
            el.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                node.textContent = t(key);
              }
            });
          } else {
            el.textContent = t(key);
          }
        }
      }
    });
    
    // Update placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });
    
    // Update title attributes
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.title = t(key);
      }
    });
    
    console.log(`[LanguageManager] Applied translations to ${elements.length} elements`);
  } catch (error) {
    console.error('[LanguageManager] Apply error:', error);
  }
}

/**
 * Create Language Toggle Button (for navbar/header)
 * @param {string} containerId - ID of container to append button
 */
function createLanguageToggle(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[LanguageManager] Container not found:', containerId);
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'language-toggle-btn';
  button.className = 'btn btn-sm btn-outline-secondary';
  button.setAttribute('data-i18n-title', 'Language');
  button.title = t('Language');
  
  button.innerHTML = `
    <i class="bi bi-translate"></i>
    <span id="current-lang-label">${currentLanguage === 'th' ? 'ไทย' : 'EN'}</span>
  `;
  
  button.onclick = () => {
    const newLang = currentLanguage === 'th' ? 'en' : 'th';
    switchLanguage(newLang);
  };
  
  container.appendChild(button);
  console.log('[LanguageManager] Toggle button created');
}

/**
 * Update Language Toggle UI state
 */
function updateLanguageToggleUI() {
  const label = document.getElementById('current-lang-label');
  if (label) {
    label.textContent = currentLanguage === 'th' ? 'ไทย' : 'EN';
  }
  
  const button = document.getElementById('language-toggle-btn');
  if (button) {
    button.title = t('Language');
  }
}

/**
 * Get current language
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get translation dictionary (for bulk use)
 */
function getTranslations() {
  return { ...translationCache };
}

/**
 * Helper: Get current user ID (from session/auth)
 */
function getCurrentUserId() {
  try {
    const session = JSON.parse(localStorage.getItem('comphone_session') || '{}');
    return session.userId || session.username || 'default';
  } catch (e) {
    return 'default';
  }
}

// ── Auto-init on DOM ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguageManager);
} else {
  initLanguageManager();
}

// ── Export for use in other modules ──
window.LanguageManager = {
  t,
  switchLanguage,
  getCurrentLanguage,
  getTranslations,
  createLanguageToggle,
  applyTranslations,
  initLanguageManager
};
