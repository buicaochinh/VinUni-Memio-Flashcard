# Sprint Plan — Memio Product Improvement Roadmap

> Source PRD: `docs/PRD_MEMIO_PRODUCT_IMPROVEMENT.md`  
> Role: Product Owner  
> Stage: Pilot → Growth-ready  
> Date: 2026-05-07

## 1. Planning Principles

This sprint plan breaks the PRD into value-oriented delivery slices. Each sprint should produce a visible product improvement, not only backend or frontend plumbing.

Priority order:

1. Make the daily learning path obvious.
2. Make Memio Coach the coordinator of the learning experience.
3. Keep learning in flow, especially inside chat.
4. Improve trust through source-grounded answers.
5. Add personalization and exam-oriented planning.

Recommended sprint length: **1-2 weeks per sprint**.

## 2. Release Strategy

### Release 1 — Sticky Workspace

Includes:

- Sprint 0: Product Foundation & Measurement
- Sprint 1: Daily Learning Loop

Goal: users immediately understand what to do when they open Memio.

### Release 2 — Coach-Led Learning

Includes:

- Sprint 2: Coach As Coordinator
- Sprint 3: Inline Learning In Chat
- Sprint 4: Trust & Source-Grounded AI

Goal: Memio Coach becomes the core UX layer for asking, practicing, and taking action.

### Release 3 — Personalized Growth

Includes:

- Sprint 5: Learning Intelligence
- Sprint 6: Exam Goals & Habit Retention

Goal: Memio becomes more personalized, goal-aware, and habit-forming.

## 3. Sprint 0 — Product Foundation & Measurement

### Goal

Standardize measurement so every improvement can be evaluated with real product signals.

### Scope

- Define product analytics events for key user actions:
  - create deck,
  - generate cards,
  - start study,
  - complete study session,
  - open Coach,
  - send Coach message,
  - click Coach action,
  - start inline quiz,
  - complete inline quiz,
  - click citation,
  - rate Coach answer.
- Define baseline metrics:
  - activation rate,
  - D1/D7 retention,
  - study sessions per user per week,
  - Coach action conversion,
  - inline quiz completion rate,
  - citation coverage,
  - answer helpfulness.
- Review current user journey and identify friction points.
- Define event naming convention.

### Deliverables

- Product analytics event spec.
- Baseline metrics definition.
- Current journey friction notes.

### Acceptance Criteria

- Team can clearly answer which metric each future sprint is expected to move.
- Event names and required properties are documented.
- Sprint 1 can be implemented with measurable success criteria.

## 4. Sprint 1 — Daily Learning Loop

### Goal

When users enter Workspace, they understand today's best learning action within 5 seconds.

### Scope

- Add Daily Learning Dashboard to Workspace.
- Implement primary next-action logic:
  - if due cards exist, prioritize review,
  - if user has no cards, prioritize card generation,
  - if user has studied today, suggest Coach quiz or challenge,
  - if a deck has many weak/due cards, prioritize that deck.
- Show learning state:
  - due cards today,
  - most urgent deck,
  - current streak,
  - estimated study time,
  - weak area or fallback weak cards.
- Add one primary CTA: `Bắt đầu phiên học hôm nay`.
- Add secondary actions:
  - `Quiz nhanh với Coach`,
  - `Tạo thêm thẻ`,
  - `Thử thách AI`.
- Improve empty states for users with no deck or no cards.

### Deliverables

- Daily Learning Dashboard module.
- Primary CTA logic.
- Updated Workspace information hierarchy.
- Empty states for 0 deck / 0 card / no due cards.

### Acceptance Criteria

- Dashboard works with 0, 1, and many decks.
- Primary CTA always leads to a useful next step.
- User can identify what to do next within 5 seconds.
- Existing deck actions remain accessible but are visually secondary.

## 5. Sprint 2 — Coach As Coordinator

### Goal

Memio Coach becomes a proactive learning coordinator, not only a reactive chatbot.

### Scope

- Add proactive suggestion to floating Coach panel.
- Generate suggestion from actual user data:
  - due cards,
  - weak cards,
  - recent inactivity,
  - recently completed session,
  - urgent deck.
- Improve Coach action UX:
  - `Ôn ngay`,
  - `Quiz trong chat`,
  - `Giải thích điểm yếu`,
  - `Tạo thử thách`,
  - `Tạo thêm thẻ`.
- Add action confirmation pattern:
  - no confirmation required for navigation, study, challenge, inline quiz, explanation,
  - confirmation required for creating, editing, deleting flashcards, changing deck settings, changing learning goals.
- Ensure Coach actions are sanitized against user-owned data.

### Deliverables

- Proactive suggestion card in Coach launcher.
- Coach action UI update.
- Confirmation UI for content-changing actions.
- Backend/frontend action safety rules documented in code comments or API docs.

### Acceptance Criteria

- Coach can show a useful suggestion before user asks a question.
- Suggestion never blocks navigation or core interactions.
- Content-changing actions cannot execute without confirmation.
- Suggested actions are valid for the current user.

## 6. Sprint 3 — Inline Learning In Chat

### Goal

Users can complete a meaningful learning session inside Coach without being redirected.

### Scope

- Complete inline quiz experience inside Coach.
- Support quiz start from:
  - quick action,
  - proactive suggestion,
  - Coach response action.
- Show one question at a time.
- Show immediate feedback:
  - correct/incorrect,
  - explanation,
  - citation if available.
- Update SM-2 progress after each answer.
- Calculate and display final result:
  - score,
  - XP,
  - correct count,
  - weak cards,
  - recommended next action.
- Save final summary into Coach thread.

### Deliverables

- Full inline quiz session UI.
- Progress persistence from chat quiz.
- Final quiz summary message.
- Follow-up actions after quiz.

### Acceptance Criteria

- User can complete quiz without leaving Coach.
- Every answer updates progress in the database.
- Final summary is visible and stored in the conversation.
- User receives a useful next action after quiz completion.

## 7. Sprint 4 — Trust & Source-Grounded AI

### Goal

Increase trust in Coach answers by making source grounding and web fallback transparent.

### Scope

- Improve citation rendering in Coach.
- Classify citation source types:
  - internal card,
  - source context,
  - web.
- Label web citations clearly as external.
- Ensure internal/source context takes priority over web.
- Improve fallback citation behavior when the model omits citations.
- Add answer feedback:
  - helpful,
  - not helpful.
- Track citation clicks and answer feedback.

### Deliverables

- Citation UI redesign.
- Source type labels.
- Helpful/not helpful feedback control.
- Citation and feedback analytics events.

### Acceptance Criteria

- Relevant answers based on user material include citations when context exists.
- User can distinguish internal material from web information.
- Web search does not override conflicting internal knowledge.
- Product can measure citation coverage and answer helpfulness.

## 8. Sprint 5 — Learning Intelligence

### Goal

Move from card-level weakness to concept-level learning diagnosis.

### Scope

- Create concept weakness clustering MVP.
- Identify weak cards from progress data.
- Group weak cards by topic or semantic similarity.
- Generate short concept labels.
- Show concept-level mastery status.
- Allow Coach to explain a weak concept cluster.
- Allow Coach to start a quiz from a weak concept cluster.
- Define `review_logs` data design to support future FSRS and deeper analytics.

### Deliverables

- Weak concept summary.
- Cluster-level mastery display.
- Coach support for weak concept explanation and quiz.
- Review log data design.

### Acceptance Criteria

- User sees weaknesses at concept level, not only individual card level.
- Coach can reference weak clusters in recommendations.
- Cluster labels are understandable and stable enough for repeated visits.
- The system is prepared for future scheduler improvements.

## 9. Sprint 6 — Exam Goals & Habit Retention

### Goal

Help users study toward deadlines and build a repeatable learning habit.

### Scope

- Add exam goal MVP per deck.
- User can set:
  - exam date,
  - desired mastery,
  - daily workload preference.
- Estimate workload:
  - due cards,
  - weak cards,
  - new cards,
  - days remaining.
- Make Dashboard deadline-aware.
- Let Coach answer planning questions:
  - "Tôi có kịp ôn trước ngày X không?"
  - "Hôm nay cần học bao nhiêu?"
- Define notification strategy:
  - due card reminder,
  - streak risk,
  - exam urgency,
  - Coach recommendation.
- Define notification preferences:
  - opt-in,
  - quiet hours,
  - reminder channels.

### Deliverables

- Exam goal MVP.
- Deadline-aware daily recommendations.
- Coach exam planning support.
- Notification strategy specification.

### Acceptance Criteria

- User can create an exam goal in under 1 minute.
- Dashboard prioritizes decks with urgent deadlines.
- Coach can generate a realistic daily study plan.
- Notification plan is ready for implementation in a later sprint.

## 10. Recommended Priority

The highest-impact order is:

1. Sprint 1 — Daily Learning Loop
2. Sprint 2 — Coach As Coordinator
3. Sprint 3 — Inline Learning In Chat
4. Sprint 4 — Trust & Source-Grounded AI
5. Sprint 5 — Learning Intelligence
6. Sprint 6 — Exam Goals & Habit Retention

Sprint 0 should run before or alongside Sprint 1 because measurement must be in place early.

## 11. Product Risks

### Risk: Daily Dashboard becomes another complex dashboard

Mitigation: keep one primary CTA and make all other actions secondary.

### Risk: Coach suggestions feel generic

Mitigation: generate suggestions from real learning state such as due cards, weak cards, and recent sessions.

### Risk: Inline quiz distractors are low quality

Mitigation: prioritize same-deck distractors and later upgrade to AI-generated distractors with validation.

### Risk: Citation UX becomes too noisy

Mitigation: show compact citation cards and expand details only when needed.

### Risk: Learning intelligence is unreliable with limited data

Mitigation: start with simple clustering rules and improve with more review history.

## 12. Definition of Done

Each sprint is considered done when:

- User-facing flow is implemented.
- Backend persistence is complete if required.
- Empty, loading, and error states are handled.
- Core flow is manually tested with 0, 1, and multiple decks when relevant.
- Analytics events are emitted for critical actions.
- Documentation is updated if behavior, data model, or API changes.

