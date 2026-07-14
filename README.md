# Gulf Evaluation Dashboard Demo

Front-end-only Next.js demonstration dashboard for managing the evaluation committees and judging workflow of the Gulf Investment Awareness Program - Fourth Season.

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Useful checks:

```bash
npm run test
npm run lint
npm run build
```

## What Is Included

- Arabic-first RTL dashboard with English LTR switcher.
- Demo role switcher with action permissions.
- Four PDF tracks: Video, Drawing, Photography, Writing.
- Evaluator and committee management with role weights of 60%, 20%, 10%, 10%.
- Committee validation for total weight, missing roles, duplicate members, inactive evaluators, and track assignment.
- Three PDF criteria: Work Quality, Idea and Creativity, Financial and Investment Awareness Impact.
- 64 deterministic Gulf-region mock submissions.
- Initial filtering, initial evaluation, final weighted committee scoring, finalist preview, tie-breaking, approvals, winners, timeline, reports, settings, notifications, and activity log.
- Zustand store persisted to localStorage, plus reset/export/import JSON backup.
- Calculation tests for scoring, qualification, weights, ranking, top finalist selection, and tie-breaking.

## Folder Structure

```text
src/app/          Next.js App Router routes
src/components/   Reusable layout, UI, tables, badges, cards, score controls
src/data/         Deterministic seed data and PDF defaults
src/features/     Page-level dashboard views
src/i18n/         Arabic and English labels
src/store/        Zustand demo store and localStorage actions
src/types/        Shared TypeScript domain types
src/utils/        Permissions, class helpers, calculation utilities and tests
```

## PDF Assumptions

The local PDF uses embedded font encoding that was not text-extractable in this environment, so the implementation follows the attached brief’s PDF-derived requirements:

- Timeline dates: March 1, 7, 8, 14, and 29, 2026.
- Criteria: 10 points each, 30 points maximum per evaluator.
- Initial qualification threshold: 18/30.
- Finalist count: 44 by default.
- Tie-break rule: final score, then awareness-impact score, then committee vote.

## Replacing Mock Data Later

Keep the calculation utilities and UI components. Replace `src/data/seed.ts` and the Zustand actions in `src/store/demo-store.ts` with API calls. The browser-only workflows currently update local arrays; those update points are the natural integration boundaries for a backend service.
