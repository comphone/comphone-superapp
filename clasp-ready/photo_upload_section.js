// ============================================================
// Photo Upload Section — B/A Photo Management
// COMPHONE SUPER APP v5.9.0-phase2d
// Phase 29: Photo Upload UI (Frontend)
// ============================================================

let PHOTO_UPLOAD_STATE = {
  files: [],
  jobId: '',
  uploading: false
};

// ===== เปิด Photo Upload Section =====
function openPhotoUpload() {
  currentSection = 'photo-upload';
  const container = document.getElementById('section-photo-content');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:16px">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#111827">
        <i class="bi bi-camera-fill" style="color:#f59e0b;margin-right:8px"></i> อัปโหลดรูปภาพ
      </h3>

      <div class="form-group-custom">
        <label>รหัสงาน (Job ID)</label>
        <div class="input-wrap">
          <i class="bi bi-clipboard-check"></i>
          <input type="text" id="photo-job-id" placeholder="เช่น JOB-12345" 
                 onkeydown="if(event.key==='Enter') document.getElementById('photo-file-input').click()">
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;margin-bottom:8px;font-size:14px;color:#374151;font-weight:500">เลือกรูปภาพ</label>
        <div id="photo-drop-zone" 
             style="border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:#f9fafb"
             ondrop="handlePhotoDrop(event)" ondragover="event.preventDefault();this.style.borderColor='#3b82f6'"
             ondragleave="this.style.borderColor='#d1d5db'">
          <i class="bi bi-cloud-upload" style="font-size:32px;color:#9ca3af;display:block;margin-bottom:8px"></i>
          <p style="margin:0;color:#6b7280">ลากไฟล์มาวางที่นี่ หรือ <span style="color:#3b82f6;font-weight:500">เลือกไฟล์</span></p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">รองรับ JPG, PNG, WEBP (สูงสุด 10MB ต่อไฟล์)</p>
          <input type="file" id="photo-file-input" accept="image/*" multiple 
                 style="display:none" onchange="handlePhotoSelect(event)">
        </div>
      </div>

      <div id="photo-preview-container" style="display:none;margin-bottom:16px">
        <h4 style="font-size:14px;color:#374151;margin:0 0 8px">รูปที่เลือก (<span id="photo-count">0</span> รูป)</h4>
        <div id="photo-preview-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(100px, 1fr));gap:8px"></div>
      </div>

      <button class="btn-setup" id="photo-upload-btn" onclick="uploadPhotos()" style="width:100%" disabled>
        <i class="bi bi-cloud-upload"></i> อัปโหลด (<span id="photo-upload-count">0</span> รูป)
      </button>

      <div id="photo-loading" style="display:none;text-align:center;padding:20px">
        <i class="bi bi-hourglass-split" style="font-size:24px;color:#6b7280"></i>
        <p style="color:#6b7280;margin-top:8px">กำลังอัปโหลด...</p>
      </div>

      <div id="photo-result"></div>
    </div>
  `;

  // Setup drag-and-drop
  const dropZone = document.getElementById('photo-drop-zone');
  if (dropZone) {
    dropZone.onclick = () => document.getElementById('photo-file-input').click();
  }
}

// ===== จัดการเลือกไฟล์ =====
function handlePhotoSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  addPhotosToQueue(Array.from(files));
}

// ===== จัดการ Drop =====
function handlePhotoDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  const dropZone = event.currentTarget;
  dropZone.style.borderColor = '#d1d5db';

  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;
  addPhotosToQueue(Array.from(files));
}

// ===== เพิ่มรูปเข้าคิว =====
function addPhotosToQueue(files) {
  const validFiles = files.filter(f => {
    const isValidType = f.type.startsWith('image/');
    const isValidSize = f.size <= 10 * 1024 * 1024; // 10MB
    if (!isValidType) showToast(`ไฟล์ ${f.name} ไม่ใช่รูปภาพ`);
    if (!isValidSize) showToast(`ไฟล์ ${f.name} มีขนาดใหญ่เกิน 10MB`);
    return isValidType && isValidSize;
  });

  PHOTO_UPLOAD_STATE.files.push(...validFiles);
  updatePhotoPreview();
}

// ===== อัปเดตการแสดงตัวอย่าง =====
function updatePhotoPreview() {
  const container = document.getElementById('photo-preview-container');
  const grid = document.getElementById('photo-preview-grid');
  const countEl = document.getElementById('photo-count');
  const uploadCountEl = document.getElementById('photo-upload-count');
  const uploadBtn = document.getElementById('photo-upload-btn');

  if (!container || !grid) return;

  const fileCount = PHOTO_UPLOAD_STATE.files.length;
  container.style.display = fileCount > 0 ? 'block' : 'none';
  if (countEl) countEl.textContent = fileCount;
  if (uploadCountEl) uploadCountEl.textContent = fileCount;
  if (uploadBtn) uploadBtn.disabled = fileCount === 0;

  grid.innerHTML = '';
  PHOTO_UPLOAD_STATE.files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.style.position = 'relative';
      div.innerHTML = `
        <img src="${e.target.result}" style="width:100%;aspect-ratio:1;border-radius:8px;object-fit:cover">
        <button onclick="removePhoto(${index})" style="position:absolute;top:4px;right:4px;background:rgba(239,68,68,0.9);border:none;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer">
          <i class="bi bi-x" style="font-size:10px"></i>
        </button>
      `;
      grid.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// ===== ลบรูปออกจากคิว =====
function removePhoto(index) {
  PHOTO_UPLOAD_STATE.files.splice(index, 1);
  updatePhotoPreview();
}

// ===== อัปโหลดรูปภาพ =====
async function uploadPhotos() {
  const jobId = document.getElementById('photo-job-id').value.trim();
  if (!jobId) {
    showToast('กรุณาระบุรหัสงาน');
    return;
  }

  if (PHOTO_UPLOAD_STATE.files.length === 0) {
    showToast('กรุณาเลือกรูปภาพอย่างน้อย 1 รูป');
    return;
  }

  const btn = document.getElementById('photo-upload-btn');
  const loadingDiv = document.getElementById('photo-loading');
  const resultDiv = document.getElementById('photo-result');

  btn.disabled = true;
  loadingDiv.style.display = 'block';
  resultDiv.innerHTML = '';
  PHOTO_UPLOAD_STATE.uploading = true;

  try {
    // Upload each photo
    let successCount = 0;
    for (const file of PHOTO_UPLOAD_STATE.files) {
      const base64 = await fileToBase64(file);
      const res = await callAPI('uploadPhoto', {
        job_id: jobId,
        filename: file.name,
        mime_type: file.type,
        data: base64
      });
      if (res && res.success) successCount++;
    }

    resultDiv.innerHTML = `
      <div style="padding:16px;background:#f0fdf4;border-radius:12px;color:#166534">
        <i class="bi bi-check-circle"></i> อัปโหลดสำเร็จ ${successCount} รูป
      </div>
    `;
    PHOTO_UPLOAD_STATE.files = [];
    updatePhotoPreview();
  } catch (e) {
    resultDiv.innerHTML = `
      <div style="padding:16px;background:#fef2f2;border-radius:12px;color:#dc2626">
        <i class="bi bi-wifi-off"></i> เกิดข้อผิดพลาดในการอัปโหลด
      </div>
    `;
  } finally {
    btn.disabled = false;
    loadingDiv.style.display = 'none';
    PHOTO_UPLOAD_STATE.uploading = false;
  }
}

// ===== แปลงไฟล์เป็น Base64 =====
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:image/...;base64, prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== Export functions =====
window.openPhotoUpload = openPhotoUpload;
