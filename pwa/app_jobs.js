// ===== JOB CARD RENDER =====
function renderJobCard(job) {
  const statusMap = {
    urgent: { badge: 'badge-urgent', label: 'ด่วนมาก', border: 'urgent' },
    inprog: { badge: 'badge-inprog', label: 'กำลังซ่อม', border: 'inprog' },
    waiting: { badge: 'badge-wait', label: 'รอชิ้นส่วน', border: 'waiting' },
    done: { badge: 'badge-done', label: 'เสร็จแล้ว', border: 'done' },
    new: { badge: 'badge-new', label: 'รับเครื่องแล้ว', border: '' }
  };
  const s = statusMap[job.status] || statusMap.new;
  const slaHtml = job.sla < 0
    ? `<div class="sla-timer sla-breach"><i class="bi bi-clock-fill"></i> เกิน SLA ${Math.abs(job.sla)} นาที</div>`
    : job.sla < 120
    ? `<div class="sla-timer sla-warn"><i class="bi bi-clock"></i> เหลือ ${job.sla} นาที</div>`
    : `<div class="sla-timer sla-ok"><i class="bi bi-clock"></i> เหลือ ${Math.floor(job.sla/60)} ชม. ${job.sla%60} นาที</div>`;

  return `
    <div class="job-card ${s.border}" onclick="showJobDetail('${job.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="job-id">${job.id}</div>
          <div class="job-title">${job.title}</div>
          <div class="job-meta"><i class="bi bi-person-fill"></i> ${job.customer} &nbsp;|&nbsp; <i class="bi bi-telephone-fill"></i> ${job.phone}</div>
        </div>
        <span class="job-badge ${s.badge}">${s.label}</span>
      </div>
      ${job.status !== 'done' ? `<div style="margin-top:6px">${slaHtml}</div>` : ''}
      <div class="job-actions" onclick="event.stopPropagation()">
        ${job.status === 'new' ? `
          <button class="job-act-btn btn-primary-sm" onclick="assignJob('${job.id}')"><i class="bi bi-person-check"></i> มอบหมายช่าง</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-eye"></i> ดูรายละเอียด</button>
        ` : job.status === 'done' ? `
          <button class="job-act-btn btn-primary-sm" onclick="if(typeof openBillingModal==='function')openBillingModal('${job.id}');else showToast('กำลังออกใบเสร็จ...')"><i class="bi bi-file-earmark-pdf"></i> ออกใบเสร็จ</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-eye"></i> ดู</button>
        ` : `
          <button class="job-act-btn btn-primary-sm" onclick="openCameraForJob('${job.id}')"><i class="bi bi-camera"></i> รูปหน้างาน</button>
          <button class="job-act-btn btn-success-sm" onclick="markJobDone('${job.id}')"><i class="bi bi-check2"></i> เสร็จแล้ว</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail('${job.id}')"><i class="bi bi-three-dots"></i></button>
        `}
      </div>
    </div>
  `;
}

// ===== JOBS PAGE =====
function renderJobsPage(filter = 'all') {
  const list = document.getElementById('jobs-list');
  let jobs = APP.jobs;
  if (filter !== 'all') jobs = jobs.filter(j => j.status === filter);
  list.innerHTML = jobs.length ? jobs.map(j => renderJobCard(j)).join('') : `<div style="text-align:center;padding:40px;color:#9ca3af"><i class="bi bi-clipboard2-x" style="font-size:40px;display:block;margin-bottom:8px"></i>ไม่พบงาน</div>`;
}

// ===== SMART SEARCH SYSTEM =====
let searchTimeout = null;
let searchHistory = JSON.parse(localStorage.getItem('comphone_search_history') || '[]');

function filterJobs(val) {
  const q = val.toLowerCase().trim();
  
  // Clear previous timeout
  if (searchTimeout) clearTimeout(searchTimeout);
  
  // Show loading state
  const list = document.getElementById('jobs-list');
  if (q.length > 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="bi bi-search" style="font-size:24px;display:block;margin-bottom:8px"></i>กำลังค้นหา...</div>`;
  }
  
  // Debounce search for 300ms
  searchTimeout = setTimeout(() => {
    if (q.length === 0) {
      renderJobsPage();
      hideSearchResults();
      return;
    }
    
    // Save to search history
    if (q.length > 2 && !searchHistory.includes(q)) {
      searchHistory.unshift(q);
      searchHistory = searchHistory.slice(0, 10); // Keep only last 10
      localStorage.setItem('comphone_search_history', JSON.stringify(searchHistory));
    }
    
    const filtered = APP.jobs.filter(j =>
      j.id.toLowerCase().includes(q) ||
      j.title.toLowerCase().includes(q) ||
      j.customer.toLowerCase().includes(q) ||
      j.phone.includes(q) ||
      (j.tech && j.tech.toLowerCase().includes(q))
    );
    
    if (filtered.length > 0) {
      list.innerHTML = filtered.map(j => renderJobCard(j)).join('');
      showSearchResults(filtered.length, APP.jobs.length);
    } else {
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <i class="bi bi-search" style="font-size:48px;display:block;margin-bottom:12px;opacity:0.5"></i>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">ไม่พบผลลัพธ์สำหรับ "${val}"</div>
          <div style="font-size:13px">ลองค้นหาด้วย Job ID, ชื่อลูกค้า, หรือเบอร์โทร</div>
        </div>
      `;
    }
  }, 300);
}

function showSearchResults(found, total) {
  let resultsDiv = document.getElementById('search-results');
  if (!resultsDiv) {
    resultsDiv = document.createElement('div');
    resultsDiv.id = 'search-results';
    resultsDiv.style.cssText = 'text-align:center;padding:12px;color:var(--accent-blue);font-size:14px;font-weight:600';
    document.getElementById('page-jobs').insertBefore(resultsDiv, document.getElementById('jobs-list'));
  }
  resultsDiv.textContent = `พบ ${found} รายการ จากทั้งหมด ${total} รายการ`;
  resultsDiv.style.display = 'block';
}

function hideSearchResults() {
  const resultsDiv = document.getElementById('search-results');
  if (resultsDiv) resultsDiv.style.display = 'none';
}

// Search with suggestions
function initSmartSearch(searchInputId) {
  const input = document.getElementById(searchInputId);
  if (!input) return;
  
  // Create suggestion dropdown
  let dropdown = document.getElementById('search-suggestions');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-suggestions';
    dropdown.className = 'search-results';
    input.parentNode.appendChild(dropdown);
  }
  
  input.addEventListener('focus', () => {
    if (searchHistory.length > 0 && input.value === '') {
      showSearchSuggestions(dropdown);
    }
  });
  
  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    if (val.length === 0) {
      dropdown.classList.remove('active');
      hideSearchResults();
    }
  });
  
  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('active'), 200);
  });
}

function showSearchSuggestions(dropdown) {
  if (searchHistory.length === 0) return;
  
  dropdown.innerHTML = `
    <div style="padding:10px 18px;font-size:12px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--glass-border)">
      <i class="bi bi-clock-history"></i> ค้นหาล่าสุด
    </div>
    ${searchHistory.slice(0, 5).map(term => `
      <div class="search-result-item" onclick="selectSearchTerm('${term}')">
        <i class="bi bi-search" style="margin-right:8px;color:var(--text-muted)"></i>
        ${term}
      </div>
    `).join('')}
  `;
  dropdown.classList.add('active');
}

function selectSearchTerm(term) {
  const searchInput = document.querySelector('#page-jobs .search-bar');
  if (searchInput) {
    searchInput.value = term;
    filterJobs(term);
  }
  const dropdown = document.getElementById('search-suggestions');
  if (dropdown) dropdown.classList.remove('active');
}

function filterByStatus(status, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderJobsPage(status);
}

function renderJobsBadge() {
  const urgent = APP.jobs.filter(j => j.status === 'urgent' || j.status === 'new').length;
  const badge = document.getElementById('jobs-badge');
  if (badge) { badge.textContent = urgent; badge.style.display = urgent ? 'flex' : 'none'; }
}

// ===== JOB DETAIL MODAL =====
function showJobDetail(jobId) {
  const job = APP.jobs.find(j => j.id === jobId);
  if (!job) return;
  const s = { urgent:'badge-urgent', inprog:'badge-inprog', waiting:'badge-wait', done:'badge-done', new:'badge-new' };
  const sl = { urgent:'ด่วนมาก', inprog:'กำลังซ่อม', waiting:'รอชิ้นส่วน', done:'เสร็จแล้ว', new:'รับเครื่องแล้ว' };

  document.getElementById('modal-job-content').innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div class="job-id">${job.id}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${job.title}</div>
        </div>
        <span class="job-badge ${s[job.status]}">${sl[job.status]}</span>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div><div style="color:#9ca3af;font-weight:600">ลูกค้า</div><div style="font-weight:700;color:#111827">${job.customer}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">เบอร์โทร</div><div style="font-weight:700;color:#0d6efd">${job.phone}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">ราคาประเมิน</div><div style="font-weight:700;color:#10b981">฿${job.price.toLocaleString()}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">ช่าง</div><div style="font-weight:700;color:#111827">${job.tech || 'ยังไม่ได้มอบหมาย'}</div></div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div class="section-label">รูปหน้างาน</div>
        <div class="photo-row">
          <div class="photo-thumb-sm"><i class="bi bi-image"></i></div>
          <div class="photo-thumb-sm"><i class="bi bi-image"></i></div>
          <div class="photo-add-sm" onclick="openCameraForJob('${job.id}')"><i class="bi bi-plus"></i></div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="job-act-btn btn-primary-sm" style="flex:1;padding:12px" onclick="openCameraForJob('${job.id}');closeModal('modal-job')">
          <i class="bi bi-camera"></i> ถ่ายรูป
        </button>
        <button class="job-act-btn btn-success-sm" style="flex:1;padding:12px" onclick="markJobDone('${job.id}');closeModal('modal-job')">
          <i class="bi bi-check2-circle"></i> เสร็จแล้ว
        </button>
      </div>
      <button class="job-act-btn btn-gray-sm" style="width:100%;margin-top:8px;padding:12px" onclick="callCustomer('${job.phone}')">
        <i class="bi bi-telephone-fill"></i> โทร ${job.customer}
      </button>
      ${job.status === 'done' ? `
      <button class="job-act-btn" style="width:100%;margin-top:8px;padding:12px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:12px;font-weight:700;cursor:pointer" id="btn-create-warranty-${job.id}">
        <i class="bi bi-shield-check"></i> สร้างใบรับประกัน
      </button>` : ''}
    </div>
  `;
  const modalJob = document.getElementById('modal-job');
  if (modalJob) modalJob.classList.remove('hidden');
  // เพิ่ม event listener ปุ่มรับประกัน (ถ้ามี)
  const warrantyBtn = document.getElementById('btn-create-warranty-' + jobId);
  if (warrantyBtn && typeof createWarrantyModal === 'function') {
    warrantyBtn.addEventListener('click', () => {
      closeModal('modal-job');
      createWarrantyModal(job.id, { customer_name: job.customer, description: job.title });
    });
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

