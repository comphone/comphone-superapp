/*
 * Billing compatibility shim.
 *
 * The production Billing UI lives in billing_section.js. This file remains in
 * the load order for backwards compatibility with older shells, but it must not
 * provide fake demo data or unfinished handlers.
 */
(function(global) {
  'use strict';

  global.COMPHONE_BILLING_SHIM_READY = true;

  if (typeof global.renderBillingSection !== 'function') {
    global.renderBillingSection = function() {
      var mount = document.getElementById('billing-content') || document.getElementById('main-content');
      if (mount) {
        mount.innerHTML = '<div class="card-box"><h3>Billing</h3><p>Billing module is loading. Open Settings > Operations Diagnostics if this remains visible.</p></div>';
      }
      return '';
    };
  }
})(window);
