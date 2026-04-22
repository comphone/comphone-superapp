# 🏛️ COMPHONE COUNCIL CONSTITUTION v1.0
**Architecture Governance Document**

## 1. CORE PRINCIPLES
- **No Single Point of Failure:** No single agent may authorize a production deploy or a high-impact system change.
- **Security Veto Absolute:** If the Security Agent issues a VETO, the action is blocked immediately, regardless of other votes.
- **Evidence-First:** Runtime evidence (logs, trace, failure memory) always overrides agent assumptions.
- **Baseline Invariant:** Any change to the frozen baseline (v5.6.5) must be challenged by the Architect Agent.

## 2. COUNCIL ROLES & RESPONSIBILITIES
- **Hermes Prime Supervisor:** Final decision maker, orchestrates voting, manages the Council state.
- **Architect Agent:** Ensures structural integrity, checks baseline drift, verifies blueprints.
- **Code Agent:** Validates syntax, logic correctness, and implementation efficiency.
- **Security Agent:** Identifies vulnerabilities, enforces PHMP invariants, manages the Veto.
- **Runtime Agent:** Monitors execution trace, failure memory, and real-time system health.
- **Recovery Agent:** Designs rollback paths and fail-safe mechanisms.

## 3. DECISION MODEL (VOTING)
Council decisions are based on a tri-state vote:
- **GO:** Action is safe and aligned with goals.
- **HOLD:** Action requires more evidence, refined plan, or human intervention.
- **ESCALATE:** Action is dangerous or fundamentally flawed; must go to Human Admin.

### 3.1 Voting Weights & Quorum
- **Quorum:** 3/6 agents must vote.
- **Passing Vote:** Simple majority of GO votes, provided there is no VETO.
- **Veto Power:** Security Agent can issue a `HARD_VETO` to block any action immediately.

### 3.2 Escalation Thresholds
- 2+ HOLD votes → Automatic HOLD (Request more info).
- 1+ ESCALATE vote → Automatic ESCALATION (Human Override).
- Security VETO → Automatic BLOCK.

## 4. GOVERNANCE WORKFLOW
1. **Proposal:** Supervisor presents a plan/patch.
2. **Review:** Each agent analyzes based on their domain.
3. **Voting:** Agents submit GO/HOLD/ESCALATE.
4. **Verdict:** Supervisor aggregates votes and applies the decision.
5. **Audit:** Decision is logged to `window.__AI_AUDIT_LOG`.
