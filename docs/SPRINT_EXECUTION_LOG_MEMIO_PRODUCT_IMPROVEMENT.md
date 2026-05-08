# Sprint Execution Log — Memio Product Improvement

> Source plan: `docs/SPRINT_PLAN_MEMIO_PRODUCT_IMPROVEMENT.md`  
> Product stage: Pilot → Growth-ready  
> Log owner: AI Software Engineer / Product Owner  
> Started: 2026-05-07

## Sprint 0 — Product Foundation & Measurement

**Status:** Skipped for now.

**Reason:** Product owner explicitly requested to postpone analytics/event tracking and focus on releasing a better product experience first.

**Follow-up:** Return to this sprint before broader pilot rollout, especially before measuring activation, Coach conversion, inline quiz completion, and citation helpfulness.

## Sprint 1 — Daily Learning Loop

**Status:** Completed.

**Goal:** Make the Workspace answer "What should I do today?" within 5 seconds.

**Implemented:**

- Replaced passive Workspace summary with a Daily Mission / best-next-action module.
- Added state-aware mission logic:
  - no deck → focus create deck,
  - deck exists but no cards → route to card generation,
  - due/new cards exist → prioritize study,
  - no due cards → suggest challenge or adding more cards.
- Added priority deck selection based on due/new card pressure.
- Added due cards, new cards, and estimated study time to the mission module.
- Changed deck card progress to represent today's completion rhythm instead of relative deck size.
- Made deck actions clearer by promoting the recommended action per deck.
- Moved floating Coach button above the mobile bottom navigation.
- Updated `PROJECT_CONTEXT.md` with the current Daily Mission behavior.

**Verification:**

- `npm run lint` passed.
- `npm run build` passed after rerunning with required permission because Turbopack attempted an internal port bind blocked by sandbox.

**Remaining gaps:**

- Streak and weak area are not yet shown in the Daily Mission module.
- Analytics events are intentionally deferred.

## Sprint 2 — Coach As Coordinator

**Status:** Completed.

**Goal:** Make Memio Coach proactive and action-oriented, not only reactive chat.

**Implemented:**

- Add proactive suggestion to the floating Coach launcher.
- Generate suggestion from actual user data:
  - due cards,
  - new cards,
  - no deck / no card state,
  - priority deck.
- Added action buttons for:
  - start study,
  - quiz in chat,
  - create cards,
  - start challenge.
- Keep content-changing action confirmation behavior intact.
- Avoid analytics/event work for now.

**UX decisions:**

- Suggestion card is compact and non-blocking. It appears above the floating Coach button on desktop/tablet widths and does not appear on narrow mobile screens to avoid crowding the bottom nav.
- The floating Coach button remains accessible on all authenticated pages.
- "Quiz trong chat" opens the Coach panel and starts an inline quiz without redirecting.

**Verification:**

- `npm run lint` passed.
- `npm run build` passed with required permission because Turbopack needs an internal port bind in this environment.

**Remaining gaps:**

- Suggestions do not yet use weak-card clusters or recent session inactivity.
- No notification/reminder system yet.
- Analytics events remain intentionally deferred.

## Sprint 3 — Inline Learning In Chat

**Status:** Completed.

**Goal:** Let users complete a meaningful quiz session inside Memio Coach without leaving the chat flow.

**Implemented:**

- Extended inline quiz state to track answered questions, correctness, and wrong questions.
- Added final quiz summary with:
  - correct count,
  - accuracy,
  - XP estimate,
  - weak questions to review,
  - next actions.
- Added `POST /api/coach/quiz/summary` to persist the final quiz result as a Coach assistant message.
- Added frontend API client support for saving quiz summaries.
- Kept SM-2 progress updates after every answer.
- Improved quiz UI feedback with running score, projected accuracy, and XP.

**Verification:**

- `./.venv/bin/python -m compileall src/app/api/endpoints/coach.py src/app/schemas/coach.py src/app/services/coach_service.py` passed.
- `npm run lint` passed.
- `npm run build` passed with required permission because Turbopack needs an internal port bind in this environment.

**Remaining gaps:**

- XP is currently a frontend estimate, not a durable user-level XP ledger.
- Question-level citations are not yet rendered inside each quiz question.
- Analytics events remain intentionally deferred.
