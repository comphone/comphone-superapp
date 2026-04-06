// gps-pipeline.js — GPS Location Pipeline for Comphone
// รับพิกัดจากช่าง → บันทึก DB → หาช่างใกล้สุด

/**
 * คำนวณระยะทางระหว่าง 2 จุด (Haversine Formula)
 * @returns distance in km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * จัดเก็บพิกัดช่าง (temporary — ใน production ใช้ database)
 */
const technicianLocations = new Map();

/**
 * บันทึกพิกัดช่างจาก LINE Location message
 */
function recordTechLocation(techId, techName, lat, lng) {
  technicianLocations.set(techId, {
    id: techId,
    name: techName,
    lat: lat,
    lng: lng,
    timestamp: new Date()
  });

  return {
    success: true,
    tech_id: techId,
    tech_name: techName,
    lat: lat,
    lng: lng,
    message: `บันทึกพิกัด ${techName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  };
}

/**
 * หาช่างที่อยู่ใกล้สถานที่งานที่สุด
 * ถ้าไม่มีพิกัดช่าง → return "มอบหมายด้วยตนเอง"
 */
function findNearestTechToJob(jobLat, jobLng) {
  const activeTechs = Array.from(technicianLocations.values())
    .filter(t => (Date.now() - t.timestamp.getTime()) < 30 * 60 * 1000); // ลบเก่า 30 นาที

  if (activeTechs.length === 0) {
    return {
      success: true,
      technician: null,
      distance: null,
      message: 'ไม่มีพิกัดช่างในระบบ — กรุณามอบหมายด้วยตนเอง',
      tip: 'ให้ช่างส่ง Location ในห้องช่างเพื่อลงทะเบียนพิกัด'
    };
  }

  let nearest = null;
  let minDist = Infinity;

  for (const tech of activeTechs) {
    const dist = haversineDistance(jobLat, jobLng, tech.lat, tech.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = tech;
    }
  }

  return {
    success: true,
    technician: nearest.name,
    distance_km: Math.round(minDist * 10) / 10,
    eta_min: Math.round(minDist * 1.5), // ~40 km/h average
    message: `ช่างใกล้สุด: ${nearest.name} (${(minDist).toFixed(1)} km, ETA ~${Math.round(minDist * 1.5)} นาที)`,
    all_techs: activeTechs.map(t => ({
      name: t.name,
      distance_km: Math.round(haversineDistance(jobLat, jobLng, t.lat, t.lng) * 10) / 10
    })).sort((a, b) => a.distance_km - b.distance_km)
  };
}

/**
 * สร้าง LINE template สำหรับส่ง Location
 */
function createLocationRequestMessage(jobId, customerName) {
  return {
    type: 'text',
    text: `📍 กรุณาส่งพิกัดตำแหน่งของคุณ\n\nกดปุ่มด้านล่างเพื่อแชร์ Location:\n\nงาน: ${jobId} — ${customerName}`,
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
  // Roi Et main areas (approximate boundaries)
  const areas = [
    { name: 'เมืองร้อยเอ็ด', center: [16.0546, 103.6530], radius: 10 },
    { name: 'อาจสามารถ', center: [15.8800, 103.6400], radius: 8 },
    { name: 'ธวัชบุรี', center: [15.9800, 103.7400], radius: 8 },
    { name: 'เกษตรวิสัย', center: [15.7800, 103.5200], radius: 10 },
    { name: 'ปทุมรัตต์', center: [15.7500, 103.4000], radius: 8 },
    { name: 'โพนทอง', center: [16.1500, 103.4500], radius: 8 },
    { name: 'เสลภูมิ', center: [16.0300, 103.9500], radius: 8 },
    { name: 'หนองพอก', center: [16.3500, 104.0800], radius: 8 },
  ];

  for (const area of areas) {
    const dist = haversineDistance(lat, lng, area.center[0], area.center[1]);
    if (dist <= area.radius) {
      return { area: area.name, distance_from_center: Math.round(dist * 10) / 10 };
    }
  }

  return { area: 'ร้อยเอ็ด (พื้นที่อื่น)', distance_from_center: null };
}

module.exports = {
  haversineDistance,
  recordTechLocation,
  findNearestTechToJob,
  createLocationRequestMessage,
  getAreaFromLocation,
  technicianLocations
};