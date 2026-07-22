'use strict';
function _doLogin(event) {
  event.preventDefault();
  console.log('[Dashboard] Attempting login...');
  
  const username = document.getElementById('login-user')?.value;
  const password = document.getElementById('login-pass')?.value;
  
  if (!username || !password) {
    alert('กรุณากรอก username และ password');
    return;
  }
  
  const gasUrl = typeof getGasUrl === 'function' ? getGasUrl() : (window.GAS_CONFIG && window.GAS_CONFIG.url) || '';
  if (!gasUrl) {
    alert('GAS URL ไม่ได้ตั้งค่า');
    return;
  }
  
  const qs = new URLSearchParams({ action: 'loginUser', username: username, password: password, _t: Date.now() }).toString();
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
  
  fetch(gasUrl + '?' + qs, { redirect: 'follow' })
    .then(res => res.json())
    .then(res => {
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
      if (res.success || res.valid) {
        localStorage.setItem('comphone_auth_session', JSON.stringify(res));
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        loadDashboard();
      } else {
        alert('เข้าสู่ระบบไม่สำเร็จ: ' + (res.error || res.message || 'Unknown error'));
      }
    })
    .catch(err => {
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
      console.error('[Login] Error:', err);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message);
    });
}
