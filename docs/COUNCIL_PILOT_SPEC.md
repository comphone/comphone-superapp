# 🏛️ HERMES COUNCIL PILOT SPECIFICATION v1.0
**Mode: Shadow / Non-Blocking**

## 1. PILOT SCOPE (Constraint)
The Council operates ONLY within the following mission classes. Any request outside these scopes is automatically routed to Hermes Single-Agent mode.

### A. Incident Diagnostics
- Analysis of runtime errors, trace logs, and failure memory.
- Root cause hypothesis generation.
- Verification of "Fixed" status.

### B. Code Patch Review
- Review of proposed changes before commit.
- Syntax and logic validation.
- Side-effect analysis (Cross-file impact).

### C. Freeze Challenge Audits
- Review of requests to modify the Baseline (v5.6.5).
- Comparison of proposed change vs. Baseline invariants.
- Validation of "Necessity" for the change.

---

## 2. SHADOW MODE LOGIC
Council decisions are generated in parallel to the main agent but **do not control the system**.

**Decision Flow:**
1. **Hermes Single-Agent:** Processes task → Proposes Action $\rightarrow$ Executes.
2. **Council (Shadow):** Processes same task $\rightarrow$ Votes $\rightarrow$ Proposes Verdict.
3. **Divergence Log:** System records where `Single-Agent Action != Council Verdict`.

---

## 3. PILOT METRICS (KPIs)
The Council's effectiveness is measured by:

| Metric | Definition | Goal |
|--------|------------|------|
| **Disagreement Rate** | % of tasks where Council $\neq$ Single-Agent | Track consistency |
| **FP Reduction** | % of "Wrong" single-agent fixes caught by Council | $\downarrow$ Errors |
| **Patch Quality $\Delta$** | Reduction in subsequent regression failures per patch | $\uparrow$ Quality |
| **Security Veto Utility** | % of high-risk actions blocked by Council that single-agent would have allowed | $\uparrow$ Safety |
| **Diagnosis Speed** | Time to reach root cause (Council vs Single) | $\downarrow$ Time |

---

## 4. PILOT EXIT CRITERIA (The Gate to Production)
Promotion to Production Governance is allowed ONLY IF:

1. **Consistency:** Disagreement rate stabilizes $< 15\%$ for routine tasks.
2. **Safety:** Council catches $\geq 90\%$ of simulated high-risk errors (Security Veto success).
3. **Quality:** 0 Regressions introduced during Council-approved patches for 5 consecutive cycles.
4. **User Trust:** Human Admin confirms Council's "HOLD" decisions were justified.

**Verdict:** If any criterion is failed $\rightarrow$ Stay in Shadow Mode.
