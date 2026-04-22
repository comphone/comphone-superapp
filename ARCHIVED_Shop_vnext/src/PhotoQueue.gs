File unchanged since last read. The content from the earlier read_file result in this conversation is still current — refer to that instead of re-reading.

// ============================================================
// PHOTO RE-ASSIGNMENT (V5.6)
// ============================================================

/**
 * ผูกรูปภาพที่ค้างอยู่ใน Queue (JobID ว่าง) ให้เข้ากับ JobID ที่ระบุ
 * @param {string} techName - ชื่อช่าง (เพื่อป้องกันการผูกรูปผิดคน)
 * @param {string} jobId - JobID ที่ต้องการผูก
 * @return {object} - ผลการดำเนินงาน
 */
function reassignPendingPhotos(techName, jobId) {
  try {
    var ctx = getPhotoQueueContext_();
    var data = ctx.sheet.getDataRange().getValues();
    var count = 0;

    for (var i = 1; i < data.length; i++) {
      var rowId = i + 1;
      var currentJobId = String(data[i][ctx.idx.jobId] || '').trim();
      var currentTech = String(data[i][ctx.idx.techName] || '').trim();
      var currentStatus = String(data[i][ctx.idx.status] || '').trim();

      // เงื่อนไข: สถานะเป็น Pending AND JobID ว่าง AND ช่างตรงกัน
      if (currentStatus === 'Pending' && !currentJobId && currentTech === techName) {
        ctx.sheet.getRange(rowId, ctx.idx.jobId + 1).setValue(jobId);
        count++;
      }
    }

    if (count > 0) {
      Logger.log('Reassigned ' + count + ' photos to Job: ' + jobId + ' for ' + techName);
      // Trigger processing to move files to final destination
      processImageSorting();
    }

    return { success: true, reassignedCount: count };
  } catch (e) {
    Logger.log('reassignPendingPhotos error: ' + e);
    return { error: e.toString() };
  }
}
