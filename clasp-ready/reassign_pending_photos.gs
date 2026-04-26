// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// reassign_pending_photos.gs
// ============================================================

// Reassign Pending Photos Function (Standalone for Router integration)
function reassignPendingPhotos(techName, jobId) {
  try {
    var pending = getPendingPhotos();
    if (pending.length === 0) return { success: true, reassigned: 0, message: 'ไม่มีรูป Pending' };

    var count = 0;
    for (var i = 0; i < pending.length; i++) {
      var p = pending[i];
      if ((p.techName && p.techName === techName) || !p.jobId || p.jobId === '') {
        updateQueueStatus(p.queueId, 'Reassigned', '', '', '', '', { 
          jobId: jobId 
        });
        count++;
        Logger.log('Reassigned photo ' + p.queueId + ' to Job ' + jobId);
      }
    }

    if (count > 0) {
      var processResult = processImageSorting();
      return {
        success: true,
        reassigned: count,
        processed: processResult.processed || 0,
        message: 'เชื่อมรูปภาพ ' + count + ' รายการกับ Job ' + jobId + ' สำเร็จ'
      };
    }

    return { success: true, reassigned: 0, message: 'ไม่พบรูปที่ตรงเงื่อนไข' };
  } catch (e) {
    Logger.log('reassignPendingPhotos error: ' + e);
    return { success: false, error: e.toString() };
  }
}
