# Prompt do AI buildera (v0 / Bolt / Lovable / Replit Agent / podobne)

Gotowy do wklejenia w całości. Napisany po angielsku (lepsza skuteczność większości builderów), z jawnym wymogiem polskiego interfejsu.

---

```
Build a complete, production-quality Progressive Web App called "Nowa Ja" — a free, 60-day home workout program for beginners, in Polish. This is a fresh MVP build: design the UI/UX from scratch, don't assume any existing visual style. You have full creative freedom on layout, components, and visual identity, with two soft anchors: the product has a real logo using a forest-green-to-coral-red palette on a near-black card background (transformation theme, "before/after" silhouettes) — use as inspiration if helpful, not a hard constraint. All UI copy, labels, and content must be in Polish; code/comments in English.

## Non-negotiable product constraints
- No backend, no database, no user accounts. Everything persists in the browser (localStorage/IndexedDB) only. This is the core trust promise — never suggest a login wall or server sync.
- No payment processing. The app is free. It may show non-intrusive ads (never during an active workout screen).
- Explicit, repeated framing that this is NOT medical advice — a general/educational program, with a mandatory one-time safety acknowledgment before first use.
- Installable as a PWA, works offline after install (except on-demand media).
- Every screen must work well for a first-time visitor with zero data AND a returning user with 60 days of history — design both states, not just the happy path.

## Product structure — the program itself
- A 60-day program split into 4 progressive phases, following a repeating weekly cycle of day types (some are single-exercise-sequence days, some are circuit/station-based with rounds, one is always a rest day). The schedule is generated from rules (phase + cycle position), not hardcoded per day.
- 49 exercises total: ~38 "core" exercises requiring no or minimal home equipment, plus ~11 "bonus" exercises requiring optional extra equipment (a car tire, a weighted backpack, a jump rope) — bonus exercises are opt-in extras, never inserted into the core day-by-day schedule automatically.
- Each exercise has: a muscle-group tag, step-by-step written instructions, a safety note, a sets×reps (or sets×time) target that scales across the 4 phases, an instructional image, and an instructional video (muted — a text-to-speech narrator reads the written steps aloud when the video is played, instead of relying on the video's own audio).

## Full screen inventory (build all of these)

**Onboarding** — multi-step wizard, one focused question (or one tightly related pair, like height+weight) per screen, with a visible step-progress indicator and back/forward navigation. Include a prominent "skip and start now with defaults, customize later" fast path from step one — this is a hard requirement, most competitor apps lose users here. Fields to collect across the flow: name, age, height, weight, training experience level (beginner/intermediate/advanced), main goal (weight loss/toning/mobility/general fitness/endurance), sessions per week, session length, available equipment (multi-select, ~9 options including the 3 bonus-equipment items), difficulty preference (easier/standard/harder), priority body areas (multi-select), movement limitations (multi-select + free-text note), program start date.

**Safety consent screen** (mandatory, blocking, shown once before first workout) — program framing text, medical-consultation guidance, a checkbox that must be checked to enable the confirm button.

**Today / Dashboard** (home screen) — greeting by name; current phase + day number (X/60); today's day type + target muscles; primary CTA (start workout / view rest day / view completed workout, state-dependent); completion badge if already done; overall progress bar + streak + link to full progress; a "readiness score" card (0-100, computed from recent session ratings + optional manual sleep-quality and soreness self-report, explicitly labeled as non-medical, not a wearable integration); a conditional "adjust difficulty" suggestion card with reasoning and one-tap apply (appears only after enough session history exists); a short contextual coaching tip; last-session summary; a weekly summary card (session count, total minutes, average ratings); quick links to schedule/library/safety and a conditional "bonus exercises" link (shown only if relevant bonus equipment is selected in the profile).

**Day detail** — day number/phase/type/muscles; collapsible warmup/cooldown reminder; a collapsible "adjust today's session" panel with quick-select chips (short on time / missing equipment / pain in a specific body part) PLUS a free-text input that parses the same intents from a plain-language sentence (explicitly labeled in the UI as rule-based pattern matching, not a real AI conversation — be honest about this, don't oversell it); exercise list with per-item checkboxes and links to detail; mark-day-complete action; start-guided-workout action; a distinct simplified layout for rest days.

**Guided workout runner** (full-screen, most important screen in the app) — exit action with confirm-to-discard; day type label; narrator toggle (on/off); background-music toggle + current track name + skip (independent of narrator, both can run together); circuit progress (station/round counters) for circuit days; current exercise name + target; a large countdown timer covering prep/active/rest phases; set counter for non-circuit days; actions: pause/resume, mark set done, skip exercise, swap exercise (opens an alternatives list from the same muscle group), report pain for this exercise; contextual suggestion banners (pain-based swap after repeated reports, equipment-constraint swap); an end-of-workout feedback form (difficulty 1-5, feeling 1-5, pain none/mild/pain) that saves the session; a badge-earned toast after saving if applicable. Add haptic feedback (Vibration API) on set-complete and on badge-earned as a lightweight engagement touch.

**Schedule/Plan** — toggle between a list view (grouped by phase, collapsible, completion marks) and a real calendar month view (prev/next navigation, status dot per day: done/today/missed/upcoming, click-through to day detail).

**Exercise library** — search by name/muscle/code; filter chips by muscle group including a distinct "bonus" filter; result grid/list with group-coded badges.

**Exercise detail** — group badge, name, muscle; image; instructional video (muted, tapping play triggers the narrator reading the steps); a photo-sequence "flipbook" fallback for exercises without real video; user-upload actions for image/video/photo-sequence; step list; safety note; sets×reps table across all 4 phases; quick-timer shortcuts; a collapsible AI-generation-prompt block (for image and video) for exercises still missing real media, with copy-to-clipboard.

**Progress** — overall completion bar + streak; weekly summary card; a badge/achievement grid (locked/unlocked states, icon, name, unlock condition as a tooltip, earned count) — include at least one achievement earnable on day zero (profile completed + safety accepted), before the first full workout, since first-day achievement is proven to significantly boost return rate; full reverse-chronological session history; weight tracking (trend chart + add-entry form + recent list); body-measurement tracking (waist/hips/thighs/arms/functional-test-reps + date, form + recent list); body-photo tracking with add/delete and a draggable before/after comparison slider (visible once 2+ photos exist); a "share this achievement" action that renders a shareable branded image client-side (canvas-based) and opens the native share sheet — no data leaves the device, this is the privacy-safe substitute for social leaderboards.

**More (hub)** — links to safety info, profile settings, privacy policy, terms.

**Profile & settings** — editable profile (every onboarding field, re-editable anytime); multi-profile support on one device (switch/add/delete); theme selector (auto/light/dark); narrator settings (on/off, tone: gentle/tough); music settings (on/off, volume); daily reminder settings (time picker, with a note about browser notification limitations when the app/tab is closed); data export/import to a file; reset-progress action (clearly marked as destructive/irreversible).

**Slide-out sidebar menu** (accessible from any app screen via a header icon) — profile summary (name, day counter), links to settings/safety/legal/marketing-home, a data-stays-local reassurance line.

**Persistent bottom navigation** — 5 destinations: Today, Plan, Exercises, Progress, More.

**Persistent header** — sidebar toggle, brand/home link, active profile name linking to settings.

**Public marketing landing page** (separate from the installable app) — hero with value proposition and primary CTA into the app; a trust stat bar (days in program / exercises in library / phases / cost-free); a features section; an explicit safety/trust section stating plainly this isn't medical advice; a closing CTA; footer with source-code link, legal links, contact. Write this copy in a plain, direct, non-hype voice — avoid stock ad-copy formulas like "stop doing X, start doing Y" or "you'll wonder why you didn't start sooner." State what the product does; let the facts persuade, don't oversell.

**Legal pages** — privacy policy (what data exists and that it's local-only, any analytics/ads disclosure with opt-out links, permissions used, user rights, data export/delete pointers, children's policy) and terms of service (service description, medical disclaimer, liability limits, governing law, contact).

## New features to include beyond a baseline clone (this is what makes it competitive, not just a copy)
1. **Camera-based form checking, fully on-device** (e.g. MediaPipe/TensorFlow.js pose landmarker running in the browser — video frames never leave the device). Scope it narrowly and honestly: start with 1-2 checks that matter most (e.g., spine staying neutral during a hinge/squat movement, knees not collapsing inward) rather than promising full-exercise grading. Surface it as an optional, clearly-labeled beta feature during the guided workout for the exercises where it applies. This is the app's headline differentiator — most competitors offering camera form-check require an account and send video to a server; this one doesn't.
2. **Rule-based natural-language constraint parsing** in the day-adjustment panel (already scoped above) — be explicit in the UI that this is pattern matching, not a real AI model, to keep the product honest.
3. A visible **skip-onboarding fast path** and a **first-action achievement** (see Progress section) — both proven retention levers that are cheap to build and easy to skip in a naive clone.
4. A lightweight **express workout mode** (a dedicated short-form day variant, not just a reduced-sets version of the full day) for low-motivation days.

## Explicitly out of scope for this build
Do not add: user accounts, social feeds/leaderboards/friends, a real conversational LLM chat, wearable/Health Connect integration, or a nutrition/calorie database. These require a backend and/or ongoing API costs and would break the "free, local-only" promise that is this product's core differentiator — flag them as "future, needs a backend" rather than building stubs for them.

## Edge cases to design for explicitly
No profile yet (forces onboarding) · profile exists but safety consent not yet accepted (blocks everything else) · zero sessions/measurements/photos/weight entries (empty states with a clear first action) · rest day vs. sequential-exercise day vs. circuit day (three distinct workout-runner layouts) · exercise with full media vs. image-only vs. photo-sequence-only vs. no media at all · zero vs. one vs. multiple active day-adjustments · difficulty suggestion hidden until enough history exists · comparison slider hidden until 2+ photos exist · single profile vs. multiple profiles on one device.
```
