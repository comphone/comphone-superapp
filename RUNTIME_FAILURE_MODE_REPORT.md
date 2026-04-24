# COMPHONE SUPER APP — Runtime & Maintainability Assessment
## Failure Mode Map, Hidden Risks, Maintainability Score

**Date:** 2026-04-24
**Assessed by:** Runtime & Maintainability Agent

---

## 1. FAILURE MODE MAP

### 🔴 CRITICAL — HIGH IMPACT HIDDEN FAILURES

#### F1: PropertiesService 500KB Overflow During Cron Burst
**Severity:** CRITICAL | **Likelihood:** MEDIUM-HIGH

Multiple components write to `PropertiesService.getScriptProperties()` simultaneously:
- `DecisionGuard.gs` — stores cooldown, dedup, rate limit counters (4 keys)
- `WorkflowSafety.gs` — stores circuit breaker state, safety log (2 keys)
- `WorkflowEngine.gs` — stores custom workflows, run log (2 keys)
- `AgentMemory.gs` — stores incidents, patterns, rules (multiple keys)
- `LearningIntegration.gs` — stores learning data
- `HealthMonitor.gs` — health state
- `PropertiesGuard.gs` — guard state itself

**The 500KB limit is shared across ALL of these.** When `cronHealthCheck` fires (every 30 min), it triggers `decideAndAct` → which logs to DecisionGuard + WorkflowSafety + AgentMemory + WorkflowEngine run log. If health is bad, it triggers QC_FAIL workflow → which stores more incidents + patterns.

**What goes wrong:** A cascade event (bad health → workflow → more logs → more properties) can push total properties over 500KB. At that point, `setProperty()` throws silently (caught by `catch(e){}`), and the system enters a **silent data loss state** — guard states aren't saved, circuit breaker resets are lost, cooldowns stop working.

**PropertiesGuard** monitors this, but its `propertiesGuardCleanup_` runs on its own schedule and may not fire in time during a burst.

#### F2: Simultaneous Cron Trigger Collision
**Severity:** CRITICAL | **Likelihood:** HIGH (guaranteed eventually)

**12+ time-based triggers exist:**
| Trigger | Interval | File |
|---------|----------|------|
| `cronHealthCheck` | Every 30 min | HealthMonitor.gs |
| `cronHealthCheck` | Every 30 min | AutoBackup.gs (DUPLICATE!) |
| `sendDailyDigest` | Daily | LineBotQuota.gs |
| `runRetentionPolicy` | Scheduled | MemoryControl.gs |
| `propertiesGuardCleanup_` | Scheduled | PropertiesGuard.gs |
| `notifyLowStock` | Daily 9am | PushNotifications.gs |
| `sendDailyBriefing` | Daily 8am | PushNotifications.gs |
| `runLearningCycle` | Scheduled | LearningIntegration.gs |
| `processFeedbackLoop` | Scheduled | VisionLearning.gs |
| `autoGenerateRulesFromPatterns` | Scheduled | VisionLearning.gs |
| `cronTaxReminder` | Daily 1st of month | TaxDocuments.gs |
| `autoSyncToDrive` | Scheduled | DriveSync.gs |

**`cronHealthCheck` is registered in BOTH `AutoBackup.gs` (line 131) AND `HealthMonitor.gs` (line 283).** While AutoBackup checks for existing triggers (line 136-148), if both `setupAllTriggers()` functions run, you could get duplicate `cronHealthCheck` triggers running every 30 min simultaneously.

**Result:** Two parallel cronHealthCheck executions both call `decideAndAct` → both try to read/write the same PropertiesService keys → **last-write-wins race condition**. One execution's circuit breaker update overwrites the other's.

#### F3: WorkflowEngine Timeout → Half-Executed State
**Severity:** CRITICAL | **Likelihood:** MEDIUM

When a workflow is running (e.g., QC_FAIL has 4 steps), if GAS kills execution at ~6 minutes:
- Step 1 (memory.storeIncident) ✅ executed
- Step 2 (alert.queue) ✅ executed  
- Step 3 (vision.review) ❌ never started
- Step 4 (alert.queue to technician) ❌ never started

**Result:** Incident is logged, P1 alert sent, but human review never requested and technician never notified. The workflow run log may or may not be saved depending on when timeout hit.

**WorkflowSafety.gs** has `TOTAL_TIMEOUT_MS = 270000` (4.5 min), but this is a **soft timeout** — it checks between steps, not during them. A single slow API call (e.g., `agentGatewayDispatch`) could exceed GAS's 6-min hard limit before the soft timeout check runs.

---

### 🟠 HIGH — SIGNIFICANT RISK

#### F4: DecisionLayer → WorkflowEngine Infinite Recursion Chain
**Severity:** HIGH | **Likelihood:** LOW (mitigated but not eliminated)

Chain: `decideAndAct()` → `_dlExecuteAction_('triggerWorkflow')` → `triggerWorkflow()` → `_wfRunStep_()` → `agentGatewayDispatch()` → could call back to `decideAndAct()` via Router.gs

**Mitigation exists:** `WorkflowSafety.gs` has `MAX_WORKFLOW_DEPTH: 5` and `DecisionGuard.gs` has cooldowns. BUT:
- `DecisionLayer._dlExecuteAction_()` calls `triggerWorkflow` directly (line 285), NOT `safeTriggerWorkflow`
- The depth counter (`_depth`) is only checked in `safeTriggerWorkflow`, not in `triggerWorkflow`
- If a workflow step triggers a decision → which triggers another workflow → depth is NOT tracked

#### F5: DecisionGuard Fail-Open Design
**Severity:** HIGH | **Likelihood:** MEDIUM

`DecisionGuard.gs` uses `catch(e) { return { allowed: true } }` pattern throughout:
- `_dgCheckCooldown_` (line 162): fail-open
- `_dgCheckDedup_` (line 205): fail-open  
- `_dgCheckRateLimit_` (line 257): fail-open

If PropertiesService is down or over quota, **ALL guards fail open simultaneously** — unlimited workflows and decisions execute without any dedup, cooldown, or rate limiting. This is the exact opposite of what you want during a crisis.

#### F6: Circuit Breaker State in PropertiesService Creates Circular Dependency
**Severity:** HIGH | **Likelihood:** MEDIUM

`WorkflowSafety._wsSaveCircuit_()` writes to PropertiesService. If PropertiesService is full (500KB), the circuit breaker state **cannot be saved**. The circuit breaker then resets to CLOSED on next read (line 373: `catch(e) { return {} }`), meaning:
- Workflows that should be OPEN (blocked) become CLOSED (allowed)
- Failed workflows keep executing because their failure records aren't persisted

---

### 🟡 MEDIUM — MODERATE RISK

#### F7: Frontend Self-Heal Loop Can Mask Real Problems
**Severity:** MEDIUM

`ai_executor_runtime.js` auto-starts `SELF_HEAL` loop (line 982-986) after 10 seconds. This loop:
- Runs every 30 seconds
- Auto-fixes `APPROVAL_REQUIRED` by clearing tokens
- Auto-fixes `RATE_LIMIT` by clearing all locks
- Auto-fixes `TRUST` by resetting trust flag

**Problem:** If there's a genuine trust issue or permission problem, the self-heal loop silently resets the safety flags every 30 seconds, masking the real problem. An operator looking at the system sees "healthy" while actual permissions are broken.

#### F8: GAS_EXECUTE Static Hosting Fallback Sends Payloads via GET
**Severity:** MEDIUM

`execution_lock.js` line 359-383: When running on static hosting, `GAS_EXECUTE` sends payloads as URL query parameters:
```
fetch(gasUrl + '?' + new URLSearchParams(payload).toString())
```
- URL length limits (~2000 chars) will silently truncate large payloads
- Sensitive data in URL is visible in server logs
- No POST body, so large data fails silently

#### F9: Execution Lock Script Loading Order Dependency
**Severity:** MEDIUM

`ai_executor_runtime.js` must load AFTER `execution_lock.js` but both are independent files. If load order changes:
- `window.__TRUSTED_ACTIONS` might not exist (ai_executor sets fallback via `|| {}`)
- `AI_EXECUTOR.execute` and `.query` would use fallback implementations
- The Proxy lock on `google.script.run` might not be installed yet

The code handles this defensively, but the fallback path is less secure.

#### F10: Approval Token Race Condition (3-second TTL)
**Severity:** MEDIUM

`__LAST_APPROVED_ACTION` is a single global token with 3-second TTL. If:
1. User approves action A (token set)
2. Before token expires, self-heal loop fires and clears it
3. Action A's execution tries to use the token → already consumed

Or: Two tabs open simultaneously — both see the same approval, but only one gets the token.

---

## 2. HIDDEN FAILURE PATHS (UNTESTED SCENARIOS)

### 🔴 THE BIGGEST HIDDEN FAILURE: "The Cron Storm"

**Nobody has tested what happens when ALL cron triggers fire within the same 2-minute window.**

Scenario:
1. `cronHealthCheck` fires at XX:30 (every 30 min)
2. `sendDailyBriefing` fires at 8:00 AM
3. `notifyLowStock` fires at 9:00 AM
4. `cronHealthCheck` (duplicate from AutoBackup) also fires at XX:30
5. `runRetentionPolicy` fires at its scheduled time

All of these:
- Read from PropertiesService (quota: 50 reads/minute)
- Write to PropertiesService (quota: 50 writes/minute)
- Potentially call `getSystemContext()` which reads a Spreadsheet
- Potentially trigger workflows which read/write more properties

**GAS quotas:** 50 property reads/min, 50 property writes/min, 30 Spreadsheet reads/min

If enough triggers overlap, you hit quota limits → all reads/writes fail → DecisionGuard fails open → circuit breaker resets → workflows execute without guardrails.

**This is a cascade failure that only manifests under load and cannot be reproduced in testing.**

---

## 3. MAINTAINABILITY ANALYSIS

### Code Complexity Metrics
| File | Lines | Complexity | Maintainability |
|------|-------|-----------|-----------------|
| WorkflowEngine.gs | 535 | Medium | Good — clean step-based design |
| DecisionLayer.gs | 330 | Medium | Good — 3 clear strategies |
| WorkflowSafety.gs | 388 | Medium | Good — well-structured safety layer |
| DecisionGuard.gs | 444 | Medium | Good — clear cooldown/dedup/rate |
| ai_executor_runtime.js | 986 | **HIGH** | **Concerning** — too many subsystems in one file |
| execution_lock.js | 520 | Medium | Good — clean IIFE pattern |

### Architectural Concerns

1. **Circular dependencies:** DecisionLayer calls triggerWorkflow; WorkflowEngine calls agentGatewayDispatch which could call DecisionLayer back.

2. **Too many parallel state stores:** PropertiesService is used as a shared state store by 8+ modules with no coordination. This is the #1 maintainability risk.

3. **Silent error swallowing:** `catch(e) {}` appears in **30+ locations** across the GAS files. Errors are silently discarded, making debugging nearly impossible.

4. **Frontend file has too many responsibilities:** `ai_executor_runtime.js` (986 lines) contains: trust system, approval queue, circuit breaker, failure memory, error normalization, execution trace, auto-fix engine, self-heal loop, fix learning engine, policy checking. This should be 5+ separate modules.

5. **Duplicated cron registration:** Both AutoBackup.gs and HealthMonitor.gs register `cronHealthCheck` trigger. `setupAllTriggers()` in AutoBackup checks for duplicates, but `setupHealthCheckTrigger()` in HealthMonitor deletes ALL existing and recreates — potential for race conditions.

---

## 4. MAINTAINABILITY SCORE

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | 7/10 | Good separation of concerns at module level, but tight coupling between automation layers |
| **Error Handling** | 4/10 | Far too many silent `catch(e) {}`. DecisionGuard fail-open is dangerous. |
| **State Management** | 4/10 | PropertiesService as shared state is a ticking time bomb. No distributed locking. |
| **Testability** | 3/10 | No unit tests found. Dry run exists for workflows but not for decisions/guards. |
| **Observability** | 7/10 | Good execution trace, safety logs, guard logs. But logs stored in PropertiesService creates circular dependency. |
| **Safety Mechanisms** | 8/10 | Excellent: circuit breaker, cooldown, dedup, rate limit, depth limit, timeout, dry run |
| **Code Quality** | 7/10 | Clean, well-commented (Thai + English), version-stamped |
| **Resilience** | 5/10 | Good fallback patterns, but fail-open on guard errors and silent data loss on 500KB overflow |

### **OVERALL MAINTAINABILITY SCORE: 5.8 / 10**

---

## 5. TOP 5 RECOMMENDATIONS

1. **Move state out of PropertiesService** — Use Spreadsheet or external DB for guard state, circuit breaker, safety logs. Keep only config in PropertiesService. This eliminates F1, F6, and the Cron Storm problem.

2. **Fix DecisionGuard fail-open** — Change to `catch(e) { return { allowed: false, reason: 'GUARD_ERROR_FAIL_SAFE' } }`. Under uncertainty, block rather than allow.

3. **Deduplicate cronHealthCheck** — Remove from AutoBackup.gs or HealthMonitor.gs. Use only one registration path.

4. **Route all workflow triggers through safeTriggerWorkflow** — DecisionLayer._dlExecuteAction_ should call `safeTriggerWorkflow` not `triggerWorkflow`, to get depth tracking + circuit breaker protection (fixes F4).

5. **Add PropertiesService quota monitoring** — Before every write, check remaining quota. If < 20% remaining, switch to Spreadsheet overflow mode automatically.
