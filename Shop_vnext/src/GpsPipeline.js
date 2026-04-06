// ============================================================
// GpsPipeline.gs — GPS Location Pipeline (V313)
// รับพิกัดจากช่าง → บันทึก DB → หาช่างใกล้สุด
// GAS-compatible: no Node.js syntax
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
// V350: CacheService helpers — instead of global variables (prevents reset)
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
