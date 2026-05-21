// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.39-sprint173',
  buildDate: '2026-05-07',
  buildTimestamp: '20260521_0400',
  cacheVersion: 'comphone-v5.18.39-sprint173-20260521_0400',
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
    'Sprint 173 release readiness master gate'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.39-sprint173';
const BUILD_TIMESTAMP = '20260521_0400';
const CACHE_VERSION = 'comphone-v5.18.39-sprint173-20260521_0400';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;
