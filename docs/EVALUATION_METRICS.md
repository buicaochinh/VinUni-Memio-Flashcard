# Memio Evaluation Metrics

> Stage: Pilot  
> Purpose: define how Memio should measure learning value, AI quality, engagement, and operational reliability before broader rollout.

## 1. North-Star Metric

**Weekly Learning Progress**

Primary definition for pilot:

```text
Mastered cards per active learner per week
= count(cards where ease_factor >= 2.5 AND repetition >= 3 AND last_quality >= 2)
```

This should be the most important product metric because Memio is not just a CRUD app. The core value is whether learners move cards from weak or unremembered into stable memory.

Avoid using raw clicks, page views, messages, or card volume as the north-star metric. Those signals can show activity without proving learning progress.

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

### Coach

| Metric | Definition |
|---|---|
| Citation precision | Percent of citations that actually support the answer. |
| Action usefulness | Percent of suggested actions clicked or completed by the learner. |
| Coach resolution rate | Percent of sessions where the user does not immediately ask the same issue again. |
| Hallucination rate | Percent of answers that are wrong or not grounded in deck/source context. |

### Quiz / Adventure Campaign

| Metric | Definition |
|---|---|
| Question validity rate | Percent of questions with a correct answer and reasonable distractors. |
| Hint dependency rate | Percent of questions answered correctly only after using a hint. |
| Learning transfer | Change in later SM-2 review quality for cards practiced in games or quizzes. |

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

## 7. Measurement Principle

The best evaluation question is not only "Does the AI create good cards?"

The stronger question is:

**Do learners remember better, study more consistently, and reach their learning goals faster with Memio?**

For Memio, learning outcomes should beat vanity metrics.
