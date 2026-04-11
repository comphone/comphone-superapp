// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// SmartAssignment.gs - GPS Route Optimization
// ============================================================

/**
 * คำนวณระยะทางระหว่าง 2 จุด (Haversine) — return km
 */
// Uses haversineDistance() from GpsPipeline.gs


/**
 * หาช่างที่อยู่ใกล้สถานที่สุด
 * @param {Array} jobs - [{id, lat, lng, symptom, status}, ...]
 * @param {Array} techs - [{id, name, lat, lng, skills}, ...]
 * @return {Array} [{jobId, techId, techName, distKm, etaMin}]
 */
function findNearestTech(jobs, techs) {
  if (!jobs || jobs.length === 0 || !techs || techs.length === 0) return [];
  
  var results = [];
  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];
    var nearest = null;
    var minDist = Infinity;
    
    for (var t = 0; t < techs.length; t++) {
      var tech = techs[t];
      var dist = haversineDistance(job.lat, job.lng, tech.lat, tech.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = tech;
      }
    }
    
    if (nearest) {
      results.push({
        jobId: job.id,
        techId: nearest.id,
        techName: nearest.name,
        distKm: Math.round(minDist * 10) / 10,
        etaMin: Math.round(minDist * 60 / 40)
      });
    }
  }
  return results;
}

/**
 * คำนวณเส้นทางที่เหมาะสม (Traveling Salesman - nearest neighbor)
 */
function optimizeRoute(startLat, startLng, destinations) {
  if (!destinations || destinations.length === 0) return [];
  
  var unvisited = destinations.slice();
  var route = [];
  var curLat = startLat;
  var curLng = startLng;
  var totalKm = 0;
  
  while (unvisited.length > 0) {
    var nearest = null;
    var minDist = Infinity;
    var nearestIdx = 0;
    
    for (var i = 0; i < unvisited.length; i++) {
      var d = haversineDistance(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) {
        minDist = d;
        nearest = unvisited[i];
        nearestIdx = i;
      }
    }
    
    route.push({
      order: route.length + 1,
      id: nearest.id,
      customer: nearest.customer,
      distKm: Math.round(minDist * 10) / 10,
      totalKm: Math.round((totalKm + minDist) * 10) / 10
    });
    
    totalKm += minDist;
    curLat = nearest.lat;
    curLng = nearest.lng;
    unvisited.splice(nearestIdx, 1);
  }
  
  return { route: route, totalKm: Math.round(totalKm * 10) / 10 };
}
