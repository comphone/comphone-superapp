// ===== JOB CARD RENDER =====
function renderJobCard(job) {
  const statusMap = {
    urgent: { badge: 'badge-urgent', label: 'Urgent', border: 'urgent' },
    inprog: { badge: 'badge-inprog', label: 'In progress', border: 'inprog' },
    waiting: { badge: 'badge-wait', label: 'Waiting parts', border: 'waiting' },
    done: { badge: 'badge-done', label: 'Done', border: 'done' },
    cancel: { badge: 'badge-done', label: 'Cancelled', border: 'done' },
    new: { badge: 'badge-new', label: 'New', border: '' }
  };
  const s = statusMap[job.status] || statusMap.new;
  const jobArg = JSON.stringify(String(job.id || '')).replace(/"/g, '&quot;');
  const slaHtml = job.sla < 0
    ? `<div class="sla-timer sla-breach"><i class="bi bi-clock-fill"></i> SLA overdue ${Math.abs(job.sla)} min</div>`
    : job.sla < 120
    ? `<div class="sla-timer sla-warn"><i class="bi bi-clock"></i> ${job.sla} min left</div>`
    : `<div class="sla-timer sla-ok"><i class="bi bi-clock"></i> ${Math.floor(job.sla/60)}h ${job.sla%60}m left</div>`;

  return `
    <div class="job-card ${s.border}" onclick="showJobDetail(${jobArg})">
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
          <button class="job-act-btn btn-primary-sm" onclick="assignJob(${jobArg})"><i class="bi bi-person-check"></i> Assign</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail(${jobArg})"><i class="bi bi-eye"></i> Detail</button>
        ` : job.status === 'done' ? `
          <button class="job-act-btn btn-primary-sm" onclick="if(typeof openBillingModal==='function')openBillingModal(${jobArg});else showToast('Opening receipt...')"><i class="bi bi-file-earmark-pdf"></i> Receipt</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail(${jobArg})"><i class="bi bi-eye"></i> Detail</button>
        ` : `
          <button class="job-act-btn btn-primary-sm" onclick="openCameraForJob(${jobArg})"><i class="bi bi-camera"></i> Photos</button>
          <button class="job-act-btn btn-success-sm" onclick="markJobDone(${jobArg})"><i class="bi bi-check2"></i> Done</button>
          <button class="job-act-btn btn-gray-sm" onclick="showJobDetail(${jobArg})"><i class="bi bi-three-dots"></i></button>
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
function mobileJobApi(action, payload) {
  if (typeof callAPI === 'function') return callAPI(action, payload);
  if (typeof callApi === 'function') return callApi(action, payload);
  return Promise.reject(new Error('API client not loaded'));
}

async function showJobDetail(jobId) {
  let job = APP.jobs.find(j => String(j.id || '') === String(jobId || ''));
  if (!job && (typeof callAPI === 'function' || typeof callApi === 'function')) {
    try {
      const res = await mobileJobApi('getJobDetail', { job_id: jobId });
      if (res && res.success && res.job) {
        job = normalizeJob(res.job);
        APP.jobs.unshift(job);
      }
    } catch (_) {}
  }
  if (!job) {
    showToast('ไม่พบรายละเอียดงาน ' + jobId);
    return;
  }
  const jobArg = JSON.stringify(String(job.id || '')).replace(/"/g, '&quot;');
  const phoneArg = JSON.stringify(String(job.phone || '')).replace(/"/g, '&quot;');
  APP.currentJobId = job.id;
  try { localStorage.setItem('comphone_current_job_id', job.id); } catch (_) {}
  const s = { urgent:'badge-urgent', inprog:'badge-inprog', waiting:'badge-wait', done:'badge-done', cancel:'badge-done', new:'badge-new' };
  const sl = { urgent:'Urgent', inprog:'In progress', waiting:'Waiting parts', done:'Done', cancel:'Cancelled', new:'New' };

  const jobModalContent = document.getElementById('modal-job-content');
  if (!jobModalContent) { showToast('เกิดข้อผิดพลาด ไม่พบ modal-job-content'); return; }
  document.body.style.overflow = 'hidden';
  jobModalContent.innerHTML = `
    <div style="padding:0 16px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div class="job-id">${job.id}</div>
          <div style="font-size:18px;font-weight:800;color:#111827;margin-top:2px">${job.title}</div>
        </div>
        <span class="job-badge ${s[job.status] || s.new}">${sl[job.status] || job.statusLabel || 'New'}</span>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div><div style="color:#9ca3af;font-weight:600">Customer</div><div style="font-weight:700;color:#111827">${job.customer}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">Phone</div><div style="font-weight:700;color:#0d6efd">${job.phone}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">Estimate</div><div style="font-weight:700;color:#10b981">${Number(job.price || 0).toLocaleString()}</div></div>
          <div><div style="color:#9ca3af;font-weight:600">Technician</div><div style="font-weight:700;color:#111827">${job.tech || '-'}</div></div>
        </div>
      </div>
      <div style="font-size:13px;color:#374151;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px">
        <b>Note</b><br>${job.note || '-'}
      </div>
      <div style="display:flex;gap:8px">
        <button class="job-act-btn btn-primary-sm" style="flex:1;padding:12px" onclick="openCameraForJob(${jobArg});closeModal('modal-job')">
          <i class="bi bi-camera"></i> Photos
        </button>
        <button class="job-act-btn btn-success-sm" style="flex:1;padding:12px" onclick="markJobDone(${jobArg});closeModal('modal-job')">
          <i class="bi bi-check2-circle"></i> Done
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px">
        <button class="job-act-btn btn-gray-sm" style="padding:11px" onclick="openMobileJobTimeline(${jobArg})"><i class="bi bi-clock-history"></i> Timeline</button>
        <button class="job-act-btn btn-gray-sm" style="padding:11px" onclick="openMobileJobBilling(${jobArg})"><i class="bi bi-receipt"></i> Billing</button>
        <button class="job-act-btn btn-gray-sm" style="padding:11px" onclick="openMobileJobVision(${jobArg})"><i class="bi bi-stars"></i> Vision</button>
      </div>
      <button class="job-act-btn btn-gray-sm" style="width:100%;margin-top:8px;padding:12px" onclick="callCustomer(${phoneArg})">
        <i class="bi bi-telephone-fill"></i> Call ${job.customer}
      </button>
      ${(APP.role === 'admin' || APP.role === 'owner') ? `
      <div style="margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;color:#9a3412;font-size:12px;line-height:1.45">
        <b>Admin delete</b><br>Deletes only after backend confirmation and archive-before-delete protection.
      </div>
      <button class="job-act-btn" style="width:100%;margin-top:8px;padding:12px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:12px;font-weight:800;cursor:pointer" onclick="deleteMobileJob(${jobArg})">
        <i class="bi bi-trash3"></i> Delete job
      </button>` : ''}
      ${job.status === 'done' ? `
      <button class="job-act-btn" style="width:100%;margin-top:8px;padding:12px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:12px;font-weight:700;cursor:pointer" id="btn-create-warranty-${job.id}">
        <i class="bi bi-shield-check"></i> Warranty
      </button>` : ''}
    </div>
  `;
  const modalJob = document.getElementById('modal-job');
  if (modalJob) modalJob.classList.remove('hidden');
  const warrantyBtn = document.getElementById('btn-create-warranty-' + jobId);
  if (warrantyBtn && typeof createWarrantyModal === 'function') {
    warrantyBtn.addEventListener('click', () => {
      closeModal('modal-job');
      createWarrantyModal(job.id, { customer_name: job.customer, description: job.title });
    });
  }
}

async function deleteMobileJob(jobId) {
  const reason = prompt('เหตุผลในการลบงาน ' + jobId + ' (ระบบจะ archive ก่อนลบ)', 'Deleted from Mobile Jobs');
  if (reason === null) return;
  if (!confirm('ยืนยันลบงาน ' + jobId + '?')) return;
  try {
    const res = await mobileJobApi('deleteJob', { job_id: jobId, confirm: 'DELETE_JOB', reason: reason || 'Deleted from Mobile Jobs' });
    if (!res || !res.success) throw new Error((res && (res.error || res.message)) || 'Delete failed');
    APP.jobs = APP.jobs.filter(j => String(j.id || '') !== String(jobId));
    closeModal('modal-job');
    renderJobsPage();
    renderJobsBadge();
    if (typeof renderHome === 'function') renderHome();
    showToast('ลบงานแล้ว และเก็บสำเนาไว้ใน archive');
  } catch (e) {
    showToast('ลบงานไม่สำเร็จ: ' + (e.message || e));
  }
}
async function openMobileJobTimeline(jobId) {
  const target = document.getElementById('modal-job-content');
  if (target && !document.getElementById('mobile-job-timeline-inline')) {
    target.insertAdjacentHTML('beforeend', '<div id="mobile-job-timeline-inline" style="margin:12px 16px;padding:12px;border-radius:12px;background:#f8fafc;color:#64748b;font-size:12px">Loading timeline...</div>');
  }
  try {
    const res = await mobileJobApi('getJobTimeline', { job_id: jobId });
    const events = (res && (res.timeline || res.events || res.logs || res.items)) || [];
    const el = document.getElementById('mobile-job-timeline-inline');
    if (!el) return;
    el.innerHTML = events.length ? events.slice(0, 6).map(e => `
      <div style="padding:8px 0;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:700;color:#0f172a">${e.status || e.action || e.type || '-'}</div>
        <div style="color:#64748b">${e.timestamp || e.date || ''} ${e.user || e.by ? '- ' + (e.user || e.by) : ''}</div>
        ${e.notes || e.note ? `<div style="color:#475569;margin-top:3px">${e.notes || e.note}</div>` : ''}
      </div>`).join('') : 'No timeline entries yet.';
  } catch (error) {
    const el = document.getElementById('mobile-job-timeline-inline');
    if (el) el.textContent = error.message || String(error);
  }
}

function openMobileJobBilling(jobId) {
  APP.currentJobId = jobId;
  try { localStorage.setItem('comphone_current_job_id', jobId); } catch (_) {}
  closeModal('modal-job');
  if (typeof openBillingModal === 'function') return openBillingModal(jobId);
  return goPage('billing', document.getElementById('nav-more'));
}

function openMobileJobVision(jobId) {
  APP.currentJobId = jobId;
  try {
    localStorage.setItem('comphone_current_job_id', jobId);
    localStorage.setItem('comphone_vision_job_id', jobId);
  } catch (_) {}
  closeModal('modal-job');
  goPage('vision', document.getElementById('nav-more'));
  setTimeout(() => {
    const input = document.getElementById('vision-job-id');
    if (input) input.value = jobId;
    if (typeof loadVisionFieldContext === 'function') loadVisionFieldContext(jobId);
  }, 500);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
  // Restore scroll if no other modal/sheet is still open
  if (!document.querySelector('.modal-overlay:not(.hidden), .cp-sheet-overlay:not(.hidden)')) {
    document.body.style.overflow = '';
  }
}
