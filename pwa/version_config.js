// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.46-sprint184',
  buildDate: '2026-05-07',
  buildTimestamp: '20260521_1130',
  cacheVersion: 'comphone-v5.18.46-sprint184-20260521_1130',
  theme: 'glassmorphism-2.0',
  author: 'Comphone Team',
  features: [
    'Fixed Setup/Login (saveSetup) Bug',
    'DashboardBundle API (10x faster)',
    'Glassmorphism 2.0 KPI Cards',
    'Improved Cache Busting',
    'Stable Login Flow',
    'Runtime Self-Test Panel',
    'Write-flow idempotency and offline replay stability',
    'Gated staging write smoke for create flows',
    'AI Vision capability audit and workflow contract',
    'AI Vision PC and mobile operations panel',
    'AI Vision runtime smoke and browser self-test',
    'AI Vision Gemini readiness indicators',
    'AI Vision E2E safety gate and human review queue',
    'AI Vision field job timeline link',
    'AI Vision suggested next actions',
    'AI Vision controlled execution gate',
    'AI Vision execution preview and LINE room router',
    'LINE Command Center with room status, ack tracking, and safe room messaging',
    'CI/CD deploy reliability guards and Pages freshness checks',
    'Sprint 99 live cache-bust and operator readiness verification',
    'Sprint 100 operator menu click-through guard',
    'Sprint 112 Admin Repair Console for PC Settings and Mobile Admin',
    'Sprint 113-117 Jobs/Billing/Reports/Vision/LINE operational hardening',
    'Sprint 118 mobile quick action modal switching',
    'Sprint 119 Inventory/PO/Warranty workflow hardening',
    'Sprint 120 Settings/Admin runtime hardening',
    'Sprint 121 performance/accessibility guardrails',
    'Sprint 122 dashboard operator analytics polish',
    'Sprint 123 live visual QA and mobile asset manifest completeness',
    'Sprint 124 protected visual/menu QA runbook',
    'Sprint 125 role-based dashboard widgets',
    'Sprint 127 per-room LINE notification controls',
    'Sprint 154 post-deploy Pages confirmation',
    'Sprint 155 owner data backfill readiness',
    'Sprint 156 mobile menu E2E guard',
    'Sprint 157 PC dashboard workflow guard',
    'Sprint 158 AI Vision and LINE room control guard',
    'Sprint 159 post-deploy publish confirmation',
    'Sprint 160 real browser click-through contract',
    'Sprint 161 protected live token sweep',
    'Sprint 162 owner data cleanup decision pack',
    'Sprint 163 AI Vision real sample pilot gate',
    'Sprint 164 Pages publish lock',
    'Sprint 165 browser profile click-through pack',
    'Sprint 166 protected token full sweep pack',
    'Sprint 167 owner cleanup execution readiness',
    'Sprint 168 AI Vision real sample runbook',
    'Sprint 169 Pages fresh release gate',
    'Sprint 170 protected browser acceptance gate',
    'Sprint 171 AI Vision sample evidence contract',
    'Sprint 172 LINE room notification matrix gate',
    'Sprint 173 release readiness master gate',
    'Sprint 174 strict protected browser runbook',
    'Sprint 175 AI Vision sample pilot gate',
    'Sprint 176 published protected acceptance',
    'Sprint 177 AI Vision real sample evidence',
    'Sprint 178 strict live acceptance gate',
    'Sprint 179 AI Vision real sample execution gate',
    'Sprint 180 strict protected live proof',
    'Sprint 181 AI Vision owner sample run gate',
    'Sprint 182 smoke/test data cleanup execution controls',
    'Sprint 183 LINE AI Vision ingress readiness guard',
    'Sprint 184 Jobs detail and archive-delete repair'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.46-sprint184';
const BUILD_TIMESTAMP = '20260521_1130';
const CACHE_VERSION = 'comphone-v5.18.46-sprint184-20260521_1130';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;
