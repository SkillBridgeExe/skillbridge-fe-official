# W31 - Admin / Business / Mentor Demo-Ready Product UI

> **For Antigravity:** this is a **demo-readiness sprint**, not a backend-contract sprint. Some product areas already have real APIs; some do not. Use real APIs where they exist. Where an API does not exist yet, you may use curated demo fixtures, but the UI must clearly label them as demo/preview data and must not pretend they are live production records.

## Required Design Skill

Before editing UI, load and apply:

```txt
design-taste-frontend
```

Design read for this task:

```txt
Reading this as: product-dashboard demo readiness for business/admin/mentor users, with a clean SkillBridge SaaS dashboard language, leaning toward the existing Tailwind + Radix/shadcn + lucide visual system.
```

Use the existing SkillBridge visual language:

- Light dashboard surfaces: `bg-white`, `bg-slate-50`, `border-slate-200`.
- Main accent: existing `primary` / sky-blue family. Do not introduce a new purple/gradient AI theme.
- Radius system: existing soft dashboard radius, mostly `rounded-xl` / `rounded-2xl`.
- Icons: keep `lucide-react` because this project already uses it.
- Motion: subtle hover, active, loading skeletons. No landing-page animation.
- Density: dashboard-dense but readable. Tables, drawers, modals, and cards should scan quickly.
- Empty, loading, error, permission, and demo states are part of the design, not afterthoughts.

## Goal

Make Admin, Business, and Mentor areas demo-ready enough that a reviewer can understand the intended product value even when some backend APIs or seed data are missing.

This task should answer:

1. Which endpoint-backed features are live in the UI?
2. Which UI screens still use demo fixtures?
3. Which features are intentionally preview-only because the backend endpoint does not exist yet?
4. Can the demo be shown without dead buttons, confusing mocks, or fake-live claims?

## Non-Goals

- Do not build Learning/RAG UI. Another lane owns it.
- Do not build Diagnosis/CV Builder Companion UI. Another lane owns it.
- Do not invent new backend endpoints.
- Do not call NestJS AI directly from FE.
- Do not redesign the whole app shell.
- Do not remove a demo feature just because it lacks API. For demo, preserve the product vision with honest preview labels.

## Current Findings To Respect

### Business

Real API-backed areas:

- Business jobs list/create/duplicate/close/delete draft.
- Business job editor draft/save/publish/extract skills/confirm skills.
- Business applicants list/detail/timeline/download CV/status transitions.

Still not real API-backed:

- `/business/top-candidates` currently uses local `MOCK_CANDIDATES`.
- No FE route or API wrapper exists for a true business-side top-candidates marketplace.

API wrappers exist but need UI coverage:

- `useBusinessCompanyQuery`
- `useUpdateBusinessCompanyMutation`
- `useUploadCompanyMediaMutation`
- `useSubmitBusinessProfileMutation`
- `useSendWorkEmailVerificationMutation`
- `useVerifyWorkEmailMutation`

### Admin

Real API-backed areas:

- Admin users.
- Admin mentors.
- Admin billing.
- Admin job reports.

API wrappers exist but need UI coverage:

- `useAdminBusinessProfilesQuery`
- `useAdminBusinessProfileDetailQuery`
- `useReviewBusinessProfileMutation`
- `useAdminJobQuery`

### Mentor

Real API-backed areas:

- Mentor marketplace/profile.
- Mentor profile setup.
- Mentor availability.
- Mentor owned booking requests.
- Admin mentor review.
- Admin mentor bookings/refunds.

Needs product-depth audit:

- Booking detail view or detail modal using `useBooking`.
- Clear empty/error/loading states for requests, availability, and booking actions.
- Confirm/cancel/complete flows with notes and safe confirmation.

## Work Breakdown

Implement as small commits or small PRs. If one area becomes large, split it.

---

## PR 1 - Endpoint Coverage Matrix Page/Doc

### Scope

Create a living coverage matrix document in:

```txt
docs/tasks/W31-endpoint-coverage-matrix.md
```

This is for humans and agents. It should list Admin, Business, Mentor API wrappers and whether each has:

- UI route/page.
- Hook/service.
- Real API-backed state.
- Demo fixture fallback.
- Missing UX states.
- Demo risk.

### Acceptance Criteria

- The matrix explicitly calls out `/business/top-candidates` as demo fixture only.
- The matrix explicitly calls out Business Profile API wrappers as existing but not wired.
- The matrix explicitly calls out Admin Business Profile review APIs as existing but not wired.
- The matrix explicitly calls out `useBooking` as not wired to a detail UI.

---

## PR 2 - Business Profile API Wiring

### Scope

Upgrade:

```txt
src/pages/business/BusinessProfile.tsx
```

from local state/mock save to real API-backed profile management.

### APIs/Hooks To Use

- `useBusinessCompanyQuery`
- `useUpdateBusinessCompanyMutation`
- `useUploadCompanyMediaMutation`
- `useSubmitBusinessProfileMutation`
- `useSendWorkEmailVerificationMutation`
- `useVerifyWorkEmailMutation`

### Required UI

- Load existing company profile into form.
- Save company fields through API.
- Upload logo/cover if backend supports it through existing hook.
- Submit profile for review.
- Work email verification CTA/state if data exists.
- Clear states:
  - no company profile yet
  - loading
  - save pending
  - save failed
  - review pending
  - rejected with reason if DTO exposes it
  - approved/verified

### Demo Rule

If a backend field is missing in DTO, do not fake-save it. Render a preview-only field or omit it.

---

## PR 3 - Admin Business Profile Review UI

### Scope

Add an admin route/page for reviewing business profiles.

Recommended route:

```txt
/admin/business-profiles
```

### Files To Inspect

- `src/hooks/use-admin-jobs.ts`
- `src/api/admin-jobs.ts`
- `src/types/jobs.ts`
- `src/components/admin/AdminSidebar.tsx`
- `src/App.tsx`
- `src/routes/lazy-pages.ts`

### APIs/Hooks To Use

- `useAdminBusinessProfilesQuery`
- `useAdminBusinessProfileDetailQuery`
- `useReviewBusinessProfileMutation`

### Required UI

- Table/list of business profiles by status.
- Filter by review status if supported.
- Detail drawer/dialog with:
  - company name
  - contact email/phone
  - website
  - business metadata
  - submittedAt/status
  - rejection reason if present
- Approve/reject actions.
- Reject requires reason.
- Confirmation dialog before approving/rejecting.
- Empty/loading/error states.

### Acceptance Criteria

- Admin can understand and act on business profile submissions.
- No action button works without required note/reason.
- Query invalidates list and detail after mutation.

---

## PR 4 - Business Top Candidates Demo Preview

### Important Reality Check

There is currently **no real Top Candidates API** in FE or visible backend code.

Do not pretend this page is live.

### Scope

Keep `/business/top-candidates`, but make it an honest, polished product preview for demo.

### Required UI

- Add a clear banner:

```txt
Demo preview - this candidate marketplace is using sample data until the candidate discovery API is available.
```

- Keep curated sample candidates, but improve product framing:
  - candidate score
  - role fit
  - skill chips
  - open-to-work status
  - profile modal
  - "Invite" button disabled or opens a preview confirmation saying API coming soon
  - "View CV" disabled or preview-only if no real CV exists
- Add filters/search that work on fixture data.
- Add empty state.
- Do not show fake email/phone unless they are obviously sample data.

### Better Demo Alternative

If time allows, add a tab switch:

1. **Applicants** - points user to real `/business/applicants`.
2. **Candidate Discovery Preview** - sample data only.

This helps demo both live product and future vision.

### Acceptance Criteria

- Reviewer can see the product vision.
- No one can mistake sample candidates for live user data.
- No dead buttons.

---

## PR 5 - Mentor Booking Detail + Action Polish

### Scope

Make mentor booking workflows feel complete enough for demo.

### APIs/Hooks To Inspect

- `useBooking`
- `useMyBookings`
- `useMentorOwnedBookings`
- `useSetMeetingLink`
- `useCompleteBooking`
- `useMentorCancelBooking`
- `useAdminMentorBookings`
- `useAdminMentorBookingRefund`

### Required UI

- Booking detail dialog or route using `useBooking`.
- Show:
  - booking status
  - mentor / mentee info
  - schedule time
  - meeting link
  - price/payment state
  - notes/reason fields
  - event/action history if DTO exposes it
- Actions:
  - set meeting link
  - complete session
  - cancel with reason
  - admin refund update where applicable
- Every destructive action needs confirmation.
- Every note/reason action validates minimum useful text.

### Acceptance Criteria

- A mentor can open a booking and know what to do next.
- Admin can inspect booking/payment/refund state without guessing.
- No action silently succeeds or fails without toast/inline error.

---

## PR 6 - Demo Readiness Pass

### Scope

Final polish pass for Admin, Business, Mentor.

### Checklist

- Every page has:
  - loading state
  - empty state
  - error state
  - permission/auth fallback if relevant
  - no dead buttons
  - no raw JSON unless clearly labeled as technical detail
- Every demo fixture page has a visible demo/preview label.
- Every real API page has no mock data mixed into live tables.
- Every mutation has pending/disabled state.
- Every destructive mutation has confirmation.
- Search/filter controls are either wired or clearly marked as local/demo/read-only.
- No new large dependency.
- No new color system.
- No purple AI-gradient theme.
- No full-page redesign unless required by broken UX.

## Verification

Run after each PR:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Demo Script Output

At the end, update this task file or add a short comment in the PR body with:

1. Which flows are live API-backed.
2. Which flows are demo-preview.
3. Which accounts/data are needed for the demo.
4. Which buttons are intentionally disabled because backend is missing.

## Suggested Demo Story

1. Business signs in.
2. Business completes company profile and submits it.
3. Admin reviews/approves business profile.
4. Business creates job, extracts and confirms skills, publishes job.
5. Candidate applies to job.
6. Business reviews applicant, downloads CV, changes status.
7. Business opens Top Candidates preview to show future candidate discovery.
8. Mentor flow shows availability and booking management.
9. Admin reviews mentor/business/job-report operations.

