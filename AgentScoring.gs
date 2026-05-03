// ============================================================
// AgentScoring.gs — COMPHONE SUPER APP v5.9.0-phase31a
// AI-OS Stabilization — Phase 4: Agent Scoring
// ============================================================
// Track Accuracy: บันทึกผลลัพธ์ของ agent แต่ละตัว
// Weighted Consensus: ถ่วงน้ำหนัก vote ตาม accuracy score
// Performance Leaderboard: จัดอันดับ agents
// Auto-demotion: ลด weight ของ agent ที่ accuracy ต่ำ
// ============================================================

var AS_VERSION = '1.0.0';

// ─── SCORING CONFIG ────────────────────────────────────────
var AS_CONFIG = {
  INITIAL_WEIGHT:     1.0,   // น้ำหนักเริ่มต้นของ agent ใหม่
  MIN_WEIGHT:         0.1,   // น้ำหนักต่ำสุด (ไม่ให้เป็น 0)
  MAX_WEIGHT:         3.0,   // น้ำหนักสูงสุด
  DECAY_RATE:         0.05,  // ลด weight ทุกครั้งที่ผิด
  REWARD_RATE:        0.03,  // เพิ่ม weight ทุกครั้งที่ถูก
  MIN_SAMPLES:        5,     // ต้องมีอย่างน้อยกี่ sample ถึงจะ weight ได้
  ACCURACY_THRESHOLD: 0.60,  // ต่ำกว่านี้ → demote
  WINDOW_DAYS:        30,    // คำนวณ accuracy จาก N วันล่าสุด
  MAX_HISTORY:        500    // เก็บ history สูงสุด
};

// ─── STORAGE KEYS ──────────────────────────────────────────
var AS_SCORES_KEY  = 'AS_AGENT_SCORES';
var AS_HISTORY_KEY = 'AS_OUTCOME_HISTORY';

// ─── MAIN: recordOutcome ───────────────────────────────────

/**
 * recordOutcome — บันทึกผลลัพธ์ของ agent
 * @param {Object} params - { agentId, action, outcome: 'CORRECT'|'INCORRECT'|'PARTIAL', confidence?, feedback? }
 */
function recordOutcome(params) {
  params = params || {};
    var agentId    = params.agentId    || 'unknown';
    // รองรับทั้ง agentOutcome (ใหม่) และ outcome (legacy) เพื่อหลีกเลี่ยง Router key conflict
    var outcome    = params.agentOutcome || params.outcome || 'UNKNOWN'; // CORRECT | INCORRECT | PARTIAL
    // รองรับทั้ง agentAction (ใหม่) และ action (legacy)
    var action     = params.agentAction  || params.recordAction || 'unknown';
    var confidence = parseFloat(params.confidence || 0.5);
    var feedback   = params.feedback   || '';

  try {
    // บันทึก history
    var history = _asLoadHistory_();
    history.unshift({
      agentId:    agentId,
      action:     action,
      outcome:    outcome,
      confidence: confidence,
      feedback:   feedback,
      ts:         new Date().toISOString()
    });
    if (history.length > AS_CONFIG.MAX_HISTORY) history = history.slice(0, AS_CONFIG.MAX_HISTORY);
    _asSaveHistory_(history);

    // อัปเดต score
    var scores = _asLoadScores_();
    var score  = scores[agentId] || _asInitScore_(agentId);

    score.totalCalls++;
    if (outcome === 'CORRECT') {
      score.correct++;
      score.weight = Math.min(AS_CONFIG.MAX_WEIGHT, score.weight + AS_CONFIG.REWARD_RATE);
    } else if (outcome === 'INCORRECT') {
      score.incorrect++;
      score.weight = Math.max(AS_CONFIG.MIN_WEIGHT, score.weight - AS_CONFIG.DECAY_RATE);
    } else if (outcome === 'PARTIAL') {
      score.partial++;
      score.weight = Math.max(AS_CONFIG.MIN_WEIGHT, score.weight - AS_CONFIG.DECAY_RATE * 0.5);
    }

    // คำนวณ accuracy จาก window
    score.accuracy    = _asCalcAccuracy_(agentId, history);
    score.lastUpdated = new Date().toISOString();

    // ตรวจ auto-demotion
    if (score.totalCalls >= AS_CONFIG.MIN_SAMPLES && score.accuracy < AS_CONFIG.ACCURACY_THRESHOLD) {
      score.status = 'DEMOTED';
    } else if (score.accuracy >= AS_CONFIG.ACCURACY_THRESHOLD) {
      score.status = 'ACTIVE';
    }

    scores[agentId] = score;
    _asSaveScores_(scores);

    return {
      success:  true,
      agentId:  agentId,
      outcome:  outcome,
      newScore: { weight: parseFloat(score.weight.toFixed(3)), accuracy: score.accuracy, status: score.status }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── WEIGHTED CONSENSUS ────────────────────────────────────

/**
 * weightedConsensus — รวม votes จาก agents โดยถ่วงน้ำหนักตาม accuracy
 * @param {Object} params - { votes: [{agentId, vote, confidence?}], options? }
 * @returns {Object} { winner, confidence, breakdown }
 */
function weightedConsensus(params) {
  params = params || {};
  // รองรับทั้ง agentVotes (ใหม่) และ votes (legacy)
  var votes   = params.agentVotes || params.votes || [];
  var options = params.options || null; // ถ้าระบุ options จะ validate votes

  if (!votes.length) return { success: false, error: 'No votes provided' };

  try {
    var scores = _asLoadScores_();
    var tally  = {}; // { vote: totalWeight }
    var breakdown = [];

    votes.forEach(function(v) {
      var agentId    = v.agentId    || 'unknown';
      var vote       = v.vote       || '';
      var confidence = parseFloat(v.confidence || 1.0);
      var score      = scores[agentId];

      // คำนวณ effective weight
      var baseWeight = score ? score.weight : AS_CONFIG.INITIAL_WEIGHT;
      var samples    = score ? score.totalCalls : 0;

      // ถ้า samples น้อยกว่า MIN_SAMPLES → ใช้ weight ต่ำกว่า
    // ถ้า samples = 0 (agent ใหม่) ให้ใช้ INITIAL_WEIGHT เต็ม
    var sampleFactor = samples === 0 ? 1.0 : (samples >= AS_CONFIG.MIN_SAMPLES ? 1.0 : (samples / AS_CONFIG.MIN_SAMPLES));
    var effectiveWeight = baseWeight * confidence * sampleFactor;

      tally[vote] = (tally[vote] || 0) + effectiveWeight;
      breakdown.push({
        agentId:         agentId,
        vote:            vote,
        baseWeight:      parseFloat(baseWeight.toFixed(3)),
        confidence:      confidence,
        effectiveWeight: parseFloat(effectiveWeight.toFixed(3)),
        accuracy:        score ? score.accuracy : null,
        status:          score ? score.status : 'NEW'
      });
    });

    // หา winner
    var winner     = null;
    var maxWeight  = 0;
    var totalWeight = 0;
    Object.keys(tally).forEach(function(v) {
      totalWeight += tally[v];
      if (tally[v] > maxWeight) { maxWeight = tally[v]; winner = v; }
    });

    var consensusConf = totalWeight > 0 ? parseFloat((maxWeight / totalWeight).toFixed(3)) : 0;

    return {
      success:    true,
      winner:     winner,
      confidence: consensusConf,
      tally:      tally,
      breakdown:  breakdown,
      totalVotes: votes.length,
      method:     'weighted-accuracy'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── AGENT SCORE MANAGEMENT ────────────────────────────────

/**
 * getAgentScore — ดู score ของ agent ที่ระบุ
 */
function getAgentScore(params) {
  try {
    params = params || {};
    var agentId = params.agentId || '';
    var scores  = _asLoadScores_();

    if (agentId) {
      var score = scores[agentId] || _asInitScore_(agentId);
      return Object.assign({ success: true, agentId: agentId }, score);
    }

    // ส่งคืนทุก agent
    var all = Object.keys(scores).map(function(id) {
      return Object.assign({ agentId: id }, scores[id]);
    });
    all.sort(function(a, b) { return b.accuracy - a.accuracy; });
    return { success: true, agents: all, count: all.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentLeaderboard — จัดอันดับ agents ตาม accuracy
 */
function getAgentLeaderboard(params) {
  try {
    params = params || {};
    var limit  = parseInt(params.limit || 10, 10);
    var scores = _asLoadScores_();

    var leaderboard = Object.keys(scores).map(function(id) {
      var s = scores[id];
      return {
        rank:       0,
        agentId:    id,
        accuracy:   s.accuracy,
        weight:     parseFloat(s.weight.toFixed(3)),
        totalCalls: s.totalCalls,
        correct:    s.correct,
        incorrect:  s.incorrect,
        partial:    s.partial || 0,
        status:     s.status,
        lastUpdated: s.lastUpdated
      };
    });

    leaderboard.sort(function(a, b) { return b.accuracy - a.accuracy; });
    leaderboard.forEach(function(e, i) { e.rank = i + 1; });

    return {
      success:     true,
      leaderboard: leaderboard.slice(0, limit),
      total:       leaderboard.length
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * resetAgentScore — รีเซ็ต score ของ agent (admin)
 */
function resetAgentScore(params) {
  try {
    params = params || {};
    var agentId = params.agentId || '';
    if (!agentId) return { success: false, error: 'agentId required' };

    var scores = _asLoadScores_();
    scores[agentId] = _asInitScore_(agentId);
    _asSaveScores_(scores);
    return { success: true, agentId: agentId, message: 'Score reset to initial state' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentScoringVersion
 */
function getAgentScoringVersion() {
  return {
    success: true,
    version: AS_VERSION,
    module: 'AgentScoring',
    features: ['outcome-tracking', 'weighted-consensus', 'accuracy-scoring', 'leaderboard', 'auto-demotion', 'score-reset']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _asInitScore_(agentId) {
  return {
    agentId:     agentId,
    weight:      AS_CONFIG.INITIAL_WEIGHT,
    accuracy:    0.5,  // สมมติ 50% สำหรับ agent ใหม่
    totalCalls:  0,
    correct:     0,
    incorrect:   0,
    partial:     0,
    status:      'NEW',
    createdAt:   new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

function _asCalcAccuracy_(agentId, history) {
  var cutoff  = Date.now() - AS_CONFIG.WINDOW_DAYS * 24 * 60 * 60 * 1000;
  var recent  = history.filter(function(h) {
    return h.agentId === agentId && new Date(h.ts).getTime() >= cutoff;
  });

  if (recent.length === 0) return 0.5;

  var correct = recent.filter(function(h) { return h.outcome === 'CORRECT'; }).length;
  var partial = recent.filter(function(h) { return h.outcome === 'PARTIAL'; }).length;
  var total   = recent.length;

  // PARTIAL นับเป็น 0.5
  return parseFloat(((correct + partial * 0.5) / total).toFixed(3));
}

function _asLoadScores_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(AS_SCORES_KEY) || '{}';
    return JSON.parse(raw);
  } catch(e) { return {}; }
}

function _asSaveScores_(scores) {
  PropertiesService.getScriptProperties().setProperty(AS_SCORES_KEY, JSON.stringify(scores));
}

function _asLoadHistory_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(AS_HISTORY_KEY) || '[]';
    return JSON.parse(raw);
  } catch(e) { return []; }
}

function _asSaveHistory_(history) {
  PropertiesService.getScriptProperties().setProperty(AS_HISTORY_KEY, JSON.stringify(history));
}
