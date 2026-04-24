/**
 * telemetry_collector.js — COMPHONE SUPER APP
 * Minimal client-side telemetry (best-effort, non-blocking)
 *
 * Tracks: API latency (p50/p95), page views, quick actions, offline queue stats
 * Batches to localStorage('comphone_telemetry'), flushes to GAS via logTelemetry
 *
 * Size: ~3KB minified, <1KB overhead per event
 */

'use strict';

var Telemetry = (function() {
  var STORAGE_KEY = 'comphone_telemetry';
  var FLUSH_INTERVAL = 30 * 60 * 1000; // 30 min
  var OFFLINE_STATS_INTERVAL = 5 * 60 * 1000; // 5 min
  var MAX_EVENTS = 200; // cap in-memory to bound memory

  var _events = [];
  var _latencies = {}; // { action: [ms, ...] }
  var _pageViews = {}; // { pageName: count }
  var _quickActions = {}; // { actionName: count }
  var _sessionStart = Date.now();
  var _flushTimer = null;
  var _offlineTimer = null;

  // ===== HELPERS =====
  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _save(events) {
    try {
      // Keep last 500 events max in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500)));
    } catch (e) { /* quota exceeded — silently drop */ }
  }

  function _addEvent(type, data) {
    if (_events.length >= MAX_EVENTS) {
      _events = _events.slice(-100); // trim to keep last 100
    }
    _events.push({ t: type, d: data, ts: Date.now() });
  }

  function _percentile(sorted, p) {
    if (!sorted.length) return 0;
    var idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  // ===== API LATENCY TRACKING =====
  function wrapCallApi() {
    if (typeof callApi !== 'function' || callApi._telemetryWrapped) return;
    var _orig = callApi;
    window.callApi = async function(action, payload, options) {
      var t0 = Date.now();
      try {
        var result = await _orig(action, payload, options);
        var ms = Date.now() - t0;
        // Track latency per action (keep last 200 samples)
        if (!_latencies[action]) _latencies[action] = [];
        if (_latencies[action].length < 200) _latencies[action].push(ms);
        _addEvent('api', { a: action, ms: ms, ok: result && result.success !== false ? 1 : 0 });
        return result;
      } catch (e) {
        _addEvent('api', { a: action, ms: Date.now() - t0, ok: 0 });
        throw e;
      }
    };
    window.callApi._telemetryWrapped = true;
  }

  // ===== PAGE VIEW TRACKING =====
  function logPageView(pageName) {
    if (!pageName) return;
    _pageViews[pageName] = (_pageViews[pageName] || 0) + 1;
    _addEvent('pv', { p: pageName });
  }

  // ===== QUICK ACTION TRACKING =====
  function logQuickAction(actionName) {
    if (!actionName) return;
    _quickActions[actionName] = (_quickActions[actionName] || 0) + 1;
    _addEvent('qa', { a: actionName });
  }

  // ===== OFFLINE QUEUE STATS (every 5 min) =====
  function _collectOfflineStats() {
    try {
      if (typeof getQueueStats === 'function') {
        getQueueStats().then(function(stats) {
          _addEvent('offline', stats);
        }).catch(function() {});
      }
    } catch (e) { /* best-effort */ }
  }

  // ===== COMPUTE LATENCY SUMMARIES =====
  function _buildLatencySummary() {
    var summary = {};
    var keys = Object.keys(_latencies);
    for (var i = 0; i < keys.length; i++) {
      var action = keys[i];
      var vals = _latencies[action].slice().sort(function(a, b) { return a - b; });
      if (!vals.length) continue;
      summary[action] = {
        n: vals.length,
        p50: _percentile(vals, 0.5),
        p95: _percentile(vals, 0.95),
        avg: Math.round(vals.reduce(function(s, v) { return s + v; }, 0) / vals.length)
      };
    }
    return summary;
  }

  function _shallowCopy(obj) {
    var out = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = obj[keys[i]];
    return out;
  }

  // ===== BUILD PAYLOAD =====
  function _buildPayload() {
    return {
      sessionStart: _sessionStart,
      duration: Date.now() - _sessionStart,
      ua: navigator.userAgent,
      online: navigator.onLine,
      latency: _buildLatencySummary(),
      pageViews: _shallowCopy(_pageViews),
      quickActions: _shallowCopy(_quickActions),
      events: _events.slice(-50) // last 50 raw events
    };
  }

  // ===== FLUSH TO GAS =====
  async function flush() {
    if (!_events.length && !Object.keys(_pageViews).length) return;
    try {
      var payload = _buildPayload();
      // Fire-and-forget — never blocks
      if (typeof callApi === 'function') {
        callApi('logTelemetry', { payload: JSON.stringify(payload) }).catch(function() {});
      }
      // Persist to localStorage as backup
      var stored = _load();
      stored.push({ ts: Date.now(), data: payload });
      _save(stored);
      // Reset in-memory for next batch
      _events = [];
      _latencies = {};
      _pageViews = {};
      _quickActions = {};
    } catch (e) { /* best-effort */ }
  }

  // ===== INIT =====
  function init() {
    if (window._telemetryInit) return;
    window._telemetryInit = true;

    wrapCallApi();

    // Flush every 30 min
    _flushTimer = setInterval(flush, FLUSH_INTERVAL);

    // Offline stats every 5 min
    _offlineTimer = setInterval(_collectOfflineStats, OFFLINE_STATS_INTERVAL);
    _collectOfflineStats(); // first collection immediately

    // Flush on session end (beforeunload)
    window.addEventListener('beforeunload', function() {
      try {
        var payload = _buildPayload();
        var url = (typeof getGasUrl === 'function') ? getGasUrl() : '';
        if (url && navigator.sendBeacon) {
          var qs = 'action=logTelemetry&payload=' + encodeURIComponent(JSON.stringify(payload));
          navigator.sendBeacon(url + '?' + qs);
        }
      } catch (e) {}
      flush();
    });

    console.log('[Telemetry] Initialized');
  }

  // PUBLIC API
  return {
    init: init,
    logPageView: logPageView,
    logQuickAction: logQuickAction,
    flush: flush
  };
})();

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Telemetry.init);
} else {
  Telemetry.init();
}
