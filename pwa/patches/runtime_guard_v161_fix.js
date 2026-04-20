(function () {
  const W = window;

  // =========================
  // 1. HARD FIX: DATA_INTEGRITY
  // =========================
  if (!W.DATA_INTEGRITY) W.DATA_INTEGRITY = {};

  const _record = W.DATA_INTEGRITY.record;

  W.DATA_INTEGRITY.record = function (type, payload) {
    try {
      if (typeof _record === 'function') {
        return _record(type, payload);
      }

      if (!W.__DI_LOG) W.__DI_LOG = [];
      W.__DI_LOG.push({ type, payload, ts: Date.now() });

      console.warn('[DATA_INTEGRITY:FALLBACK]', type, payload || '');
    } catch (e) {}
  };

  // =========================
  // 2. HARD FIX: ARRAY SAFETY
  // =========================
  W.safeArray = function (v, tag = 'unknown') {
    if (!Array.isArray(v)) {
      W.DATA_INTEGRITY.record('invalid_array', { tag, value: v });
      return [];
    }
    return v;
  };

  // =========================
  // 3. PATCH API RESPONSE
  // =========================
  if (W.API_CONTROLLER && typeof W.API_CONTROLLER.call === 'function') {
    const original = W.API_CONTROLLER.call;

    W.API_CONTROLLER.call = async function (...args) {
      const res = await original.apply(this, args);

      try {
        if (res && typeof res === 'object') {
          if ('alerts' in res) {
            res.alerts = W.safeArray(res.alerts, 'alerts');
          }
        }
      } catch (e) {
        W.DATA_INTEGRITY.record('api_patch_error', e.message);
      }

      return res;
    };
  }

  // =========================
  // 4. GLOBAL ERROR GUARD
  // =========================
  if (!W.__GLOBAL_GUARD__) {
    W.__GLOBAL_GUARD__ = true;

    window.addEventListener('error', (e) => {
      W.DATA_INTEGRITY.record('runtime_error', e.message);
    });

    window.addEventListener('unhandledrejection', (e) => {
      W.DATA_INTEGRITY.record('promise_error', e.reason);
    });
  }

  // =========================
  // 5. RENDER SAFETY
  // =========================
  W.safeText = function (v, def = '') {
    if (v == null) {
      W.DATA_INTEGRITY.record('undefined_render');
      return def;
    }
    return v;
  };

  // =========================
  // 6. HEALTH CHECK
  // =========================
  W.__RUNTIME_FIX_CHECK = function () {
    return {
      dataIntegrityOK: typeof W.DATA_INTEGRITY.record === 'function',
      apiPatched: !!W.API_CONTROLLER,
      safeArrayReady: typeof W.safeArray === 'function'
    };
  };

  console.log('[RUNTIME GUARD v161 FIX LOADED]');
})();
