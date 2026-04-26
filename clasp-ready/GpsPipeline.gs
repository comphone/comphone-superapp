// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// GpsPipeline.gs - GPS Location Pipeline
// รับพิกัดจากช่าง → บันทึก DB → หาช่างใกล้สุด
// ============================================================

/**
 * คำนวณระยะทางระหว่าง 2 จุด (Haversine Formula)
 * @return {number} distance in km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * บันทึกพิกัดช่างจาก LINE Location message
 */
// ============================================================
// CacheService helpers — instead of global variables (prevents reset)
// ============================================================
function _getTechLocations() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get('techLocations');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch(e) {
    Logger.log('_getTechLocations cache error: ' + e);
  }
  return {};
}

function _saveTechLocations(locations) {
  try {
    var cache = CacheService.getScriptCache();
    cache.put('techLocations', JSON.stringify(locations), 1800); // 30 min
  } catch(e) {
    Logger.log('_saveTechLocations cache error: ' + e);
  }
}

function recordTechLocation(techId, techName, lat, lng) {
  var locations = _getTechLocations();
  locations[techId] = {
    id: techId,
    name: techName,
    lat: lat,
    lng: lng,
    timestamp: new Date().getTime()
  };
  _saveTechLocations(locations);

  return {
    success: true,
    tech_id: techId,
    tech_name: techName,
    lat: lat,
    lng: lng,
    message: 'บันทึกพิกัด ' + techName + ' (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')'
  };
}

/**
 * หาช่างที่อยู่ใกล้สถานที่งานที่สุด
 * ถ้าไม่มีพิกัดช่าง → return "มอบหมายด้วยตนเอง"
 */
function findNearestTechToJob(jobLat, jobLng) {
  var now = new Date().getTime();
  var activeTechs = [];
  var locations = _getTechLocations();
  var keys = Object.keys(locations);
  for (var k = 0; k < keys.length; k++) {
    var t = locations[keys[k]];
    if ((now - t.timestamp) < 30 * 60 * 1000) {
      activeTechs.push(t);
    }
  }

  if (activeTechs.length === 0) {
    return {
      success: true,
      technician: null,
      distance: null,
      message: 'ไม่มีพิกัดช่างในระบบ — กรุณามอบหมายด้วยตนเอง',
      tip: 'ให้ช่างส่ง Location ในห้องช่างเพื่อลงทะเบียนพิกัด'
    };
  }

  var nearest = null;
  var minDist = Infinity;

  for (var i = 0; i < activeTechs.length; i++) {
    var tech = activeTechs[i];
    var dist = haversineDistance(jobLat, jobLng, tech.lat, tech.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = tech;
    }
  }

  var allTechs = [];
  for (var j = 0; j < activeTechs.length; j++) {
    var t2 = activeTechs[j];
    allTechs.push({
      name: t2.name,
      distance_km: Math.round(haversineDistance(jobLat, jobLng, t2.lat, t2.lng) * 10) / 10
    });
  }
  allTechs.sort(function(a, b) { return a.distance_km - b.distance_km; });

  return {
    success: true,
    technician: nearest.name,
    distance_km: Math.round(minDist * 10) / 10,
    eta_min: Math.round(minDist * 1.5),
    message: 'ช่างใกล้สุด: ' + nearest.name + ' (' + minDist.toFixed(1) + ' km, ETA ~' + Math.round(minDist * 1.5) + ' นาที)',
    all_techs: allTechs
  };
}

/**
 * สร้าง LINE template สำหรับส่ง Location
 */
function createLocationRequestMessage(jobId, customerName) {
  return {
    type: 'text',
    text: '📍 กรุณาส่งพิกัดตำแหน่งของคุณ\n\nกดปุ่มด้านล่างเพื่อแชร์ Location:\n\nงาน: ' + jobId + ' — ' + customerName,
    quickReply: {
      items: [
        {
          type: 'action',
          action: { type: 'location', label: '📍 แชร์พิกัดของฉัน' }
        }
      ]
    }
  };
}

/**
 * วิเคราะห์พิกัดว่าอยู่ในพื้นที่ไหน (Roi Et province)
 */
function getAreaFromLocation(lat, lng) {
  var areas = [
    { name: 'เมืองร้อยเอ็ด', center: [16.0546, 103.6530], radius: 10 },
    { name: 'อาจสามารถ', center: [15.8800, 103.6400], radius: 8 },
    { name: 'ธวัชบุรี', center: [15.9800, 103.7400], radius: 8 },
    { name: 'เกษตรวิสัย', center: [15.7800, 103.5200], radius: 10 },
    { name: 'ปทุมรัตต์', center: [15.7500, 103.4000], radius: 8 },
    { name: 'โพนทอง', center: [16.1500, 103.4500], radius: 8 },
    { name: 'เสลภูมิ', center: [16.0300, 103.9500], radius: 8 },
    { name: 'หนองพอก', center: [16.3500, 104.0800], radius: 8 }
  ];

  for (var i = 0; i < areas.length; i++) {
    var area = areas[i];
    var dist = haversineDistance(lat, lng, area.center[0], area.center[1]);
    if (dist <= area.radius) {
      return { area: area.name, distance_from_center: Math.round(dist * 10) / 10 };
    }
  }

  return { area: 'ร้อยเอ็ด (พื้นที่อื่น)', distance_from_center: null };
}


// ============================================================
// V5.5 Photo Geofencing Helpers
// ============================================================

function validatePhotoGeofence(fileId, jobId, customerName, options) {
  try {
    options = options || {};
    var radiusMeters = Number(options.radius_m || 300);
    var photoPoint = extractGpsFromDriveImage_(fileId);
    if (!photoPoint.success) {
      return {
        success: false,
        status: 'NO_EXIF',
        in_geofence: false,
        radius_m: radiusMeters,
        error: photoPoint.error || 'ไม่พบพิกัด EXIF ในรูปภาพ'
      };
    }

    var customerPoint = getCustomerCoordinatesForJob_(jobId, customerName);
    if (!customerPoint.success) {
      return {
        success: false,
        status: 'NO_CUSTOMER_GPS',
        in_geofence: false,
        radius_m: radiusMeters,
        photo_lat: photoPoint.lat,
        photo_lng: photoPoint.lng,
        error: customerPoint.error || 'ไม่พบพิกัดลูกค้า'
      };
    }

    var distanceKm = haversineDistance(photoPoint.lat, photoPoint.lng, customerPoint.lat, customerPoint.lng);
    var distanceMeters = Math.round(distanceKm * 1000);
    var inFence = distanceMeters <= radiusMeters;

    return {
      success: true,
      status: inFence ? 'PASS' : 'OUT_OF_GEOFENCE',
      in_geofence: inFence,
      distance_m: distanceMeters,
      radius_m: radiusMeters,
      photo_lat: photoPoint.lat,
      photo_lng: photoPoint.lng,
      customer_lat: customerPoint.lat,
      customer_lng: customerPoint.lng,
      source_photo: photoPoint.source || 'EXIF',
      source_customer: customerPoint.source || 'DB_CUSTOMERS',
      customer_name: customerPoint.customer_name || customerName || '',
      message: inFence
        ? 'รูปอยู่ในรัศมีงาน ' + distanceMeters + ' เมตร'
        : 'รูปอยู่นอกพื้นที่งาน ' + distanceMeters + ' เมตร'
    };
  } catch (e) {
    return { success: false, status: 'ERROR', in_geofence: false, error: e.toString() };
  }
}

function getCustomerCoordinatesForJob_(jobId, customerName) {
  var fromCustomers = getCustomerCoordinatesFromSheet_(customerName, jobId);
  if (fromCustomers.success) return fromCustomers;

  var fromJobs = getJobCoordinatesFromSheet_(jobId);
  if (fromJobs.success) return fromJobs;

  return { success: false, error: fromCustomers.error || fromJobs.error || 'ไม่พบพิกัดลูกค้าใน DB_CUSTOMERS/DBJOBS' };
}

function getCustomerCoordinatesFromSheet_(customerName, jobId) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DB_CUSTOMERS');
    if (!sh || sh.getLastRow() < 2) return { success: false, error: 'DB_CUSTOMERS not found or empty' };

    var values = sh.getDataRange().getValues();
    var headers = values[0];
    var idxName = findHeaderIndex_(headers, ['Customer_Name', 'ชื่อลูกค้า', 'Customer', 'Name']);
    var idxJob = findHeaderIndex_(headers, ['JobID', 'Last_Job_ID', 'job_id']);
    var idxLat = findHeaderIndex_(headers, ['Latitude', 'Lat', 'GPS_Lat', 'Customer_Lat', 'ละติจูด']);
    var idxLng = findHeaderIndex_(headers, ['Longitude', 'Lng', 'GPS_Lng', 'Customer_Lng', 'ลองจิจูด']);
    var idxGps = findHeaderIndex_(headers, ['พิกัด GPS', 'GPS', 'Location', 'Customer_GPS']);

    var targetName = String(customerName || '').trim();
    var targetJob = String(jobId || '').trim();

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var rowName = idxName > -1 ? String(row[idxName] || '').trim() : '';
      var rowJob = idxJob > -1 ? String(row[idxJob] || '').trim() : '';
      var matched = false;

      if (targetJob && rowJob && rowJob === targetJob) matched = true;
      if (!matched && targetName && rowName && rowName === targetName) matched = true;
      if (!matched) continue;

      var lat = idxLat > -1 ? Number(row[idxLat] || 0) : 0;
      var lng = idxLng > -1 ? Number(row[idxLng] || 0) : 0;
      if (!lat || !lng) {
        var parsed = parseLatLngFromValue_(idxGps > -1 ? row[idxGps] : '');
        if (parsed.success) {
          lat = parsed.lat;
          lng = parsed.lng;
        }
      }

      if (lat && lng) {
        return {
          success: true,
          lat: lat,
          lng: lng,
          source: 'DB_CUSTOMERS',
          customer_name: rowName || targetName || ''
        };
      }
    }

    return { success: false, error: 'ไม่พบพิกัดใน DB_CUSTOMERS' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getJobCoordinatesFromSheet_(jobId) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh || sh.getLastRow() < 2) return { success: false, error: 'DBJOBS not found or empty' };

    var values = sh.getDataRange().getValues();
    var headers = values[0];
    var idxJob = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'job_id']);
    var idxGps = findHeaderIndex_(headers, ['พิกัด GPS', 'GPS', 'Location', 'gps']);
    var idxCustomer = findHeaderIndex_(headers, ['ชื่อลูกค้า', 'Customer_Name', 'Customer']);

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idxJob] || '') !== String(jobId || '')) continue;
      var parsed = parseLatLngFromValue_(idxGps > -1 ? values[i][idxGps] : '');
      if (!parsed.success) return { success: false, error: 'DBJOBS ไม่มีพิกัดที่ใช้ได้สำหรับงาน ' + jobId };
      return {
        success: true,
        lat: parsed.lat,
        lng: parsed.lng,
        source: 'DBJOBS',
        customer_name: idxCustomer > -1 ? String(values[i][idxCustomer] || '') : ''
      };
    }

    return { success: false, error: 'ไม่พบ Job ID ใน DBJOBS' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function parseLatLngFromValue_(value) {
  var text = String(value || '').trim();
  if (!text) return { success: false, error: 'empty gps' };

  var pair = text.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (pair) {
    return { success: true, lat: Number(pair[1]), lng: Number(pair[2]) };
  }

  var mapPair = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (mapPair) {
    return { success: true, lat: Number(mapPair[1]), lng: Number(mapPair[2]) };
  }

  return { success: false, error: 'parse gps failed' };
}

function extractGpsFromDriveImage_(fileId) {
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    return extractGpsFromImageBlob_(blob);
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function extractGpsFromImageBlob_(blob) {
  try {
    if (!blob) return { success: false, error: 'blob is required' };
    var bytes = blob.getBytes();
    if (!bytes || bytes.length < 4) return { success: false, error: 'invalid image bytes' };
    return parseExifGpsFromJpegBytes_(bytes);
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function parseExifGpsFromJpegBytes_(bytes) {
  if ((bytes[0] & 255) !== 255 || (bytes[1] & 255) !== 216) {
    return { success: false, error: 'not a jpeg file' };
  }

  var offset = 2;
  while (offset < bytes.length - 1) {
    if ((bytes[offset] & 255) !== 255) break;
    var marker = bytes[offset + 1] & 255;
    if (marker === 218 || marker === 217) break;
    var size = ((bytes[offset + 2] & 255) << 8) + (bytes[offset + 3] & 255);
    if (marker === 225 && size >= 8) {
      var exifHeader = String.fromCharCode(bytes[offset + 4] & 255, bytes[offset + 5] & 255, bytes[offset + 6] & 255, bytes[offset + 7] & 255, bytes[offset + 8] & 255, bytes[offset + 9] & 255);
      if (exifHeader === 'Exif\u0000\u0000') {
        return parseGpsFromExifTiff_(bytes, offset + 10);
      }
    }
    offset += 2 + size;
  }

  return { success: false, error: 'ไม่พบ EXIF GPS ในรูปภาพ' };
}

function parseGpsFromExifTiff_(bytes, tiffStart) {
  var little = (String.fromCharCode(bytes[tiffStart] & 255, bytes[tiffStart + 1] & 255) === 'II');
  var ifd0Offset = readExifUInt32_(bytes, tiffStart + 4, little);
  var gpsIfdOffset = findGpsIfdOffset_(bytes, tiffStart + ifd0Offset, tiffStart, little);
  if (!gpsIfdOffset) return { success: false, error: 'ไม่พบ GPS IFD' };

  var gps = readGpsIfdEntries_(bytes, tiffStart + gpsIfdOffset, tiffStart, little);
  if (!gps.lat || !gps.lng) return { success: false, error: 'GPS EXIF ไม่สมบูรณ์' };

  return {
    success: true,
    lat: gps.lat,
    lng: gps.lng,
    source: 'EXIF'
  };
}

function findGpsIfdOffset_(bytes, ifdOffsetAbs, tiffStart, little) {
  var entryCount = readExifUInt16_(bytes, ifdOffsetAbs, little);
  for (var i = 0; i < entryCount; i++) {
    var entryOffset = ifdOffsetAbs + 2 + (i * 12);
    var tag = readExifUInt16_(bytes, entryOffset, little);
    if (tag === 34853) {
      return readExifUInt32_(bytes, entryOffset + 8, little);
    }
  }
  return 0;
}

function readGpsIfdEntries_(bytes, gpsIfdAbs, tiffStart, little) {
  var entryCount = readExifUInt16_(bytes, gpsIfdAbs, little);
  var latRef = '';
  var lngRef = '';
  var lat = 0;
  var lng = 0;

  for (var i = 0; i < entryCount; i++) {
    var entryOffset = gpsIfdAbs + 2 + (i * 12);
    var tag = readExifUInt16_(bytes, entryOffset, little);
    var type = readExifUInt16_(bytes, entryOffset + 2, little);
    var count = readExifUInt32_(bytes, entryOffset + 4, little);
    var valueOffset = readExifUInt32_(bytes, entryOffset + 8, little);

    if (tag === 1) {
      latRef = readExifAscii_(bytes, type, count, entryOffset + 8, tiffStart + valueOffset);
    } else if (tag === 2) {
      lat = readExifGpsCoordinate_(bytes, tiffStart + valueOffset, little);
    } else if (tag === 3) {
      lngRef = readExifAscii_(bytes, type, count, entryOffset + 8, tiffStart + valueOffset);
    } else if (tag === 4) {
      lng = readExifGpsCoordinate_(bytes, tiffStart + valueOffset, little);
    }
  }

  if (latRef === 'S') lat = -Math.abs(lat);
  if (lngRef === 'W') lng = -Math.abs(lng);
  return { lat: lat, lng: lng };
}

function readExifGpsCoordinate_(bytes, offset, little) {
  var deg = readExifRational_(bytes, offset, little);
  var min = readExifRational_(bytes, offset + 8, little);
  var sec = readExifRational_(bytes, offset + 16, little);
  return deg + (min / 60) + (sec / 3600);
}

function readExifAscii_(bytes, type, count, inlineOffset, absoluteOffset) {
  var chars = [];
  var start = count <= 4 ? inlineOffset : absoluteOffset;
  for (var i = 0; i < count; i++) {
    var code = bytes[start + i] & 255;
    if (!code) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join('');
}

function readExifRational_(bytes, offset, little) {
  var numerator = readExifUInt32_(bytes, offset, little);
  var denominator = readExifUInt32_(bytes, offset + 4, little);
  if (!denominator) return 0;
  return numerator / denominator;
}

function readExifUInt16_(bytes, offset, little) {
  if (little) {
    return (bytes[offset] & 255) + ((bytes[offset + 1] & 255) << 8);
  }
  return ((bytes[offset] & 255) << 8) + (bytes[offset + 1] & 255);
}

function readExifUInt32_(bytes, offset, little) {
  if (little) {
    return ((bytes[offset] & 255)) +
      ((bytes[offset + 1] & 255) << 8) +
      ((bytes[offset + 2] & 255) << 16) +
      ((bytes[offset + 3] & 255) * 16777216);
  }
  return ((bytes[offset] & 255) * 16777216) +
    ((bytes[offset + 1] & 255) << 16) +
    ((bytes[offset + 2] & 255) << 8) +
    (bytes[offset + 3] & 255);
}
