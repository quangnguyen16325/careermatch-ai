# Project documentation baseline

Review date: 2026-11-16. This is a reconciliation record, not an approval of
completion, contribution percentages, or historical delivery dates.

## Source documents

The existing team documents remain the source for business scope and project
planning. Reuse and review their content instead of producing competing copies.

- [Shared document folder](https://drive.google.com/drive/folders/1Wg_PujFDCGF0-6k3y9Zj6SpCPrUidFbK).
- [Project Charter](https://docs.google.com/document/d/1bDcM4pns81XbFVXVyc8VY_pcA-HdLZTX/edit): stakeholders, three user roles, business flows, scope, MVP, milestones, risks, and Definition of Done.
- [WBS and WBS Dictionary](https://docs.google.com/document/d/1KKHPjIdlPFest0HZJ95JkPlFkR6YxhV9/edit): 28 work packages, deliverables, acceptance criteria, dependencies, proposed roles, and durations.
- [Final Technical Report](https://docs.google.com/document/d/1rTlLloDGmE_rmJc9oeyrn0Io_zEe_Eho/edit): management narrative and delivery claims. Claims require the evidence checks recorded in [the reconciliation log](evidence-reconciliation.md).
- [Risk Register Evolution](https://docs.google.com/spreadsheets/d/1QSTOZZF-9drX9L3XMN6tzVN27l8oDSiT/edit): R01–R10, mitigation plans, W6/W11 observations, and referenced evidence. Preserve risk descriptions; verify references and outcomes before treating risks as resolved.

This review read the four documents above. It did not assess the slides/rubric,
approve the reports, or establish whether another repository holds the cited evidence.

## Traceability and existing work

[wbs-issue-map.json](wbs-issue-map.json) links all 28 source work packages to the
32 parent Issues and 80 implementation Issues in
[CareerMatch AI Project 6](https://github.com/users/quangnguyen16325/projects/6).
WBS identifiers and CM identifiers are separate namespaces: 28 work packages do
not need to equal 32 parent Issues. One Issue can contribute to more than one work
package. A cross-reference is not a second task or an additional effort estimate.

- CM-033 now reviews stakeholder/role coverage in the existing Charter and WBS.
  It should add only missing requirements, not rewrite those reports.
- CM-034 now reconciles existing MVP inclusions/exclusions. Final approval of
  disputed scope must be recorded by the team.
- CM-035 still needs measurable non-functional acceptance criteria. A risk list
  or high-level security statement alone is not a complete SRS.
- CM-036/037 should inspect the existing architecture and Prisma schema and
  deliver the missing contracts, ERD, and validation evidence.
- CM-038/039 should verify the starter environment and CI rather than recreate
  the initial scaffold. The initial commit already contains Docker, Prisma, and CI.
- Implementation, testing, deployment, and demo Issues remain unverified until
  their own acceptance criteria have supporting evidence.

## Scope decisions still requiring confirmation

- Advanced Career Roadmaps and AI Interview Practice are deferred from the
  working MVP plan. The reports must not cite current Issue #45 as proof of an
  approved scope change: that Issue describes secure CV storage/access.
- The WBS asks the team to confirm the depth of email verification and password
  recovery in the MVP. Existing CM-043/053 remain planned until that decision is recorded.
- WBS 1.7.3 (candidate matching/ranking) currently relies on shared matching and
  candidate-review Issues. Confirm an explicit job-to-candidate scoring/ranking
  acceptance scenario during contract review; do not assume UI sorting proves AI matching.
- Source work-package durations are proposed at 1–2 weeks. GitHub dates and
  1–2-day task estimates were later planning allocations, not measured effort or
  evidence of past work. Resource feasibility and dependencies need a separate review.

## Current responsibility allocation

The following GitHub allocation reflects the user's most recent assignment swap.
It is a working allocation, not a statement about each member's prior work.

- `quangnguyen16325`: platform/backend foundations, infrastructure, and coordination.
- `tanthinh24`: Student frontend.
- `letho2k5`: Employer/Admin frontend.
- `NguyenDucHoangHuy`: recruitment backend and notifications.
- `Noooark`: AI and matching.

The Final Report lists different specialist roles. Reconcile that section with the
team before publishing contribution claims. Equal task counts do not establish equal effort.

## Synchronization sequence

1. This change: index source documents, map WBS to Issues, and record evidence gaps.
2. Review missing acceptance criteria, confirm scope and responsibility decisions,
   and correct report claims using actual evidence or clearly identified draft targets.
3. Verify the local environment, generated Prisma client, database connectivity,
   and existing CI before implementing authentication.
4. Implement CM-040 registration/password hashing, then CM-041 sessions and
   CM-042 authorization in reviewable changes.
5. Update Issue/Project status only when the corresponding deliverable is reviewed.
   A planning date, report heading, or newly created Issue is not completion evidence.

Do not backdate commits or create empty commits to match report totals. Reference
actual commit hashes, PR URLs, CI runs, test reports, and release tags as work proceeds.
