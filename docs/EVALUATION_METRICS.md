# Memio Evaluation Metrics

> Stage: Pilot  
> Purpose: define how Memio should measure learning value, AI quality, engagement, and operational reliability before broader rollout.

## 0. Pilot Assumptions

These numbers are **pilot targets**, not observed production baselines. They should be used to decide whether the pilot is healthy enough to expand, and then replaced with real baselines after 2-4 weeks of usage.

Assumed pilot shape:

- Controlled pilot: 50-200 learners over 4-8 weeks.
- Active learner: a user who completes at least one meaningful learning action in the week: reviews 3+ cards, saves 5+ generated cards, completes a quiz/game, or sends a Coach message tied to a deck.
- Correct review: SM-2 quality `2` or `3`.
- Failed review: SM-2 quality `0` or `1`.
- AI text model: `gpt-4o-mini`, the current default in `src/app/core/config.py`.
- Cost basis: OpenAI docs list `gpt-4o-mini` at `$0.15 / 1M input tokens` and `$0.60 / 1M output tokens` as of 2026-05-15. Recheck pricing before budget reporting: https://platform.openai.com/docs/models/gpt-4o-mini
- Image generation cost is tracked separately from text model cost. Current product context estimates roughly `$0.04` per generated image.

## 1. North-Star Metric

**Weekly Learning Progress**

Primary definition for pilot:

```text
Mastered cards per active learner per week
= count(cards where ease_factor >= 2.5 AND repetition >= 3 AND last_quality >= 2)
```

This should be the most important product metric because Memio is not just a CRUD app. The core value is whether learners move cards from weak or unremembered into stable memory.

Avoid using raw clicks, page views, messages, or card volume as the north-star metric. Those signals can show activity without proving learning progress.

Pilot target:

| Band | Target |
|---|---|
| Healthy | 15-25 mastered cards per active learner per week. |
| Acceptable early pilot | 8-14 mastered cards per active learner per week. |
| Needs investigation | Fewer than 5 mastered cards per active learner per week. |

## 2. Learning Effectiveness Metrics

These metrics should have the highest priority during pilot evaluation.

| Metric | Definition | Why it matters |
|---|---|---|
| Retention rate by review interval | Percent of cards answered correctly after 1, 3, 7, and 14 days. | Measures whether spaced repetition is actually helping memory hold over time. |
| Forgetting rate | Percent of previously-correct cards later rated quality `0` or `1`. | Identifies decay and weak scheduling outcomes. |
| Mastery growth | Number of cards reaching mastery per deck, learner, and week. | Shows whether learners are progressing in the topics they care about. |
| Due card completion rate | Percent of cards due today that are reviewed within the day. | Measures whether the daily learning loop is working. |
| Study streak quality | Consecutive learning days with real reviews, not only logins. | Keeps habit measurement tied to study effort. |
| Goal readiness accuracy | For exam goals, compare predicted readiness against actual progress toward the deadline. | Validates whether deadline-aware planning is trustworthy. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| Retention after 1 day | >= 80% correct | < 65% |
| Retention after 3 days | >= 70% correct | < 55% |
| Retention after 7 days | >= 60% correct | < 45% |
| Retention after 14 days | >= 50% correct | < 35% |
| Forgetting rate | <= 18% | > 30% |
| Mastery growth | >= 15 cards / active learner / week | < 5 |
| Due card completion rate | >= 70% | < 40% |
| Study streak quality | >= 3 real study days / active learner / week | < 2 |
| Goal readiness accuracy | >= 80% of goals within +/-15 percentage points | < 60% |

## 3. AI Quality Metrics

AI quality should be measured by what learners keep, trust, use, and learn from.

### Flashcard Generation

| Metric | Definition |
|---|---|
| Card acceptance rate | Percent of AI-generated cards the user keeps. |
| Edit rate | Percent of generated cards edited before saving. |
| Deletion rate within 7 days | Percent of generated cards deleted within seven days. |
| Source grounding rate | Percent of generated cards with valid `source_context`. |
| Duplicate / near-duplicate rate | Percent of generated cards that repeat the same idea. |
| Difficulty calibration | Check whether cards labeled `hard` later receive lower `last_quality` than easier cards. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| Card acceptance rate | >= 75% | < 55% |
| Edit rate | 15-35% | > 45% or < 5% |
| Deletion rate within 7 days | <= 10% | > 20% |
| Source grounding rate | >= 90% | < 75% |
| Duplicate / near-duplicate rate | <= 8% | > 15% |
| Difficulty calibration | Hard cards have at least 15% lower average `last_quality` than easy cards | No separation |

### Coach

| Metric | Definition |
|---|---|
| Citation precision | Percent of citations that actually support the answer. |
| Action usefulness | Percent of suggested actions clicked or completed by the learner. |
| Coach resolution rate | Percent of sessions where the user does not immediately ask the same issue again. |
| Hallucination rate | Percent of answers that are wrong or not grounded in deck/source context. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| Citation precision | >= 90% on sampled answers | < 75% |
| Action click-through rate | >= 30% | < 10% |
| Coach resolution rate | >= 70% | < 50% |
| Hallucination rate | <= 3% severe, <= 8% minor | > 10% total |

### Quiz / Adventure Campaign

| Metric | Definition |
|---|---|
| Question validity rate | Percent of questions with a correct answer and reasonable distractors. |
| Hint dependency rate | Percent of questions answered correctly only after using a hint. |
| Learning transfer | Change in later SM-2 review quality for cards practiced in games or quizzes. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| Question validity rate | >= 95% | < 85% |
| Hint dependency rate | 20-40% | > 55% or < 10% |
| Learning transfer | +0.25 average `last_quality` improvement on related cards within 7 days | <= 0 |

## 4. Product & Engagement Metrics

These metrics explain whether the product is sticky, but they should not replace the learning north-star.

| Metric | Definition |
|---|---|
| Activation rate | Percent of users who create a deck and generate/save at least N cards in the first session. |
| D1 / D7 retention | Percent of learners who return after one day and seven days. |
| Cards reviewed per active day | Average reviewed cards on days when a learner is active. |
| Decks with active goals | Number or percent of decks with exam/deadline goals. |
| Coach usage per active learner | Coach messages or sessions per active learner. |
| Notification conversion | Percent of in-app or Telegram alerts that lead to a study action. |
| Guest-to-account conversion | Percent of guest users who create a durable account. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| Activation rate | >= 60% | < 35% |
| D1 retention | >= 40% | < 25% |
| D7 retention | >= 30% | < 15% |
| Cards reviewed per active day | 15-40 | < 8 |
| Decks with active goals | >= 25% of active decks | < 10% |
| Coach usage per active learner | 2-5 messages / week | < 1 |
| Notification conversion | >= 20% | < 8% |
| Guest-to-account conversion | >= 20% | < 8% |

## 5. System Reliability / Ops Metrics

Reliability matters during pilot because failed generation, slow responses, and high AI cost directly affect trust.

| Metric | Definition |
|---|---|
| AI generation success rate | Percent of AI card/image/coach/game requests that complete successfully. |
| Median / p95 latency | Track card generation, image generation, Coach response, and study progress update latency. |
| OpenAI cost per active learner | Total OpenAI cost divided by active learners. |
| OpenAI cost per accepted card | Generation cost divided by cards accepted by users. |
| Fallback rate | Campaign fallback, clustering fallback, image-disabled, or image-failure rate. |
| Error rate by endpoint | 4xx/5xx rates grouped by backend endpoint. |
| Auth refresh failure rate | Percent of token refresh attempts that fail. |
| DB migration/deploy failure rate | Percent of deploys or migrations that fail or require rollback. |

Pilot targets:

| Metric | Healthy target | Investigate if |
|---|---:|---:|
| AI generation success rate | >= 97% | < 93% |
| Card generation p95 latency | <= 45s | > 75s |
| Coach response p95 latency | <= 8s | > 15s |
| Quiz / campaign p95 latency | <= 20s | > 40s |
| Image generation p95 latency | <= 90s | > 150s |
| Study progress update p95 latency | <= 500ms | > 1.5s |
| Text OpenAI cost per active learner | <= $0.10 / week | > $0.30 / week |
| Text OpenAI cost per accepted card | <= $0.002 | > $0.01 |
| Image cost per active image user | <= $0.60 / week | > $1.50 / week |
| Fallback rate | <= 5% | > 12% |
| Error rate by endpoint | <= 1% 5xx | > 3% 5xx |
| Auth refresh failure rate | <= 2% | > 5% |
| DB migration/deploy failure rate | 0 failed deploys in pilot | Any repeated failure |

Expected `gpt-4o-mini` text cost per operation:

| Operation | Planning estimate | Notes |
|---|---:|---|
| Generate 10 text flashcards | `$0.002-$0.006` | Depends on source length and output size. |
| Accepted text card | `$0.0003-$0.002` | Higher if users reject many cards or retries are common. |
| Coach answer | `$0.001-$0.004` | Depends on retrieved context and answer length. |
| Inline quiz start | `$0.002-$0.008` | Depends on number of questions and citations. |
| Adventure campaign start | `$0.004-$0.015` | More output-heavy than simple quiz. |
| Learning-intelligence embedding call | about `$0.001` / 80 cards | Matches current `PROJECT_CONTEXT.md` estimate. |

## 6. Pilot Dashboard

For the pilot dashboard, start with these 10 metrics:

1. Weekly active learners.
2. Mastered cards per active learner per week.
3. Due card completion rate.
4. 7-day retention.
5. AI card acceptance rate.
6. AI card edit/delete rate.
7. Coach action click-through rate.
8. Exam goal readiness accuracy.
9. p95 latency for AI endpoints.
10. OpenAI cost per active learner.

Dashboard target summary:

| Metric | Pilot target |
|---|---:|
| Weekly active learners | >= 100 after recruitment starts; >= 30 for tiny closed pilot |
| Mastered cards per active learner per week | >= 15 |
| Due card completion rate | >= 70% |
| 7-day retention | >= 30% |
| AI card acceptance rate | >= 75% |
| AI card edit/delete rate | Edit 15-35%, 7-day delete <= 10% |
| Coach action click-through rate | >= 30% |
| Exam goal readiness accuracy | >= 80% within +/-15 percentage points |
| p95 latency for AI endpoints | Coach <= 8s, cards <= 45s, quiz <= 20s |
| OpenAI cost per active learner | Text <= $0.10/week; image users <= $0.60/week |

## 7. Instrumentation Status

This document defines the evaluation target. It does not mean every metric is already instrumented.

| Metric family | Current support | Needed before full dashboard |
|---|---|---|
| North-star / mastery | Mostly available from `progress`. | Add weekly aggregation query and active-learner definition. |
| Due completion / streaks | Partly available from `progress` and `study_sessions`. | Tighten local-day logic and expose dashboard query. |
| Retention by interval / forgetting transitions | Not fully available from current aggregate progress alone. | Add durable per-review history via Alembic migration before using `ReviewHistory`. |
| AI card acceptance/edit/delete | Not fully available. | Track preview, save, edit, delete events with generated-card metadata. |
| Coach action CTR / citation precision | Partly available through pilot trust events/logs. | Store durable telemetry events and add sampled manual review workflow. |
| Latency / token cost | Not fully available. | Add AI operation logging with model, token usage, latency, status, and endpoint. |
| Goal readiness accuracy | Partly available from `learning_goals`. | Store readiness snapshots so predictions can be compared with later progress. |

Implementation rule: do not rely on new SQLModel tables such as `ReviewHistory`, `TelemetryEvent`, or `AIOperationLog` until a matching Alembic migration exists.

## 8. Measurement Principle

The best evaluation question is not only "Does the AI create good cards?"

The stronger question is:

**Do learners remember better, study more consistently, and reach their learning goals faster with Memio?**

For Memio, learning outcomes should beat vanity metrics.
