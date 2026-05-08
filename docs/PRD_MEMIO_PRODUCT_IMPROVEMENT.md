# PRD — Memio Product Improvement Roadmap

> Version: 1.0  
> Owner: Product  
> Stage: Pilot → Growth-ready  
> Date: 2026-05-07

## 1. Executive Summary

Memio has reached a strong pilot state: AI-generated flashcards, SM-2 review, analytics, Adventure Campaign, and Memio Coach are already present. The next product challenge is no longer "add more features", but to turn these capabilities into a cohesive learning experience that users understand, trust, and return to daily.

This PRD defines the improvement roadmap to move Memio toward a market-leading AI learning product. The core strategic direction is:

**Memio Coach becomes the AI learning coordinator for the entire product.**

Instead of requiring users to decide which deck to open, which card to review, whether to play a challenge, or how to interpret weak areas, Memio should guide them through the best next action every day.

## 2. Product Vision

Memio should become an AI learning operating system that helps users:

- turn personal learning materials into structured knowledge,
- study with an adaptive memory system,
- understand weaknesses through AI explanations,
- practice through chat, quizzes, and game-like challenges,
- build a daily learning habit,
- trust answers because they are grounded in their own source materials.

The product should feel like a personalized study companion, not a passive flashcard manager.

## 3. Problem Statement

Current Memio functionality is broad but still fragmented:

- Users may not immediately know what to do after entering the Workspace.
- Study, game, analytics, card generation, and Coach exist as separate surfaces.
- The Coach is promising but not yet the central coordinator of the learning journey.
- Gamification exists but needs stronger connection to daily study habits.
- Source-grounded AI needs clearer trust and citation UX.
- The product lacks a clear "today's learning mission" loop.

To achieve broad adoption, Memio must reduce cognitive load and make the best next action obvious.

## 4. Target Users

### Primary Users

**University students**

- Need to learn from PDFs, lecture notes, slides, and textbook excerpts.
- Want fast generation of study material.
- Need exam preparation and spaced repetition.
- Value explanations and source citations.

**Self-learners**

- Learn technical, language, certification, or professional topics.
- Need structure and consistency.
- Benefit from an AI coach that keeps them moving.

### Secondary Users

**Teachers / tutors**

- May want to create decks for students.
- Need visibility into weak topics and progress.

**Study groups**

- May share decks, compare progress, and practice together in later phases.

## 5. Product Goals

### Goal 1: Make the daily learning path obvious

When users open Memio, they should instantly know what to do today.

### Goal 2: Make Memio Coach the core UX layer

Coach should answer, explain, quiz, recommend, and trigger product actions.

### Goal 3: Improve real learning outcomes

Memio should help users retain knowledge, diagnose weaknesses, and prepare for exams.

### Goal 4: Build habit and retention

The product should encourage short, consistent study sessions through streaks, quests, reminders, and lightweight gamification.

### Goal 5: Build trust in AI answers

AI responses should be grounded in internal data and source context, with clear citations and safe use of web search.

## 6. Non-Goals

The following are intentionally out of scope for the next roadmap cycle:

- Full social network or public feed.
- Multiplayer games.
- Marketplace for paid decks.
- Native mobile app.
- Replacing all SM-2 logic with FSRS immediately.
- Fully autonomous data-changing AI actions without user confirmation.

## 7. Success Metrics

### Activation

- Percentage of new users who create or import their first deck.
- Percentage of new users who complete their first study session.
- Time from signup to first meaningful learning action.

### Retention

- D1, D7, and D30 retention.
- Weekly active learners.
- Average study days per user per week.
- Streak continuation rate.

### Learning Effectiveness

- Cards reviewed per active user.
- Due cards completed per day.
- Weak cards improved after Coach/quiz intervention.
- Mastery score improvement over time.

### Coach Engagement

- Coach messages per active user.
- Percentage of Coach conversations that lead to an action.
- Inline quiz completion rate inside Coach.
- Citation click-through rate.

### Trust and Quality

- AI answer helpfulness rating.
- Citation coverage rate.
- Web fallback usage rate.
- User-reported incorrect answer rate.

## 8. Core Product Principles

### 8.1. Best next action over feature menu

Every main surface should answer: "What should I do next?"

### 8.2. Internal knowledge first

AI should prioritize the user's decks, flashcards, progress, analytics, and source context before using web search.

### 8.3. Learning happens in flow

Users should be able to quiz, ask, review, and get explanations without unnecessary redirects.

### 8.4. AI can act, but safely

Coach may navigate, start review, start challenge, and create quizzes directly. Content-changing actions such as creating, editing, or deleting flashcards require confirmation.

### 8.5. Habit loops must feel lightweight

Gamification should encourage daily learning without making the product feel childish.

## 9. Proposed Roadmap

## Phase 1 — Make Memio Sticky

Goal: make the daily learning loop clear and increase repeat usage.

### 9.1. Daily Learning Dashboard

#### User Problem

Users enter the Workspace but may not know whether to review, create cards, play a challenge, or ask Coach.

#### Product Requirement

Create a daily dashboard module that summarizes today's learning state and recommends one primary action.

#### Functional Requirements

- Show total due cards today.
- Show most urgent deck.
- Show weakest topic or weak card cluster.
- Show current streak.
- Show estimated study time.
- Show one primary CTA: `Bắt đầu phiên học hôm nay`.
- Show secondary actions:
  - `Quiz nhanh với Coach`
  - `Tạo thêm thẻ`
  - `Thử thách AI`

#### Acceptance Criteria

- User can understand the recommended action within 5 seconds.
- Primary CTA starts a study flow for due cards or the most urgent deck.
- Empty state gives a clear next step when no cards exist.
- Dashboard works with 0, 1, and many decks.

### 9.2. Coach Proactive Suggestions

#### User Problem

Coach is accessible but mostly reactive.

#### Product Requirement

Coach should proactively surface contextual suggestions based on user learning state.

#### Functional Requirements

- Floating Coach panel can show one proactive suggestion.
- Suggestions may include:
  - "Bạn có 10 thẻ cần ôn."
  - "Deck Tim mạch đang có nhiều thẻ yếu."
  - "Muốn mình quiz nhanh không?"
- Suggestions should link to actions:
  - inline quiz,
  - start study,
  - explain weak cards,
  - open challenge.

#### Acceptance Criteria

- Suggestion appears without opening full Coach page.
- Suggestion never blocks core navigation.
- Suggestion is generated from actual user data, not static copy only.

### 9.3. Inline Quiz Completion in Coach

#### User Problem

Users want to practice while chatting without jumping to another route.

#### Product Requirement

Coach should support complete quiz sessions inside the chat UI.

#### Functional Requirements

- Start quiz from quick action or Coach suggested action.
- Show one question at a time.
- Show answer feedback immediately.
- Show source citation when available.
- Update SM-2 progress immediately after each answer.
- Show final summary:
  - score,
  - XP,
  - weak cards,
  - recommended next action.

#### Acceptance Criteria

- User can complete a quiz without leaving Coach.
- Progress is persisted to the database.
- Final summary is saved in the Coach thread.

## Phase 2 — Make Memio Smarter

Goal: improve learning quality, personalization, and trust.

### 9.4. Source-Grounded Coach Citations

#### User Problem

Users need to trust AI answers, especially for academic subjects.

#### Product Requirement

Coach responses should clearly show whether an answer is based on internal cards, source context, or web search.

#### Functional Requirements

- Every grounded Coach answer should include citations when source context is available.
- Citation cards should include:
  - deck name,
  - card title/front,
  - source snippet,
  - source type: `internal`, `source_context`, or `web`.
- Web search results must be visually labeled as external.
- Internal/source context must take priority over web results.

#### Acceptance Criteria

- Answers based on user data include at least one citation when relevant context exists.
- Web citations do not override conflicting internal material.
- User can distinguish "from my material" and "from web".

### 9.5. Concept Weakness Clustering

#### User Problem

Listing weak cards is useful but does not explain the underlying concept gap.

#### Product Requirement

Group weak cards into concept clusters and summarize what the user is struggling with.

#### Functional Requirements

- Identify weak cards from progress data.
- Cluster weak cards by semantic/topic similarity.
- Generate short cluster labels.
- Show cluster-level mastery status.
- Coach can explain a cluster and quiz from it.

#### Acceptance Criteria

- User sees concept-level weaknesses, not only individual cards.
- Cluster output is stable enough for repeated visits.
- Coach can reference clusters in recommendations.

### 9.6. Exam Preparation Mode

#### User Problem

Students often study toward a deadline, not just open-ended mastery.

#### Product Requirement

Allow users to set an exam date or goal and let Memio build a study plan.

#### Functional Requirements

- User can set target date per deck or subject.
- System estimates workload:
  - due cards,
  - new cards,
  - weak cards,
  - days remaining.
- Coach recommends daily study targets.
- Dashboard reflects exam urgency.

#### Acceptance Criteria

- User can create an exam goal in under 1 minute.
- Dashboard changes recommendations based on deadline.
- Coach can answer: "Tôi có kịp ôn trước ngày X không?"

## Phase 3 — Make Memio Defensible

Goal: create long-term personalization and stronger retention moat.

### 9.7. Long-Term Learning Memory

#### User Problem

Most AI assistants forget user learning behavior over time or only remember chat history.

#### Product Requirement

Memio should build a durable learning profile for each user.

#### Functional Requirements

- Track preferred explanation style.
- Track recurring mistake patterns.
- Track strongest and weakest subjects.
- Track study time behavior.
- Track confidence and mastery trends.
- Use memory to personalize Coach responses and daily recommendations.

#### Acceptance Criteria

- Coach can reference meaningful historical patterns.
- Memory can be viewed and deleted by the user.
- Memory is not used for destructive or sensitive assumptions without user confirmation.

### 9.8. PWA and Notification Strategy

#### User Problem

Learning products depend on habit, and web-only usage may not be enough.

#### Product Requirement

Improve mobile/PWA behavior and introduce smart reminders.

#### Functional Requirements

- PWA installability.
- Mobile-optimized review and Coach surfaces.
- Push notifications for:
  - due cards,
  - streak risk,
  - exam urgency,
  - Coach recommendation.
- Notification preferences and quiet hours.

#### Acceptance Criteria

- User can install Memio as a PWA.
- Notifications are opt-in.
- Reminder content is based on real learning state.

## 10. Key User Flows

### 10.1. New User Activation Flow

1. User signs up.
2. User creates a deck or imports material.
3. Memio generates flashcards.
4. User completes a short first study session.
5. Coach summarizes what Memio learned about the user.
6. Dashboard shows tomorrow's next action.

### 10.2. Returning Daily Learner Flow

1. User opens Workspace.
2. Dashboard shows due cards, weak area, and primary CTA.
3. User starts daily session.
4. User answers cards or inline quiz questions.
5. Progress updates immediately.
6. Coach gives a short summary and next recommendation.

### 10.3. Coach-Led Learning Flow

1. User opens floating Coach panel.
2. Coach shows proactive suggestion.
3. User asks a question or selects quick action.
4. Coach answers with citations.
5. Coach suggests an action.
6. User practices inside chat or starts a study session.

### 10.4. Exam Prep Flow

1. User sets exam date for a deck.
2. Memio estimates daily workload.
3. Dashboard prioritizes urgent decks.
4. Coach quizzes weak concepts.
5. User tracks mastery score toward exam readiness.

## 11. UX Requirements

### Workspace

- Must emphasize one primary next action.
- Must avoid overwhelming users with too many equal-weight buttons.
- Deck cards should show:
  - status,
  - due count,
  - mastery/progress,
  - recommended action,
  - compact secondary actions.

### Coach

- Floating panel must be accessible across the app.
- Full page route remains `/coach`.
- Panel should support lightweight actions.
- Full page should support deeper conversations and longer quiz sessions.
- UI tone: friendly, focused, not childish.

### Gamification

- Game names should feel learning-oriented and premium.
- Avoid excessive playful language for serious academic users.
- XP and streaks should reinforce useful learning behavior.

### Citations

- Citations should be visible but not noisy.
- Source snippets should be short.
- External web sources must be labeled.

## 12. Data and Backend Requirements

### Existing Data to Use

- `decks`
- `flashcards`
- `progress`
- `study_sessions`
- `game_sessions`
- `coach_threads`
- `coach_messages`
- `user_settings`

### New Data Likely Needed

Potential future tables:

- `learning_goals`
  - user_id
  - deck_id
  - goal_type
  - target_date
  - desired_mastery

- `learning_memory`
  - user_id
  - key
  - value_json
  - updated_at

- `concept_clusters`
  - user_id
  - deck_id
  - label
  - card_ids_json
  - mastery_score
  - updated_at

- `notification_preferences`
  - user_id
  - enabled
  - quiet_hours
  - channels

- `review_logs`
  - user_id
  - card_id
  - quality
  - response_time_ms
  - reviewed_at
  - source_surface

`review_logs` should be considered before any future FSRS migration.

## 13. AI Requirements

### Coach Context Priority

1. User decks, flashcards, progress, analytics.
2. Source context from original material.
3. Web search as fallback or supplement.

### Coach Response Requirements

- Answer in the user's language.
- Cite internal/source context when available.
- Label web information clearly.
- Suggest useful next actions.
- Avoid overconfident answers when evidence is weak.

### AI Action Safety

Actions that may run without confirmation:

- navigate to route,
- start study,
- start challenge,
- start inline quiz,
- explain selected card.

Actions that require confirmation:

- create flashcards,
- edit flashcards,
- delete flashcards,
- modify deck settings,
- change learning goal.

## 14. Risks and Mitigations

### Risk: Too many features dilute the core loop

Mitigation: prioritize daily dashboard and Coach-led next action before adding new modes.

### Risk: AI hallucination reduces trust

Mitigation: source-first citations, web labeling, and answer confidence patterns.

### Risk: Cost increases with Coach usage

Mitigation: selective retrieval, top-N context, model fallback, rate limiting, and caching.

### Risk: Gamification feels childish

Mitigation: use achievement language tied to mastery and exam readiness, not cartoon-style rewards.

### Risk: Personalization requires more data than pilot users have

Mitigation: start with simple rules and progressively add learned memory.

## 15. Prioritization

### P0

- Daily Learning Dashboard.
- Coach proactive suggestions.
- Inline quiz completion inside Coach.
- Stronger citation UX.
- Safe Coach action confirmation for content changes.

### P1

- Concept weakness clustering.
- Exam preparation goals.
- Mastery score redesign.
- Coach memory controls.

### P2

- PWA installability.
- Push notifications.
- Teacher/classroom mode.
- Shared/community decks.

## 16. MVP Delivery Plan

### Milestone 1: Daily Loop

- Add daily learning module to Workspace.
- Define primary action logic.
- Improve empty states.
- Track CTA engagement.

### Milestone 2: Coach as Coordinator

- Add proactive suggestions to Coach launcher.
- Improve Coach action UX.
- Complete inline quiz summary and persistence.
- Add clearer citation rendering.

### Milestone 3: Learning Quality

- Add concept weakness summaries.
- Add mastery score explanation.
- Add exam goal prototype.

## 17. Open Questions

- Should Memio optimize primarily for university students first, or keep positioning broad?
- Which subject vertical should be used as the first growth wedge: medicine, language learning, certification, or general university study?
- Should Coach be allowed to automatically create draft flashcards after confirmation, or only prepare suggestions for user review?
- Should XP be global, per deck, or per subject?
- What is the desired retention target before investing in community/social features?

## 18. Product Recommendation

The most important next step is not another standalone feature. It is to unify the product around a daily guided learning loop:

**Open Memio → see today's mission → study/practice with Coach → progress updates → receive next recommendation.**

If Memio executes this loop well, the product can compete beyond standard flashcard apps because it becomes a personalized AI learning companion with memory, source grounding, and action-taking ability.
