# Evidence reconciliation log

Observed on 2026-11-16, before the documentation synchronization PR was created.
Scope: `quangnguyen16325/careermatch-ai` and the four source documents linked in
[project-baseline.md](project-baseline.md). Another repository or unpublished work
may contain additional evidence; none has been supplied or verified in this review.

## Findings

### E-01: repository history

Final Report section 5.1 states 178 commits by five members. At review time the
remote branches `main` and `develop` both pointed to
`65fda4c2df97bbb0f1d085ac5f4fd576a4410509`, the initial scaffold commit. The PR list
was empty. The claimed history is not substantiated by this repository snapshot.
Locate the source repository/export or revise the report to describe the actual state.

### E-02: PR and change-request references

The Final Report and Risk Register cite PR #5, #12, #15, #18, #35, #42, #50, #52,
and #55. There were no PRs in this repository at review time. Current
[Issue #45](https://github.com/quangnguyen16325/careermatch-ai/issues/45) is
`[CM-045] Implement secure CV storage and access APIs`, not the scope Change Request
described in the reports. Issue #8 is the ERD/data-lifecycle work package, not an
incident record proving schedule recovery. Retain current Issue identities; replace
report references only after locating the intended evidence. Do not manufacture
replacement PRs with those numbers.

### E-03: release and deployment

Section 7.2 claims a `v1.0.0` release and an accepted cloud deployment. No tags or
releases were returned by the repository at review time. Only
`.github/workflows/ci.yml` exists; the claimed `cd.yml` is absent. Require a real
release/tag, deployment URL, deployment run, and smoke-test evidence before acceptance.

### E-04: test and UAT results

Claims of 84 unit tests, 26 integration tests, 82.4% coverage, 35 UAT participants,
42 uploaded CVs, 78 applications, and SUS 83.5 were not verified by this review.
The starter API uses Vitest/oxlint, whereas the report describes Jest/ESLint.
Reconcile the actual toolchain and attach test commands/results, coverage artifacts,
and an anonymized UAT method/result summary. Never infer these results from task creation.

Local validation for the documentation synchronization passed `pnpm lint`,
`pnpm typecheck`, `pnpm test`, and `pnpm build`. The test command reported one
passing API test and two passing AI tests; the frontend reported no test files.
Coverage and UAT were not measured in this run. These results support the current
starter baseline only, not the report's broader test or acceptance claims.

### E-05: team size, allocation, and contribution arithmetic

Section 2.3 describes four members contributing 25% each but lists five members.
The listed percentages are 20%, 20%, 25%, 20%, and 20%, totaling 105%.
Confirm five-member roles and contribution calculations with the team. Do not
replace them with invented equal contribution or commit counts. Current GitHub
specialist assignments also differ from the report; see the baseline responsibility list.

### E-06: sprint totals

Section 4.3 records Sprint 2 completion as 62 of 65 SP, then describes all 65 SP
being burned down to zero. Confirm whether the remaining 3 SP were delivered,
removed from scope, or carried over, with supporting sprint/change records.

### E-07: scope baseline and schedule

The WBS defines 28 work packages with proposed 1–2-week durations and unresolved
resource/scope decisions. GitHub has 32 parent Issues and 80 smaller implementation
Issues, dated 2026-10-01 through 2026-11-16 as retrospective planning only.
These counts represent different levels of decomposition, not proof of 15 weeks
of execution. Use the mapping to avoid duplicate tracking and review dependencies
before treating dates as an approved delivery baseline.

## Evidence handling

The original Drive files were not edited by this change. Findings describe an
evidence mismatch, not a conclusion that no work exists elsewhere. Keep unresolved
claims marked as draft/unverified until an authorized team review resolves them.

Checks used: GitHub branches, PRs across all states, tags/releases, Issue #45,
workflow files, and the existing repository scaffold. The inventory is a dated
snapshot; this documentation PR and subsequent work will naturally change it.
