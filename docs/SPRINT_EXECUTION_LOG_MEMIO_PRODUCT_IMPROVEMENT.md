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

## Sprint 4 — Trust & Source-Grounded AI

**Status:** Completed for pilot increment.

**Goal:** Make Coach answers easier to trust by showing where supporting information came from and collecting lightweight quality signals.

**Implemented:**

- Classified Coach citations as:
  - source context,
  - internal card,
  - external web.
- Added citation source labels and trust priority metadata to Coach responses.
- Kept internal/source-context citations ahead of web citations when citations are selected or recovered by fallback.
- Strengthened Coach system instructions so internal Memio material takes priority over web context.
- Redesigned Coach citation rendering with visible source labels, external-link affordance, and click handling.
- Added helpful / not helpful feedback controls to assistant answers.
- Added `POST /api/coach/trust-event` for pilot measurement of citation clicks and answer feedback.

**Verification:**

- `./.venv/bin/python -m compileall src/app/api/endpoints/coach.py src/app/schemas/coach.py src/app/services/coach_service.py` passed.
- `npm run lint` passed.
- `npm run build` passed after rerunning with required permission because Turbopack needs an internal port bind in this environment.

**Remaining gaps:**

- Trust events are logged server-side for pilot measurement, not yet stored in a durable analytics table.
- Question-level citations inside inline quiz questions are still not rendered.
- Broader product analytics remains intentionally deferred from Sprint 0.

## Sprint 5 — Learning Intelligence

**Status:** Completed for MVP increment.

**Goal:** Move from individual weak cards to concept-level learning diagnosis.

**Implemented:**

- Added `GET /api/coach/learning-intelligence` to compute weak concept clusters from existing `flashcards + progress`.
- Added rule-based weakness scoring using:
  - low `last_quality`,
  - low `ease_factor`,
  - no/low repetition,
  - hard card difficulty.
- Added stable token-based grouping and readable cluster labels without introducing vector DB or a new table.
- Added cluster metadata:
  - mastery score,
  - total weak cards,
  - sample cards,
  - card ids for scoped practice.
- Added weak concept cluster UI in Workspace under the Daily Mission area.
- Added actions from each cluster:
  - explain the weak concept with Memio Coach,
  - start an inline Coach quiz scoped to the cluster's card ids.
- Extended Coach inline quiz start payload to accept `card_ids`.
- Extended `/coach` route params so Workspace can open Coach with a prompt or start a scoped quiz directly.
- Updated `PROJECT_CONTEXT.md` with the new endpoint and behavior.

**Verification:**

- `./.venv/bin/python -m compileall src/app/api/endpoints/coach.py src/app/schemas/coach.py src/app/services/coach_service.py` passed.
- `npm run lint` passed.
- `npm run build` passed after rerunning with required permission because Turbopack needs an internal port bind in this environment.

**Remaining gaps:**

- Clustering is rule-based and lexical, not semantic vector search yet.
- Cluster persistence is computed on demand; no `concept_clusters` table yet.
- Review log data design for future FSRS remains to be specified.
- Analytics events remain intentionally deferred from Sprint 0.

## Sprint 6 — Exam Goals & Habit Retention

**Status:** Completed for MVP increment.

**Goal:** Help users study toward deadlines and make daily recommendations deadline-aware.

**Implemented:**

- Added `learning_goals` model and Alembic migration `0014_learning_goals`.
- Added `GET/POST/DELETE /api/goals` for one active exam goal per deck.
- Added goal estimates:
  - days remaining,
  - due cards,
  - new cards,
  - weak cards,
  - workload cards,
  - recommended daily cards,
  - readiness score,
  - urgency level.
- Added `GET /api/goals/notification-strategy` as a spec-only notification strategy endpoint.
- Added frontend API client support for learning goals.
- Added inline goal creation in Workspace deck cards:
  - exam date,
  - desired mastery,
  - daily workload.
- Made Workspace deck prioritization deadline-aware using goal urgency.
- Added Daily Mission goal context when the priority deck has an exam goal.
- Added Coach planning context by including active learning goals in `build_context`.
- Updated `PROJECT_CONTEXT.md` with the new data model, endpoints, and behavior.

**Verification:**

- `./.venv/bin/python -m compileall src/app/api/endpoints/goals.py src/app/api/api.py src/app/models/domain.py src/app/schemas/goal.py src/app/services/goal_service.py src/app/services/coach_service.py` passed.
- `npm run lint` passed.
- `./.venv/bin/alembic upgrade head` applied migration `0014_learning_goals`.
- `npm run build` passed after rerunning with required permission because Turbopack needs an internal port bind in this environment.

**Remaining gaps:**

- Notifications are specified, not delivered through push/email yet.
- Goal editing is currently handled by re-saving inline fields after creation is not fully exposed as a polished edit state.
- Goal deletion UI is not yet exposed in Workspace.
- Workload estimates are rule-based and should improve after review logs/FSRS planning.
- Analytics events remain intentionally deferred from Sprint 0.
