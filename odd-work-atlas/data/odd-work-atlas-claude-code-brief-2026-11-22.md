# Odd-Work Atlas — Rebuild Brief for Claude Code

**Purpose of this file:** everything needed to recreate the Odd-Work Atlas as a real, premium, high-quality app. It contains (1) a ready-to-paste prompt for Claude Code, (2) the product idea and strategy model, (3) the user's hard rules, (4) the current live state of every application, and (5) a complete data appendix: all 340 gig records exactly as registered in the current Atlas, each with its verified app link or "No app," plus the supporting research documents' key contents.

---

## 1. THE PROMPT (paste this into Claude Code)

> Build me a real, premium Android app called **Odd-Work Atlas** — a personal gig-work command center for one user, Thomas Densley of Salt Lake City, Utah. The full specification, all of the seed data (340 gig records with categories, pipeline stages, descriptions, and working notes), the verified app-download links, the current application statuses, and the strategy rules are in the markdown brief attached to this project (`odd-work-atlas-claude-code-brief-2026-11-22.md`). Read the whole brief before writing code, and seed the app's database with the Appendix A records exactly as given — do not invent, rename, merge, or drop records.
>
> The point of the app: **organize and surface everything, and keep everything retrievable, so the user can prioritize and strategize.** He runs dozens of gig platforms at once — some earning, some applied, some waitlisted, some blocked — and the app exists so that at any moment he can answer: *What can I make money on today? What is waiting on me? What is waiting on them? What is each thing actually worth per hour and per mile? What should I do next?*
>
> Non-negotiables (detailed in the brief): phone-first for a Samsung Galaxy S24 Ultra; **light mode always**; large touch targets (≥44px) and plain, dyslexia-friendly language; a pipeline model with stages; per-gig floors that act as **filters, not labels**; door-to-door $/hr and $/mile math on every job; a money ledger; fast full-text search and filter chips over every field so nothing is ever lost; and an Android **APK as part of the deliverable** — a web-only prototype does not count as finished. The design bar is premium 2026: modern type scale, generous spacing, one coherent component system, soft depth — never a 1990s table-grid look.
>
> Ship: the app source, an installable APK with a designed app icon, and a description document (what the app is, its purpose, why it was made, how it works).

---

## 2. THE GENERAL IDEA — why this app exists

Thomas earns his living from many small income streams at once: rideshare, delivery, parking enforcement, mystery shopping, research studies, tutoring, process serving, and dozens more. No single platform gives him full-time work; the money is in the **portfolio** — knowing which platforms are live, which are stuck, which pay best per hour and per mile, and what the next action is on each one.

The Atlas is his **single source of truth** for that portfolio:

- **Organize** — every gig platform he has ever found, applied to, or worked, in one registry with a category, a pipeline stage, a description, and a living note that records everything learned about it (pay rates, blockers, deadlines, contacts, outcomes).
- **Surface** — the app must push the right things to the top on its own: gigs he can earn on *today*, applications waiting on *his* action (a tap, a quiz, an ID upload), applications waiting on *them* (a recruiter, a waitlist, a review), and money deadlines. He should never have to dig for the thing that matters today.
- **Retrieve** — everything must be findable in seconds: full-text search across names, categories, descriptions, and notes; filter chips by stage, category, pay model, and status flags (waitlisted, blocked, closed). Nothing recorded is ever lost or buried.
- **Prioritize** — ranking is by **net dollars per hour and net dollars per mile**, door-to-door (gross pay ÷ (shift hours + round-trip drive time from home), and gross ÷ round-trip miles). A gig that pays $18/hr across town can be worth less than $12/hr next door; the app does that math and shows it.
- **Strategize** — with everything visible, he can plan application batches, spot which categories are saturated or missing, see total pipeline value, and decide where the next hour of effort goes.

The current Atlas is a web prototype holding 340 records. This rebuild is the same registry as a **real, premium, native-quality app** — faster, better looking, and built to be lived in daily.

---

## 3. THE USER

- **Thomas Densley**, Salt Lake City, UT (home: 933 E 300 S, 84102 — the anchor point for all drive-time/mile math). Timezone America/Denver.
- **Phone-only.** His laptop died in September 2026; his Galaxy S24 Ultra is his only computer. The app is designed, built, and used on a phone.
- **Dyslexic, dictation-first.** Plain short sentences, generous type, no dense text walls, no word puzzles of any kind. Touch targets ≥44px, labels ≥15px, contrast ≥4.5:1.
- **Light mode always, in every app, no exceptions.**
- Drives a **2024 Toyota Corolla Hybrid**. Married to Nickolle.
- He is the only user. No accounts, no social features, no sharing. Data lives on-device (with export/backup to a file he controls).

---

## 4. PRODUCT SPEC

### 4.1 Data model — one record per gig platform

| Field | Meaning |
|---|---|
| `name` | Display name (exact, from Appendix A) |
| `platform` | The company/platform name |
| `category` | One of the Atlas categories (Delivery, Rideshare, Field Services, Research & Studies, Tutoring, Legal & Enforcement, etc. — use the categories as given in Appendix A) |
| `stage` | Pipeline stage: `not_started`, `researching`, `signed_up`, `active`, `first_job`, `earning`. Waitlisted / blocked / rejected / closed are **status flags**, not stages (see 4.2) |
| `description` | One line: what the platform is and what the worker does |
| `note` | The living record: pay facts, blockers, deadlines, contacts, outcomes. Long text, fully searchable |
| `appUrl` | Verified Google Play link, or **No app** (from Appendix A — never guess a URL) |
| `reviewUrl` | A YouTube review of working the platform, where one exists (see the companion directory, §7) |
| `floor` | Thomas's minimum acceptable door-to-door $/hr for this gig, where set. **A floor is a filter**: work below it is hidden, never shown with a caveat |
| `pinned` | Pinned to the top of the priority queue |
| `queuePosition` | Manual priority ordering |

### 4.2 Status flags (in addition to stage)

`waitlisted` · `blocked` (with the blocker written in the note) · `closed` (denied/banned/dead — with the reason; closed records stay retrievable but leave all active surfaces) · `waiting_on_me` (next action is Thomas's) · `waiting_on_them` (next action is the platform's).

### 4.3 Money ledger

Per gig: jobs done (date, gross pay, hours, miles), running totals, and computed **net $/hr** and **$/mile**. A gig's ledger feeds its ranking everywhere.

### 4.4 Required views / surfaces

1. **Today** — gigs he can earn on right now (stage `active`/`earning`, not blocked), plus anything with a deadline today, plus the top `waiting_on_me` items.
2. **Pipeline board** — every gig grouped by stage, with status flags visible; counts per stage.
3. **Priority queue** — his ordered apply/work-next list; pinned first; drag to reorder.
4. **Browse / Retrieve** — full-text search over name + category + description + note; filter chips (stage, category, flags, has-app, no-app); sort by name, $/hr, $/mile, recently updated.
5. **Gig detail** — every field, the full note, app link (or "No app"), review link, ledger, and one-tap actions: open app link, add job, edit note, change stage/flags, set floor, pin.
6. **Money** — ledger totals: all-time, this month, per gig; best and worst $/hr and $/mile.

### 4.5 Design law (from the user's standing rules)

- **Premium 2026 design**: modern type scale, generous consistent spacing, one coherent component family, soft depth and subtle shadows; no default-browser controls, no table-grid layouts, no cramped cells, nothing that looks like 1997 HTML.
- **Light mode only.** One signature accent color family across the app; designed tiles/icons per gig (real company logos where legitimately available, otherwise a designed two-tone monogram tile with the gig's initials — the current Atlas does exactly this for 300 of 340).
- **Android Back button rule**: Back goes to the previous in-app screen, never exits from an inner screen, and at the root asks for in-app confirmation before quitting; unsaved edits are guarded, never lost silently.
- **Deliverable = installable APK** with the app's icon, plus full source and a description document. A web-only build is not a finished build.

---

## 5. STRATEGY MODEL — the rules the app must encode

- **Measure everything by net $/hr and $/mile, door-to-door** from 933 E 300 S, Salt Lake City.
- **Floors are filters, not labels.** Example standing floor: Instawork holiday shifts must clear **$20/hr door-to-door** (through Dec 25, 2026) — below-floor shifts are *not surfaced at all*, no "close" exceptions. This pattern (a per-gig or per-category floor that hides, not annotates) is a core feature.
- **Confirmed things only** go on any calendar surface; unverified shifts stay off.
- **Never surface Indeed listings.** His gig world is this Atlas. (Sole exception: a posting so spectacular it defies categories — the app simply has no Indeed source; this is a content rule for anything imported.)
- **Needle rule:** Thomas is afraid of needles. Plasma-donation gigs (BioLife, CSL Plasma, Grifols, Octapharma) exist in the registry as records only — the app must **never recommend** them, rank them as opportunities, or surface them in Today/queue suggestions.
- **Closed is closed** — never suggest reapplying to: Walmart Spark (denied, driving record), Roadie (denied, driving record), Poplin (banned, duplicate account), Shipt (removed, late deliveries; appeals closed), DeliverThat (rejected, background check). Amazon Flex is *blocked* (identity theft — someone worked Flex under his stolen SSN; escalation in progress), never "just reapply."
- **Applications workflow**: when an application is filled, Thomas's standing answers are reused (profile on file: name, DOB, address, phone, Galaxy S24 Ultra, valid license, 2024 Corolla Hybrid, 100-mile radius "if it pays," full-time availability, household income $40,000–$59,999, **no computer owned**). The app should store this profile once and show it on an "Application profile" screen. SSN, license number, and bank details are **never stored**. Background-check consent, signatures, and spoken/voice tests are always Thomas's own actions — the app tracks them as `waiting_on_me`, never as done.
- **Respondent rule**: research-study applications are capped at **3 per day** by the platform; the app should track today's application count for Respondent.

---

## 6. CURRENT LIVE STATE (as of Sun Nov 22, 2026 — bake into seed data where noted)

### 6.1 Earning / active now
Taggr (paid weekly, Wednesdays) · Uber Rideshare · Uber Eats · Lyft · TaskRabbit · Skipcart (catering) · Instawork (shifts via the app; email watch running against the $20/hr door-to-door floor) · AmRide (one job so far: $350 + $50 tip, ~6 hrs) · Papa Pal (~2 jobs, low pay).

### 6.2 Waitlisted (flag `waitlisted`)
WeGoLook (since Oct 11, 2026 — Inspector spots at maximum; they email on an opening) · ShareTown (Nov 22, 2026 — no openings in his area) · Instacart · Grubhub.

### 6.3 The applied / paperwork pipeline (the current front line)
- **Respondent** — account created & email-verified. Participant ID 6b02dfd602db73aab2a323a7. Profile ~12% complete (biggest lever: finish About-me + Professional background incl. Sharp House Solutions founder experience). 15 strong study matches found Nov 22; applying is capped at 3/day; picks pending Thomas's word. An hourly watch checks for new strong matches.
- **UserTesting** — account created (username TheGlitterPrincess). Profile filled but **cannot be saved**: the form requires a Computer (Mac/Windows) selection and Thomas owns no computer. Checklist 0/4: confirm email (his tap), PayPal setup, profile, spoken practice test (his alone).
- **Market Force** — account created, ShopperID 2734982, application submitted, contractor agreement accepted by Thomas. His remaining in-app steps before a first assignment: SSN / government photo ID + payment method.
- **Mapillary** — account created (username ThomasDensley). **Email verification link tap is his.**
- **Wyzant** — tutor account created (thomas.densley). Preferences entered (students: Middle School / High School / College; locations: student's + his choice; car: yes; online: no — phone-only). Subject: **Piano**. (Go is *not* offered on Wyzant — verified.) Stopped at step 2 of 6, the "How Wyzant Works" quiz — quizzes are his alone. Remaining: quiz, Basic Information, Personalize Profile, Terms for Tutoring, Email Confirmation.
- **ABC Legal** (process serving) — account pre-existed (contracts signed Oct 11–12, 2026); profile **87%**; insurance verified (Bear River Mutual, policy exp. 09/22/2027); driver's license accepted and training unlocked — but ABC's Utah rule names Court Appointed Server or Registered PI/Apprentice, which a license is not, so compliance could still bounce it. **Plan: court appointment at the Salt Lake County Clerk, Mon Nov 23, 2026, 10:00 AM; training block same day 1:00 PM; Checkr background check last (his consent only).** Video interview completed Nov 20, 2026.
- **CDS — Club Demonstration Services** (Costco product demonstrator, West Valley UT, $17.50/hr) — application **filled to the review screen, NOT submitted**; submitting is Thomas's word alone. ⚠️ **Data gap: the current Atlas has NO record for this company** — its only "CDS" record is a different company (Complete Delivery Service). Add the record in §6.4 to the seed data.
- **Backstage** — account created Nov 21, 2026 (reported success; not independently verified).
- **ShareTown** — waitlisted (see 6.2). Vehicle caveat: loads are oversized items; a Corolla may not qualify.
- **Terraboost** — applied Sep 26, 2026 (Poster Installer / Kiosk QA, SLC); screening answers sent Oct 13; follow-up nudge sent Nov 22, 2026; awaiting recruiter.
- **HONK** — account created, onboarding **cannot** complete: partner portal is for towing companies and requires a towing license. Dead end unless he ever has a towing business. Flag `blocked`.
- **QuestionPro UX** (successor to the dead TryMyUI) — sign-up attempted Nov 22; the site's VPN detection rejected every submission from the assistant's browser; **no account exists**. Finish: Thomas signs up on his phone (password saved), stopping before the spoken qualification test (his alone).
- **User Interviews** — **ON HOLD by Thomas's order (Nov 22, 2026)**. Sign-up blocked by Cloudflare's human check; no account exists. Do not pursue.
- **dscout** — sign-up blocked by Cloudflare's human check (8 failed attempts); form left filled; no account exists (sign-in checks confirm). Finish: Thomas on his phone.
- **OnlineVerdict** — sign-up form parked: needs his date of birth + demographics entered and his **e-signature consent** + Register. Batch-3 item.
- **Bunny Studio** — application filled through step 2; parked at the Creator Agreement checkbox; has a **$5 non-refundable fee** (his call) and a voice test inside the application (his alone). Batch-3 item.
- **Keen** (Remote Dream Interpreter role) — application barely started; needs Thomas's own experience answers + resume upload. Batch-3 item.
- **MobilAds / Good Traffic** — not yet applied; needs car color + "how did you hear" answers. Batch-3 item.
- **ToursByLocals** — registration was fully filled Nov 21 (incl. a 125-word guide statement) but never submitted and had no save-draft; treat as not applied.
- **iVueit** — sign-up packet complete (filled answers on file); sign-up happens in the app only; payouts are PayPal-only. Awaiting Thomas's in-app sign-up.
- **WeGoLook** — see 6.2; a filled application packet exists as reference only.

### 6.4 Record to ADD (missing from the current Atlas)

- **Name:** CDS (Club Demonstration Services) · **Category:** Field Services / Product Demonstration · **Stage:** researching · **Description:** Costco's in-store product demonstration company; demonstrators run sampling/cooking demos inside Costco warehouses. · **Note:** Thomas's application for Part Time Product Demonstrator, Costco 3747 South 2700 West, West Valley, UT 84119 — $17.50/hr, Req. PDX_ASI_4642DE44-E5EB-4F30-ACBE-AC2BEAFF79F4 — was filled to the review screen on Nov 21, 2026 and is NOT submitted; submitting is Thomas's decision alone. No background-check consent has been given. **App:** No app (the Play listing "Complete Delivery Solution" is a different company — do not link it).

### 6.5 Corrected "Top 10 to sign up for next" (Nov 18, 2026 — the standing priority list)
1. ezCater Relay · 2. Traba · 3. GigPro · 4. WorkWhile · 5. BetterTrucks · 6. CDS (Club Demonstration Services) · 7. Wingz · 8. Respondent · 9. ProxyPics · 10. Jitjatjo. (BioLife was struck from this list — needle rule.)

### 6.6 Top-25 "apply first" novelty ranking (Nov 21, 2026)
1 OnlineVerdict · 2 Respondent · 3 User Interviews · 4 dscout · 5 UserTesting · 6 TryMyUI (dead → QuestionPro UX) · 7 Bunny Studio · 8 Backstage · 9 Remote Dream Interpreter (Keen) · 10 Field Agent · 11 iVueit · 12 ProxyPics · 13 Market Force · 14 Wingz · 15 Utah Private Ride · 16 Dryver · 17 HONK · 18 ShareTown · 19 Terraboost · 20 SigningOrder (needs a Utah notary commission first) · 21 TakeLessons (**closed** — platform shut down Nov 15, 2024) · 22 ToursByLocals · 23 Mapillary · 24 MobilAds · 25 Jitjatjo.

### 6.7 No-skill classification (Nov 22, 2026 — all 340 classified)
Tier 1, strict no-skill (no credential/experience needed): **173 gigs**. Tier 2, borderline: **62**. Excluded (skill/credential/vehicle-gated): **105**. The full per-gig classification is in the companion file `no-skill-gigs-2026-11-22.md` (§7). The app should import this as a `noSkillTier` field (1, 2, or excluded) — it is a first-class prioritization signal for quick wins.

---

## 7. COMPANION FILES (the rest of "all the info")

These live in Thomas's Google Drive folder **"Gig Work & Side Hustles"** and in the Atlas goal workspace; include them in the Claude Code project alongside this brief:

- `gig-directory-2026-11-22.md` — the 20 applied-for platforms, each with description, app link or "No app," and a **YouTube review link** (17 with reviews; CDS, Mapillary, Terraboost have none — worker-side reviews don't exist for them). Source of `reviewUrl` for those 20.
- `gig-app-urls-2026-11-22.md` — the full app-URL sweep report (340/340 checked: 189 have a Google Play link, 151 have no app). Appendix A already carries each gig's link inline; this file is the audit trail, including flagged near-name traps (e.g., the CDS app belongs to a different company; Hero Home and CBDriver matches are unconfirmed).
- `no-skill-gigs-2026-11-22.md` — the Tier 1 / Tier 2 / excluded classification for all 340.
- `top-25-apply-first-in-depth-2026-11-21.md` and `top-ten-next-signups-in-depth-2026-11-18.md` — deep per-gig research (pay, requirements, fit) behind the two priority lists.
- `gig-sweep-report-2026-11-18.md` — how the final 181 gigs were found and vetted (the registry's provenance).

---

## APPENDIX A — ALL 340 GIG RECORDS (seed data, exactly as registered)

Format per record: name · category · stage · description · note (verbatim; notes in this export are capped at ~600 characters — the full note text lives in the Atlas records) · app link or "No app" (with the sweep's caution note where one exists).

### 1-800 Hansons
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** National window/roofing company with a Utah location in West Valley City; sales reps operate on a 1099 commission model (own vehicle, iPad for demos). Uncapped commission: 15% on company-provided leads and double commission (≈30%) on self-generated leads.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass.

### 123Notary
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Directory site for advertising mobile notary services
- **App:** No app
- **App sweep note:** No official app found in the Nov 22 gap-fill pass; only generic unrelated notary apps.

### 99designs
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Graphic design contest/freelance marketplace
- **App:** No app
- **App sweep note:** No official app (Nov 22); only an unrelated "99Designs: App Directions" app. Designers use the website.

### ABC Legal Process Serving
- **Category:** Legal & Enforcement
- **Stage:** signed_up
- **Description:** Claim jobs in the app, print legal documents, attempt service at addresses, submit proof of service or documented non-service
- **Note:** Account since Oct 2026 — contracts signed Oct 11-12, 2026, license verified. Profile 87% complete (Nov 18, 2026): Bear River Mutual insurance verified (exp. 09/22/2027). Nov 18: Thomas submitted his Utah DRIVER'S LICENSE in the Process Server Documentation section (shows exp. 10/12/2030) — the site accepted it and unlocked Training, BUT it is not the court appointment or PI registration ABC Legal's Utah rule names, so a compliance review could still bounce it. Court appointment via Salt Lake County Clerk remains the decided path — calendar Mon Nov 23, 2026, 10:00 AM; training block Mon Nov 23,
- **App:** [ABC Legal Services Mobile](https://play.google.com/store/apps/details?id=com.abclegal.apps.mobile.android)
- **App sweep note:** Play listing verified on Play search page ('mobile application for process server reporting', 10K+ downloads); package ID not captured — browser hit a 429 rate limit before the details page could be opened. Do not guess the ID. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Adobe Stock
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Stock photo licensing marketplace
- **App:** No app
- **App sweep note:** No official Adobe Stock Contributor app found (Nov 22); contributors use the website.

### Agero
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Roadside-assistance network that contracts operating service businesses (not solo app drivers): one of the guide's later 'rails' for a proven roadside business, after CurbsidePRO proves the service itself.
- **App:** [Swoop Towing](https://play.google.com/store/apps/details?id=com.swoopmobile)
- **App sweep note:** Agero's provider app: tow/roadside drivers and dispatchers accept and run Agero/Swoop jobs

### Airbnb
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Short-term rental hosting of a room or property
- **App:** [Airbnb](https://play.google.com/store/apps/details?id=com.airbnb.android)
- **App sweep note:** Hosts and guests use the same app; verified via Play publisher search + details page

### Airbnb Experiences
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Host paid local tours/experiences via Airbnb
- **App:** [Airbnb](https://play.google.com/store/apps/details?id=com.airbnb.android)
- **App sweep note:** Same Airbnb app; experience hosts use it; verified on Play details page

### Airspace
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Time-critical logistics, heavily medical/urgent (blood samples, labs, equipment). Higher hourly potential than food apps if you land good routes, but work can be sporadic and jobs can be far from home.
- **App:** [Driver Partner](https://play.google.com/store/apps/details?id=com.firstdelivery.driverapp)
- **App sweep note:** Airspace Technologies' driver app for time-critical deliveries

### Amazon Associates
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Amazon's affiliate program paying commissions on referred sales
- **App:** No app
- **App sweep note:** No dedicated Amazon Associates app by Amazon on Play; Associates Central is web-based

### Amazon FBA
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Sell products with Amazon handling storage, shipping, and returns
- **App:** [Amazon Seller](https://play.google.com/store/apps/details?id=com.amazon.sellermobile.android)
- **App sweep note:** The seller-side app FBA sellers use.

### Amazon Flex
- **Category:** Drive & Courier
- **Stage:** signed_up
- **Description:** Block-based Amazon package delivery: reserve a block, load once at the warehouse, run the route. Pay is set per block and visible before acceptance; Salt Lake runs waitlists when driver supply is full.
- **Note:** BLOCKED by identity theft: someone worked Flex under Thomas's stolen SSN; his legitimate account (tomasdensley@gmail.com) was deactivated Aug 31, 2026 over the duplicate profile. Amazon Flex Support (Sep 7 + Sep 8, 2026) said the review was underway and most partners hear back within six days; Thomas followed up Sep 15 and Sep 25 — then silence for 75 days. Nov 22, 2026: Muse sent the nudge BOTH ways at Thomas's direction — a reply in the original support thread and a fresh escalation to flex-representative-support@amazon.com (the legal-matters address Executive Relations named Sep 4). Asking
- **App:** [Amazon Flex](https://play.google.com/store/apps/details?id=com.amazon.flex.rabbit)
- **App sweep note:** Flex driver app is listed on Google Play

### Amazon Kindle Direct Publishing (KDP)
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Self-publishing eBooks on Amazon for royalties
- **App:** No app
- **App sweep note:** No official KDP app on Android; KDP publishing is web-based. Only third-party KDP tools exist on Play.

### Amazon Mechanical Turk
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Amazon Mechanical Turk microtask platform for data-entry, tagging and AI-training tasks
- **App:** No app
- **App sweep note:** No official MTurk app from Amazon; workers use the web. Only third-party clients (e.g. Turkdroid) exist on Play.

### Amazon Seller Central
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Amazon's third-party seller program (sell on Amazon Marketplace)
- **App:** [Amazon Seller](https://play.google.com/store/apps/details?id=com.amazon.sellermobile.android)
- **App sweep note:** The Amazon Seller app is the Seller Central mobile app; verified on Play.

### American Expediting
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Courier company in the Wasatch roster, listed as closed — operations ceased June 3, 2026 in the text
- **App:** No app
- **App sweep note:** No official app found; couriers work via web/phone dispatch

### AmRide
- **Category:** Your active gigs
- **Stage:** first_job
- **Description:** Non-emergency medical / scheduled rides.
- **Note:** One AmRide job done: $350 fare + $50 tip = $400 total. Drove to the Wyoming border (~3 hrs), then drove the passengers to Park City (~3 hrs) — 6 hours total, about $67/hr before gas. AmRide is really good, but no trip since; Utah driver count has grown from 3 (when he got that trip) to about 8 (Thomas, Nov 18, 2026).
- **App:** [AmRide](https://play.google.com/store/apps/details?id=com.dashride.clients.amrideapp)
- **App sweep note:** AmRide's single official app (built on the DashRide platform); no separate driver-only app is published.

### Angi
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Home-services marketplace matching skilled tradespeople with homeowners (listed alongside Thumbtack/TaskRabbit)
- **App:** [Angi Services for Pros](https://play.google.com/store/apps/details?id=com.handy.portal)
- **App sweep note:** Pro/worker app (runs on the Handy platform)

### Appen
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** AI data-task platform — labeling, transcription, search evaluation contracts
- **App:** No app
- **App sweep note:** No US/global contributor app; only a China-region app (com.appen.app.china) exists - global contributors use Appen Connect on web

### Arise
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Remote customer-service platform with higher friction than Liveops/Working Solutions: business setup, program certification, hardware/telephony and platform-cost uncertainty.
- **App:** [Arise On The Go](https://play.google.com/store/apps/details?id=com.arise.onthego2)
- **App sweep note:** Official Arise platform app for Service Partners: register, enroll, schedule intervals

### Atlas Earth
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Location game app paying tiny cash rent for virtual land plots, cashable to gift cards
- **App:** [ATLAS:EARTH: Collect Places](https://play.google.com/store/apps/details?id=ci.atlasearth.client)
- **App sweep note:** Official player app; earning (rent/places) happens in this app.

### AudioJungle
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Stock music licensing marketplace
- **App:** No app
- **App sweep note:** No official Envato/AudioJungle app; authors use the web. Only Envato-named app found ('Envato Store Pro' by THBD IT) is an unofficial third-party client.

### Authorized Physical Security Tester
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Test whether you can physically get into places you're hired to try to enter
- **App:** No app
- **App sweep note:** Specialist consulting role (physical penetration testing); engagements run through security firms, no worker app.

### Avail
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Airport/city car sharing program by Allstate
- **App:** No app
- **App sweep note:** Avail car sharing (Allstate) wound down; no app listed on Google Play.

### AxleHire
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Last-mile contract courier company (the compendium's tier list notes 'Jitsu (AxleHire)' — the same operation under its newer name). Route-style work for business clients; postings claim ~$21/hr but real driver reviews mention poor route pay in some areas.
- **App:** [Jitsu Drive](https://play.google.com/store/apps/details?id=com.axlehire.drive)
- **App sweep note:** AxleHire rebranded to Jitsu; this is its driver app

### Backstage
- **Category:** Events & Performance
- **Stage:** signed_up
- **Description:** Casting platform for acting/background work
- **Note:** Nov 21, 2026: Talent-account creation REPORTED SUCCESS in the browser window's logs (tomas.densley@gmail.com) — not yet independently verified. Awaiting Thomas: add photos he chooses and build the performer profile.
- **App:** [Backstage - Casting Calls](https://play.google.com/store/apps/details?id=com.backstage.casting)
- **App sweep note:** Talent-side app for finding and applying to casting calls.

### Bacon
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Gig shift app headquartered in Provo, Utah — 'Official Gig App of Real Salt Lake' — confirmed active in SLC with 7,500+ workers in the Salt Lake City area. The work plan's #1 sign-up recommendation for next week. Strict no-show and late-cancel penalties (three-strike policy).
- **App:** [Bacon - Flexible Work App](https://play.google.com/store/apps/details?id=com.baconinc.android)
- **App sweep note:** Bacon Work staffing app; verified on Play.

### Bags VIP
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** airport luggage delivery network
- **App:** No app
- **App sweep note:** No official app found on Google Play (Nov 22).

### Bellhop
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Moving-help platform booking movers/helpers for local moves
- **App:** No app
- **App sweep note:** No mover app on Google Play (Nov 22); the only "Bellhop" developer makes an unrelated rideshare-comparison app.

### BestMark Mystery Shopping
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Pose as an ordinary customer, notice what ordinary customers forget, file a detailed report
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; BestMark shoppers historically work via web portal.

### BetterTrucks
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** last-mile parcel delivery carrier partnering with e-commerce retailers
- **App:** [Better Trucks Driver](https://play.google.com/store/apps/details?id=com.bt.driver)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### BGSF Fire Watch
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Patrol buildings whose fire systems are impaired; watch, log checkpoints, stay alert
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; BGSF is a staffing firm, assignments are recruiter-based.

### BioLife Plasma
- **Category:** Health & Plasma
- **Stage:** not_started
- **Description:** Paid plasma donation centers (BioLife Plasma Services)
- **App:** [BioLife Plasma Services](https://play.google.com/store/apps/details?id=com.shire.biolife)
- **App sweep note:** Plasma — recorded as fact only; do not recommend (needle rule). Verified in the Nov 22 live-browser pass.

### BioTransit Logistics
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Courier company in the Wasatch roster, listed as unverified with ads but no entity-level proof
- **App:** No app
- **App sweep note:** No official app found on Google Play (Nov 22).

### Bird
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** E-scooter charging and rebalancing gigs
- **App:** [Bird — Ride Electric](https://play.google.com/store/apps/details?id=co.bird.android)
- **App sweep note:** Official Bird app (10M+ downloads, help.bird.co support); charger/fleet work is handled inside the main app — no separate official worker app found

### Bite Squad / Waitr
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Regional food delivery platform
- **App:** No app
- **App sweep note:** No driver app found for either brand (Nov 22); "Waiter.com Driver" is a different company.

### Bluecrew
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** W-2 shift-staffing app with confirmed Salt Lake City presence and live postings (warehouse, food service, cook). W-2 onboarding ('apply in 15 minutes'), review usually within 1-3 business days; weekly pay with on-demand early access for a fee (Instapay).
- **App:** [Bluecrew - Find Flexible Work](https://play.google.com/store/apps/details?id=com.bluecrewjobs.bluecrew)
- **App sweep note:** Worker app; verified on Play.

### BlueRibbon Bags
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** airport luggage delivery service
- **App:** No app
- **App sweep note:** No official app found on Google Play (Nov 22).

### Braille Music Transcriber
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Transcribe or proofread braille music notation
- **App:** No app
- **App sweep note:** Specialist certified role working through institutions/agencies; no gig app.

### Brand Ambassador Work
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Represent brands at conventions and events: talk, demo, run the booth
- **App:** No app
- **App sweep note:** Role, not a company; staffing agencies vary, no single dominant platform app.

### Bungii
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** On-demand pickup-truck / large-item delivery (furniture, big boxes) — 'mini-moving jobs.' Very high upside per hour when on a job, with solid tips, but requires a suitable vehicle and physical lifting capacity.
- **App:** No app
- **App sweep note:** No driver app found on Play; no official APK source found

### Bunny Studio
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance platform for professional voice-over, audio, and video production work
- **Note:** Nov 21, 2026 (re-run): Sign-up at apply.bunnystudio.com filled through Step 2 (email, full name, phone, US, Individual/Freelancer). Parked at the Creator Agreement checkbox (binding — Thomas's tick). NOTE: $5 non-refundable application fee for new applicants without a referral code; application includes a voice test; professional recording standards expected. Thomas: tick agreement, Steps 3-5 (profile, rates, samples), pay $5, voice test.
- **App:** No app
- **App sweep note:** No official app on Google Play (Nov 22); freelancers apply and work through the website.

### Cambly
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Platform tutoring foreign students in English online
- **App:** [Cambly](https://play.google.com/store/apps/details?id=com.cambly.cambly)
- **App sweep note:** Main Cambly app; no separate tutor app found. Verified in the Nov 22 live-browser pass.

### Care.com
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Caregiving marketplace: childcare, elder care, housekeeping, tutoring. Profile-based — apply to posted jobs or respond to families; work is often recurring (weekly housekeeping, regular senior visits), closer to traditional freelancing than fast-turn gig apps, with stable scheduled clients once matched.
- **App:** [Care.com: Find Caregiver Jobs](https://play.google.com/store/apps/details?id=com.care.android.careview.providerapp)
- **App sweep note:** Caregiver/worker app; com.care.android.careview is the family hiring app.

### Carvertise
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Car-advertising wraps: get paid monthly to carry full or partial ads on your car. Campaign-dependent — an advertiser must want your area and driving pattern. Both Carvertise and Wrapify screen MVRs and prefer very clean records — and the comprehensive guide records Thomas as already pending with them.
- **App:** [Carvertise Driver App](https://play.google.com/store/apps/details?id=com.carvertise.driver.app)
- **App sweep note:** Driver app to track/manage Carvertise jobs; verified on Play.

### Cash Giraffe
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** App paying points for trying mobile games
- **App:** [Cash Giraffe - Real Money Games](https://play.google.com/store/apps/details?id=cashgiraffe.app)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### Cat Litter Swap Service
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Odd hired service swapping out cat litter for pet owners
- **App:** No app
- **App sweep note:** No app (Nov 22); local service, no Play listing.

### CBDriver
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Job board / lead source for courier and driver contracts (the CBDriver/USPack Salt Lake route lead: Monday-Saturday routes from ~8:00 a.m., ~5 hours, car/minivan/SUV, 1-200 miles). The guide treats the payout as undisclosed — a lead, not an opportunity, until the fee is known.
- **App:** [CB Driver](https://play.google.com/store/apps/details?id=dvr.crystalball)
- **App sweep note:** Exact-name match, but this is a fleet SmartCam/driver companion app; may not be the gig-platform sense of CBDriver

### CDS (Complete Delivery Service)
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Prescription and medical delivery service
- **App:** [Complete Delivery Solution](https://play.google.com/store/apps/details?id=com.completedeliverysolution.cdsvendormobile)
- **App sweep note:** Play listing name is "Complete Delivery Solution" (not Service); vendor/driver app — "View offers and complete orders." NOTE: this is a different company from CDS Club Demonstration Services (the Costco demo employer). Verified in the Nov 22 live-browser pass.

### Chegg Tutors
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Online tutoring platform paying tutors per lesson
- **App:** No app
- **App sweep note:** No tutor app; only the student-facing Chegg Study app. Tutors use the website.

### Chicken Coop Clean & Set-Up
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Hired backyard chicken coop cleaning and setup service
- **App:** No app
- **App sweep note:** No app (Nov 22); local service entry.

### CitizenShipper Pet Transport
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Bid on long-distance pet moves and drive animals safely across the country
- **App:** No app
- **App sweep note:** Play search for 'CitizenShipper' returns no CitizenShipper app (only unrelated driver apps like uShip, Roadie, Curri); drivers work through the website.

### Clickworker
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Microtask platform for small paid tasks
- **App:** [clickworker](https://play.google.com/store/apps/details?id=com.clickworker.clickworkerapp)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### COIN
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Digital rewards app paying COIN redeemable for XYO crypto
- **App:** [COIN: Always Be Earning](https://play.google.com/store/apps/details?id=network.xyo.coin)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### Commercial Geoduck Harvester
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Dive commercially for geoduck clams under a capped state license
- **App:** No app
- **App sweep note:** Regulated harvest trade role; no gig platform app.

### Compensated Sperm Donor
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Donate through a screened sperm-bank program as an independent contractor
- **App:** No app
- **App sweep note:** Role recruited by sperm banks through their websites; no donor gig app.

### Confero
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Mystery-shopping company with a Utah page and independent-contractor structure. The guide counts it as filler only and warns not to count reimbursements as labor income.
- **App:** No app
- **App sweep note:** Only an unrelated 'Confero' by Confero Ventures Pvt Ltd (India) exists; Confero Inc shoppers use a web portal

### Contra
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance platform for creative professionals
- **App:** No app
- **App sweep note:** No official app found (Nov 22); freelancers use the website.

### Cordova Courier
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** local courier company (Utah)
- **App:** No app
- **App sweep note:** No official app found on Google Play (Nov 22).

### Courial
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** On-demand courier/errand platform active in 21 markets
- **App:** [Courial Partner](https://play.google.com/store/apps/details?id=live.courial.partner)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### Crossword Constructor
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Construct crosswords and variety cryptics good enough to be accepted
- **App:** No app
- **App sweep note:** Freelance craft role; construction tools are desktop/web software, no gig platform app.

### CSL Plasma
- **Category:** Health & Plasma
- **Stage:** not_started
- **Description:** Paid plasma donation centers (CSL Behring)
- **App:** [CSL Plasma](https://play.google.com/store/apps/details?id=com.cslplasma.cslplasmadonorapplication)
- **App sweep note:** Plasma — recorded as fact only; do not recommend (needle rule). Verified in the Nov 22 live-browser pass.

### CurbsidePRO Roadside Assistance
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** 1099 roadside network: jump-starts, lockouts, tire help — arrive with tools and solve it
- **App:** [CurbsidePRO Roadside](https://play.google.com/store/apps/details?id=com.janusapp)
- **App sweep note:** Play listing verified on Play search page ('Earn with roadside jobs, battery installs', 10K+ downloads); a second tech app 'Curbside SOS for Technicians' by the same developer also exists. Package ID not captured — 429 rate limit. Do not guess the ID. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### CURO
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** General errand delivery platform, paired in the text with Gopher
- **App:** No app
- **App sweep note:** No CURO parking app found (Nov 22); only similarly named unrelated apps.

### Curri
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Construction & industrial material delivery (lumber, piping, HVAC) to job sites — business-to-business rather than food. Cars/SUVs supported alongside larger vehicles; applicants can stay waitlisted until local vehicle-class demand exists.
- **App:** [Curri Driver](https://play.google.com/store/apps/details?id=com.Curri.Driver)
- **App sweep note:** Driver app for construction-materials delivery

### Davies Risk Services
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Insurance premium-audit buyer in the same inspection function as FAR/EXL: paid per audit, training provided.
- **App:** No app
- **App sweep note:** No inspector app found on Play

### DeliverThat
- **Category:** Drive & Courier
- **Stage:** signed_up
- **Description:** Pre-scheduled catering delivery (office lunches, events) and route work; larger, higher-value orders than food apps. The guide's 'best low-capital addition from the Drive research' — Thomas already owns qualifying catering bags from Skipcart work.
- **Note:** Applied — REJECTED: the background check failed because of his speeding tickets (Thomas, Nov 18, 2026).
- **App:** [DeliverThat – Drivers](https://play.google.com/store/apps/details?id=com.deliverthat.driver)
- **App sweep note:** Official catering driver app (ideliverthat.com).

### Dibs — One-Off Human Help
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** The general market for one-off human help: unrelated small tasks, one after another
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; no official app confirmed.

### Dispatch
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** B2B last-mile delivery platform. Orders display payout, route miles, service level, load and required vehicle before acceptance; Stripe account required before orders are visible.
- **App:** [Dispatch](https://play.google.com/store/apps/details?id=com.dispatchit)
- **App sweep note:** Driver app for the Dispatch (dispatch.com) courier platform

### Dlivrd (Expedite)
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Catering-focused delivery (sometimes branded Expedite), active around Salt Lake City for corporate catering and large restaurant orders. Payouts visible before accepting; expect physical effort moving catering bags and trays.
- **App:** [Expedite for Drivers](https://play.google.com/store/apps/details?id=app.dlivrd.driver)
- **App sweep note:** Dlivrd's driver app is branded 'Expedite for Drivers'.

### Dolly
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Small moves and large-item delivery. Two roles: Helper (your truck/van/SUV, drive + lift) and Hands (labor only — the relevant role without a truck). Dolly is active in Salt Lake City; you see job details and pay before you commit and keep all tips.
- **App:** No app
- **App sweep note:** No Helper app found on Play; no official APK source found

### DoorDash
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Food, convenience and grocery delivery — Thomas has actually dashed (a Drive folder holds his DoorDash Profit Guide for Salt Lake and Utah County, Dasher Rewards notes and Flash Offers notes), yet DoorDash is not in the Atlas at all. The Wasatch guide deliberately subordinates it: high availability, weak differentiation, tip dependence — filler or bridge cash only.
- **App:** [DoorDash - Dasher](https://play.google.com/store/apps/details?id=com.doordash.driverapp)
- **App sweep note:** Official Dasher/driver app.

### DOT Drug-Test Collection (Bonus)
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Mobile DOT drug-test collections, including observed collections — a boundary decision first
- **App:** No app
- **App sweep note:** Role, not a company; collections are arranged through employers/clinics, no single dominant collector app.

### Draiver
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Drive-away platform moving cars from A to B (dealers, fleets, relocations). Fun if you like driving different cars and stringing long trips together; logistics-heavy and volume is inconsistent — an occasional side quest, not core income.
- **App:** [Draiver for Drivers](https://play.google.com/store/apps/details?id=com.driverdo)
- **App sweep note:** Worker app; 'Draiver Now' (com.draiver.requestor.app) is the customer app.

### Drizly
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Alcohol delivery platform requiring ID verification
- **App:** No app
- **App sweep note:** No official Drizly app in Play search results; Drizly shut down in 2024 and its Play publisher page was not found

### Dropoff
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Same-day courier service for business and healthcare clients
- **App:** No app
- **App sweep note:** No app by Dropoff, Inc. found on Play; search returned only unrelated 'Dropoff' apps by other developers

### Dryver
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Designated-driver service where drivers drive clients in the client's own car
- **App:** [Dryver - Personal Drivers](https://play.google.com/store/apps/details?id=com.bemydd.android)
- **App sweep note:** Package ID supplied/verified from the Play listing seen in the parent run Nov 21

### dscout
- **Category:** Research & Testing
- **Stage:** researching
- **Description:** Paid research platform — diary studies and live interviews for brands
- **Note:** CORRECTION Nov 22, 2026: NOT signed up. The Nov 22 sign-up never submitted — the Cloudflare 'Verify you are human' check failed 4 times (Error 600010). Form left filled (name, US, birthday 10/12/00, Terms ticked, password saved in his Secure Vault) awaiting a human pass of the check, or Thomas signs up on his phone. Note: the form's email field showed tomasdensley@gmail.com (no dot) — same Gmail mailbox; dotted spelling is canonical. Earlier 'signed_up' record was a reporting error by Muse, corrected the same day.
- **App:** [Dscout](https://play.google.com/store/apps/details?id=com.vokal.dscout)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### Dumpling
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Infrastructure to run your own personal-shopping business: you set your service fees and schedule, choose local stores, market yourself, and own the client relationship — the guides' long-term 'own the customer' play ('Tom's white-glove grocery/pharmacy runs'). One-time setup fee plus per-order processing/platform fees.
- **App:** [Dumpling Grocery | Boss](https://play.google.com/store/apps/details?id=us.dumpling.boss)
- **App sweep note:** Boss is the shopper/business-owner app; us.dumpling.grocery is the customer app.

### EatWith
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Platform where home cooks host paid dinner parties/cooking lessons
- **App:** [Eatwith - Food experiences](https://play.google.com/store/apps/details?id=com.vizeat.android)
- **App sweep note:** App and developer verified on Play search pages, but the package ID could not be captured (Play auto-redirect hid the details URL and browser.search was down) — ID still needed, do not guess Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### eBay
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Online marketplace for selling handmade or resold goods, paired in the text with Etsy
- **App:** [eBay online shopping & selling](https://play.google.com/store/apps/details?id=com.ebay.mobile)
- **App sweep note:** Seller functions are in the main eBay app; verified on Play details page

### Etsy
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Marketplace for handmade/vintage goods and digital downloads
- **App:** [Etsy Seller: Manage Your Shop](https://play.google.com/store/apps/details?id=com.etsy.butter.sell_on_etsy)
- **App sweep note:** Dedicated seller app; verified on Play details page

### Eureka Surveys
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Paid survey platform
- **App:** [Eureka: Earn money for surveys](https://play.google.com/store/apps/details?id=com.eureka.android)
- **App sweep note:** Verified on Play details page (developer SocialLoop LLC)

### EXL
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Commercial-inspection buyer in the same inspection function as FAR/Davies; per-assignment economics are private until the fee schedule is disclosed.
- **App:** No app
- **App sweep note:** Only EXL employee apps (EXL Social, Password Self Service by EXLService.com); no field-inspection app

### ezCater Relay
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Catering delivery marketplace pairing drivers with catering orders
- **App:** No app
- **App sweep note:** Play search showed ezCater restaurant/consumer apps only; no ezCater driver/Relay app found

### Facebook Marketplace Selling
- **Category:** Your active gigs
- **Stage:** active
- **Description:** Sell gear and finds locally; answer buyers, meet safely, ship where offered.
- **App:** [Facebook](https://play.google.com/store/apps/details?id=com.facebook.katana)
- **App sweep note:** Marketplace selling is done in the main Facebook app; sellers can also use Meta Business Suite (https://play.google.com/store/apps/details?id=com.facebook.pages.app).

### Fancy Hands
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Virtual assistant micro-task service using contract assistants
- **App:** No app
- **App sweep note:** No official Fancy Hands app on Play (only a third-party 'app advice' app); assistants work via the website

### FAR Inspections
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Property-inspection buyer: short on-site inspections (standard site work advertised as roughly 5-6 minutes) with photo/report submission; one of three buyers in the guide's single 'inspection function' alongside Davies and EXL.
- **App:** No app
- **App sweep note:** No app found; Play search returns only unrelated FAR-named apps

### Fat Llama
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** General item/equipment rental app
- **App:** [Hygglo](https://play.google.com/store/apps/details?id=se.hygglo.android)
- **App sweep note:** Fat Llama rebranded as Hygglo; owners/lenders use the Hygglo app; verified on Play details page

### Favor
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Texas-based errand and food delivery app
- **App:** [Favor Runner: Deliver & Earn](https://play.google.com/store/apps/details?id=com.neighbfav.neighborfavor.runner)
- **App sweep note:** Runner (driver) app, Texas only; verified on Play details page

### Fetch (Fetch Package)
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Package delivery for apartment complexes: centralized package handling, then scheduled drop-offs on tight, localized routes. Scheduled shifts instead of random pings — less flexible, more like a part-time job.
- **App:** [Fetch Delivery Partner](https://play.google.com/store/apps/details?id=com.fetchpackage.fetchretriever)
- **App sweep note:** fetchpackage.com driver app; NOT Fetch Rewards.

### Field Agent
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Turn shopping trips into paid audits: photos, price checks, display checks in stores
- **App:** [Field Agent](https://play.google.com/store/apps/details?id=net.fieldagent)
- **App sweep note:** Play listing verified (1M+ downloads); package ID from the Play listing URL verified earlier in this project.

### Film & TV Background Work
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Be in the scene as a background performer on Utah film and TV productions
- **App:** No app
- **App sweep note:** Role, not a company; background casting runs through multiple agencies/platforms with no single dominant worker app.

### Firefly
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Vehicle-advertising / billboard-on-wheels program listed alongside Carvertise/Nickelytics/Wrapify
- **App:** [Firefly Driver](https://play.google.com/store/apps/details?id=com.fireflyon.android)
- **App sweep note:** Driver app for Firefly car-top advertising screens; verified on Play details page

### Fiverr
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance services marketplace (design, writing, tech, voice)
- **App:** [Fiverr - Freelance Service](https://play.google.com/store/apps/details?id=com.fiverr.fiverr)
- **App sweep note:** Sellers/freelancers use the main app; verified on Play details page

### FlyGuys Drone Work
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Fly commercial drone missions — real estate, construction, inspection — through a national pilot network
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; FlyGuys pilot work is primarily web-portal based.

### FocusGroup.com
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Focus group recruitment for paid feedback sessions
- **App:** No app
- **App sweep note:** No official FocusGroup.com app on Play; participation is web-based

### Food Loop
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Niche region-specific food-delivery app operating mainly in Austin
- **App:** [Food Loop Drivers](https://play.google.com/store/apps/details?id=com.foodloopcartwheel.driver)
- **App sweep note:** Driver app for Food Loop Marketplace; verified on Play details page (reviews allege a subscription is charged to work — caution)

### Forensic Entomology Consultant
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Consult and testify on insect evidence in legal cases
- **App:** No app
- **App sweep note:** Expert consulting role; no platform or worker app.

### Forensic Genealogy
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Trace heirs and family lines for estates and legal cases
- **App:** No app
- **App sweep note:** Professional service/role; no platform or worker app.

### Frayt
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Same-day delivery for retailers and businesses, typically cargo vans/trucks. Business clients and decent per-job payouts; not really optimized for small cars.
- **App:** [FRAYT Driver](https://play.google.com/store/apps/details?id=com.frayt.driverv4)
- **App sweep note:** Driver app for FRAYT freight/delivery

### Free Car Media
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Magnet/partial-wrap car advertising program
- **App:** No app
- **App sweep note:** No official Free Car Media app found on Play; sign-up is web-based

### Freelancer.com
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** General freelance marketplace
- **App:** [Freelancer: Hire & Find Jobs](https://play.google.com/store/apps/details?id=com.freelancer.android.messenger)
- **App sweep note:** Verified on Play details page

### FreshPure / National Water Services
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Retail equipment-service route work (water-equipment servicing in stores); supplies generally provided. The guide counts it as route filler only — 'the assignment is not the economic unit, the route is.'
- **App:** No app
- **App sweep note:** No app found on Play; no official APK source found

### Gearo
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Outdoor gear rental marketplace (kayaks, bikes, camping gear)
- **App:** No app
- **App sweep note:** No official Gearo marketplace app on Play; the 'Gearo' listing found is an unrelated car-maintenance app

### Getaround
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** hourly app-based peer-to-peer car sharing
- **App:** [Getaround](https://play.google.com/store/apps/details?id=com.c4mprod.voiturelib)
- **App sweep note:** Car owners/hosts use the same app; verified via Play publisher search + details page

### Getty Images / iStock
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Stock photo licensing marketplace
- **App:** No app
- **App sweep note:** No official Getty Images or iStock contributor app on Play (only third-party 'hints' apps); contributors use the web portal

### GigPro
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** On-demand shift-work app for hospitality/events/light industrial
- **App:** [Gigpro + Qwick](https://play.google.com/store/apps/details?id=com.gigpro)
- **App sweep note:** GigPro merged with Qwick; worker shift app; verified on Play details page

### GigSmart
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Shift-work marketplace (warehouse, general labor, events). Thomas has actually worked it: the Oct 2026 work plan keeps a GigSmart ZB Designs shift (Harrisville/Ogden, reached by FrontRunner) as the certain option over day-labor dispatch gambles — 'A certain $109 beats an expected ~$65-100.'
- **App:** [GigSmart Get Gigs](https://play.google.com/store/apps/details?id=com.gigsmart.worker)
- **App sweep note:** Worker-side app (separate client app exists)

### Gigwalk
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Micro-task app: visit a store, take shelf photos, check prices, answer short surveys — gap-filler work while already out driving. Usually no background check or MVR review; pays via PayPal or direct deposit.
- **App:** [Gigwalk](https://play.google.com/store/apps/details?id=com.gigwalk)
- **App sweep note:** Single app used by Gigwalkers to find and complete gigs.

### GOMO
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Flexible local delivery app used as a filler between courier routes
- **App:** No app
- **App sweep note:** No verifiable app for this gig on Play; results were unrelated GOMO-branded apps (Singtel telco, DriveGomo)

### Google AdSense
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Ad network paying site/video creators per impression and click
- **App:** No app
- **App sweep note:** No official AdSense app on Play (Google discontinued it); publishers use the AdSense website

### Google Rater Program
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Part-time contractor program rating search results/ads
- **App:** No app
- **App sweep note:** No rater app; Google raters work through the web Rater Hub via vendor platforms (e.g. Appen) — nothing verifiable on Play

### Gopher
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Errand marketplace spanning deliveries, rides, moving, cleaning and yardwork — huge flexibility on job types, still growing, so income depends heavily on local demand. The guides call it a wildcard upside app: install it just to see local demand.
- **App:** [Gopher GO](https://play.google.com/store/apps/details?id=io.gophergoapp.go)
- **App sweep note:** Worker side of the Gopher marketplace; io.gophergoapp.requester is the customer app.

### GoPuff
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Instant-needs delivery (snacks, drinks, household items, sometimes alcohol) from a single micro-warehouse per area instead of multiple restaurants. Operates in Salt Lake County. Alcohol/age-restricted items require drivers 21+; whether drivers are contractors or employees varies by market — check the local listing.
- **App:** [Gopuff Driver](https://play.google.com/store/apps/details?id=com.gopuff.godrive2.live)
- **App sweep note:** Delivery partner app; com.main.gopuff is the customer app.

### GoShare
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Large-item / freight delivery marketplace (box trucks, cargo vans, pickups — plus labor-only Helpers). Sedans are listed under its 'car' options, so the Corolla can take smaller delivery jobs; Thomas's dedicated Drive guide works the sedan angle and the path from solo driver to logistics business owner.
- **App:** [GoShare Driver - Delivery Pros](https://play.google.com/store/apps/details?id=co.goshare.driverapp)
- **App sweep note:** Driver app (also listed as 'GoShare: Drive, Deliver, Earn'); co.goshare.customer is the customer app.

### Grabr
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** International traveler delivery app; get paid to deliver items while traveling
- **App:** [Grabr - Global Shopping](https://play.google.com/store/apps/details?id=io.grabr)
- **App sweep note:** Travelers/shoppers deliver via the same app; verified on Play details page

### Grifols (Biomat USA)
- **Category:** Health & Plasma
- **Stage:** not_started
- **Description:** Paid plasma donation centers in Utah
- **App:** [Grifols Plasma Donor Hub](https://play.google.com/store/apps/details?id=com.mysalesforce.mycommunity.C00D6g000000DEMvEAO.A0OT3p000000CaRIGA0)
- **App sweep note:** plasma — do not recommend (user is afraid of needles); donor app for Grifols/Biomat USA, recorded as fact only; verified on Play details page

### Grubhub
- **Category:** Drive & Courier
- **Stage:** signed_up
- **Description:** Restaurant delivery. Often shows full pay (including tip) and destination upfront, which lets you cherry-pick high-value orders; volume may lag DoorDash/Uber and onboarding can be slow or waitlisted.
- **Note:** Applied — on the waitlist (Thomas, Nov 18, 2026). Thomas doubts Grubhub will exist much longer.
- **App:** [Grubhub for Drivers](https://play.google.com/store/apps/details?id=com.grubhub.driver)
- **App sweep note:** Official driver app.

### Gumroad
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Sell online courses/digital products
- **App:** [Gumroad](https://play.google.com/store/apps/details?id=com.gumroad.app)
- **App sweep note:** Creator/seller app; verified on Play details page

### H&S Loss Control Inspections
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Field inspections at a more specialized level than photo apps — insurance loss control
- **App:** No app
- **App sweep note:** No official H&S Loss Control app on Google Play; inspectors are coordinated via web/email.

### Hampr
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Home-based laundry network on the Poplin model: pick up laundry within your chosen radius, wash/fold at home, return it. Coverage varies by city — check current service areas for Utah and Salt Lake Counties.
- **App:** [washr: Do Laundry, Make Money](https://play.google.com/store/apps/details?id=com.tryhampr.washr)
- **App sweep note:** Worker ('washr') app for hampr; com.hampr is the customer app.

### Handy
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** House cleaning and minor handyman platform (owned by Angi/HomeAdvisor). Salt Lake City has Handy services, especially cleaning; pros pre-set rates through the app. Bring your own cleaning supplies/equipment; Handy takes a noticeable cut and has strict cancellation penalties.
- **App:** [Angi Services for Pros](https://play.google.com/store/apps/details?id=com.handy.portal)
- **App sweep note:** Handy for Pros was rebranded to Angi Services for Pros (same package com.handy.portal); com.handy.handy.prod is the customer booking app.

### Head-Lice Removal Technician
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Remove head lice professionally for families
- **App:** No app
- **App sweep note:** Clinic/franchise service role; no worker-facing gig app.

### HealthRun
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Nationwide medical-courier driver network, Utah agreement/payout unverified in the text
- **App:** No app
- **App sweep note:** No official HealthRun app found on Play; search returned only unrelated courier/health apps

### Hero Home
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Fast-growing local Utah home-improvement company ('Emerging Elite' on a growing-companies list). Outside Sales Representative / door-to-door role with uncapped commission; the doc expects full-time effort for the advertised high earnings but notes a part-time approach may be possible.
- **App:** [Home Hero Pro](https://play.google.com/store/apps/details?id=com.homehero.vendor)
- **App sweep note:** UNCONFIRMED match: brand reads "Home Hero" (words reversed) and developer is Aura App; page describes a pro/vendor app for the Home Hero platform. A second candidate exists ("Home Hero Provider" by My Home Hero, com.dignitestudios.homeheroservice). Found in the Nov 22 gap-fill pass; treat as possible, not settled.

### Hitch
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** City-to-city paid carpool platform
- **App:** [Hitch - Rides between Cities](https://play.google.com/store/apps/details?id=com.hitchtechnologies.hitch)
- **App sweep note:** Drivers 'swipe to drive' in the same app; verified on Play details page

### Holloway Product Testing
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Test products and join consumer-research panels; report what you actually experience
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; no official app known.

### Home Improvement Solutions (Appointment Setter)
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Utah County home-improvement and energy company (Vineyard, UT) hiring Appointment Setters / Canvassers — lead-setting rather than closing, which the source doc notes Thomas called preferable. Offered as full-time, part-time, or contract with a flexible schedule; base pay plus commission and bonuses.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass.

### HONK
- **Category:** Drive & Courier
- **Stage:** signed_up
- **Description:** Roadside-assistance dispatch platform for jump-starts, tire changes, lockouts, fuel
- **Note:** Account CREATED Nov 22, 2026 (owner 114736); Terms + job-contact consent approved by Thomas. Onboarding CANNOT be completed: the partner portal is for TOWING COMPANIES and requires a towing license number — Thomas has no towing business/license (Corolla Hybrid; his business is Sharp House Solutions). Left at account-created stage; nothing invented.
- **App:** [HONK Partner](https://play.google.com/store/apps/details?id=com.honkforhelp.dispatch)
- **App sweep note:** Partner/provider app for towing & roadside operators; verified on Play details page

### HopSkipDrive
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Rideshare-style transport of children to school and activities. NOT currently in Utah — a radar item: if it opens here it is a high-trust, higher-pay niche (deep background check including fingerprinting, minimum 5 years of caregiving experience).
- **App:** [HopSkipDrive CareDriver](https://play.google.com/store/apps/details?id=com.hopskipdrive.driver)
- **App sweep note:** CareDriver worker app; com.hopskipdrive.hsd_android_v2 is the parent/rider app.

### House Sitting & Checking
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Stay in or check homes while owners travel; pet care often included
- **App:** No app
- **App sweep note:** Role, not a company; no single dominant platform app serves this exact role (TrustedHousesitters etc. are separate gigs in the Atlas).

### Humanatic
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Pays per recorded phone call reviewed/audited
- **App:** No app
- **App sweep note:** No official Humanatic app on Play; call reviewing is web-based

### Hyagen Medical
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** 1099 medical-courier listings, extremely part-time, personal vehicle required; may work only when dispatch and return time are paid or mileage is reimbursed.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass (searched "Hyagen Medical" and "Hyagen").

### HyreCar
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** rent your car to gig drivers / rent a car to drive gigs
- **App:** No app
- **App sweep note:** No HyreCar Inc app on Google Play (two probes); the similarly named 'Hyre' app is by Hyre AS, a different Norwegian company. Owners/renters use the web.

### ICON Clinical Research
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Enroll in paid clinical trials with stays, procedures and follow-up visits
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; no participant/worker app confirmed.

### InboxDollars
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** paid surveys and rewards site
- **App:** [InboxDollars](https://play.google.com/store/apps/details?id=com.mentormate.android.inboxdollars)
- **App sweep note:** Member/earner app.

### Independent Fireworks Operator
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Run professional fireworks displays as an independent operator
- **App:** No app
- **App sweep note:** Licensed trade role hired via display companies; no gig platform app.

### Independent Wedding Officiant
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Officiate weddings, including remote-ceremony specializations
- **App:** No app
- **App sweep note:** Independent service role booked via websites/directories; no officiant worker app.

### Infinity Roofing & Siding
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Nationwide storm-restoration roofing company with Utah operations. Independent Roofing Sales Representative — explicitly a 1099 contractor, commission-only role with freedom to create your own schedule; the doc flags its integrity/quality culture and independence model as the fit.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass.

### Instacart
- **Category:** Drive & Courier
- **Stage:** signed_up
- **Description:** Grocery shopping + delivery in batches you shop in-store, then deliver. Earnings hinge on batch choice and shopping speed; ratings gate access to good batches. Status note from the comprehensive guide: Shipt deactivated Thomas on on-time metrics, so Instacart's punctuality rules matter.
- **Note:** Applied — on the waitlist (Thomas, Nov 18, 2026).
- **App:** [Instacart Shopper: Earn money](https://play.google.com/store/apps/details?id=com.instacart.shopper)
- **App sweep note:** Official shopper app.

### Instawork
- **Category:** Your active gigs
- **Stage:** first_job
- **Description:** Shift work — hospitality, warehouse, events — claimed in the app.
- **Note:** One shift worked — went really well; mind-numbingly easy, he enjoyed it, and it cost no gas (Thomas, Nov 18, 2026).
- **App:** [Instawork: Be your own boss](https://play.google.com/store/apps/details?id=com.instaworkmobile)
- **App sweep note:** Worker app for finding shifts; separate Instawork Business app is for employers.

### Invasive Python Removal
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Hunt invasive pythons on designated South Florida land
- **App:** No app
- **App sweep note:** Role under state programs (e.g., Florida python removal); sign-up and reporting are web-based, no official app.

### iSecretShop
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Mystery shopping platform with app-based shop assignments
- **App:** [iSecretShop - Mystery Shopping](https://play.google.com/store/apps/details?id=com.apptivatellc.iSS)
- **App sweep note:** Verified in the Nov 22 live-browser pass.

### italki
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Language tutoring platform where teachers set schedule and rates
- **App:** [italki: learn any language](https://play.google.com/store/apps/details?id=com.italki.app)
- **App sweep note:** Teachers and students use the same app.

### iVueit
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Claim map-based 'Vues', visit the location, take in-app photos, submit for quality review
- **Note:** Filled sign-up packet built Nov 18, 2026 from Thomas's standing application answers (current Drive copy 1JxdM2plTHH6qiv3oSOmKK7r-IDf8Z5PY). No iVueit account or emails exist — fresh sign-up. Sign-up is in the iVueit app only: name, email, mobile number (required). PayPal email now on file (tomas.densley@gmail.com, given by Thomas Nov 18, 2026) — payouts are PayPal-only. Vues pay $7–$50, reviewed in 24–48 hrs; 85%+ rating = Preferred Vuer (6 Vues at once, early access). Optional in-app background check (~$10 reported, unconfirmed) unlocks higher-paying Vues — his consent alone. Awaiting his in-
- **App:** [iVueit: Earn Cash For Surveys](https://play.google.com/store/apps/details?id=com.cynexis.ivueIt)
- **App sweep note:** Play listing verified (100K+ downloads); package ID from the Play listing URL verified earlier in this project.

### Jack Rabbit
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Catering delivery service, in fewer metro areas than DeliverThat
- **App:** [JackRabbit Deliveries (2023)](https://play.google.com/store/apps/details?id=com.jackrabbitdeliveriesmarketplace)
- **App sweep note:** Customer marketplace app; no separate official driver app found on Play.

### JD Roofing
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Utah exterior contractor (residential roofing) based in Mapleton, founded 2021. The fit-profile doc reads the role as a commission-based 1099 contractor position with no base salary and no published commission rate — the trade-off being a smaller company's trust-based autonomy and welcome for self-generated business.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass.

### Jeevz
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Designated-driver / personal chauffeur platform, hourly bookings often in the client's car
- **App:** [Dryver - Personal Drivers](https://play.google.com/store/apps/details?id=com.bemydd.android)
- **App sweep note:** Jeevz service now runs through the Dryver app.

### Jitjatjo
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** On-demand hospitality and events shift-work app
- **App:** No app
- **App sweep note:** No app on Google Play (checked Nov 22); sign-up and shifts run through the website — matches the Nov 21 finding.

### Just Jump USA
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Roadside-services marketplace where the provider sets prices; an acquisition rail to use only after tools, coverage and pricing are solved.
- **App:** No app
- **App sweep note:** No app found on Play

### Kango
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Kids rideshare service in select cities
- **App:** [Kango Driver](https://play.google.com/store/apps/details?id=com.dolightful.kangado.da)
- **App sweep note:** Driver-side app.

### KidCar
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Premium kids transport service, NYC/TLC
- **App:** No app
- **App sweep note:** No KidCar app on Google Play; search returned only kids' games and unrelated carpool apps. Drivers use the web.

### Lab Logistics Medical Courier
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Medical courier work through a nationwide contractor intake
- **App:** [Lab Logistics](https://play.google.com/store/apps/details?id=com.nuvizz.lablogistics)
- **App sweep note:** Courier app for specimen collection/custody/delivery, published by Lab Logistics' platform provider NuVizz.

### Laundry Care
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Home-based laundry network named alongside Hampr in the comprehensive guide, on the same model as Poplin: home provider, chosen-radius pickup, wash/fold, return. Per-bag or per-pound pay structures with possible minimums; coverage varies by city.
- **App:** [Laundry Care](https://play.google.com/store/apps/details?id=com.taplaundry.laundrycare)
- **App sweep note:** Official Laundry Care app (ordering + provider side); verified on Play, package com.taplaundry.laundrycare.

### Lawn Love
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Lawn-care platform connecting independent yard-work pros to homeowners
- **App:** [Lawn Love for Providers](https://play.google.com/store/apps/details?id=com.lawnlove.pros)
- **App sweep note:** Provider-side app.

### Licensed Bail-Recovery Agent
- **Category:** Legal & Enforcement
- **Stage:** not_started
- **Description:** Locate and recover bail clients who missed court
- **App:** No app
- **App sweep note:** Licensed role working for bail bond agencies; no dominant platform app serves it.

### Licensed Equine Dental Provider
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Float horses' teeth as a licensed equine dental provider
- **App:** No app
- **App sweep note:** Specialist veterinary-trade role; no platform or worker app.

### Lime
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** E-scooter/bike charging and rebalancing gigs
- **App:** [Lime Supply](https://play.google.com/store/apps/details?id=com.lime.supply)
- **App sweep note:** Worker app for charger/task work (Charge & Earn).

### Lionbridge
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Microtask / AI data-task platform listed among MTurk/Appen/Prolific
- **App:** [Lionbridge Community Jobs](https://play.google.com/store/apps/details?id=org.lionbridge.LCXBeta)
- **App sweep note:** App for Lionbridge translation/community partners.

### Liveops
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Remote customer-contact work as an independent contractor (programs include tax software, healthcare, sales and support). The guide's #1 remote hedge: it does not fail when fuel prices, weather, vehicle downtime or local route density fail.
- **App:** [MyLiveops - Agent App](https://play.google.com/store/apps/details?id=com.mysalesforce.mycommunity.C00D5w000002CioNEAS.A0OTRO0000005EVO4A2)
- **App sweep note:** Agent community/resources app for Liveops independent-contractor agents

### Lost-Jewelry Recovery
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Find lost rings and jewelry in lawns, snowbanks and shallow water with a metal detector
- **App:** No app
- **App sweep note:** Role/service, not a company; the main network (The Ring Finders) is a web directory with no app.

### Lost-Pet Flyer & Search Service
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Hired lost-pet flyer and search help service
- **App:** No app
- **App sweep note:** Local/role entry, not a platform; no app exists for it. Unrelated lost-pet apps (e.g. PawBoost) are different companies.

### Lugg
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Moving and large-item delivery (furniture, appliances): drivers with trucks and labor-only helpers. Huge hourly upside during jobs and excellent tips, against heavy physical labor and real injury risk.
- **App:** [Lugg Mover](https://play.google.com/store/apps/details?id=com.lugg.worker)
- **App sweep note:** Worker/mover app; separate customer app exists

### Luggage Forward
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** luggage shipping/delivery service
- **App:** No app
- **App sweep note:** No app from the Luggage Forward shipping company on Play; bookings are web-based.

### Lula Drain Cleaning
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Take drain-cleaning assignments through a home-services platform
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; no official worker app confirmed.

### Lyft
- **Category:** Drive & Courier
- **Stage:** earning
- **Description:** Major rideshare competitor to Uber, active in Utah. Running both apps and switching to whichever has demand can significantly increase ride volume; requirements mirror Uber's (4-door car, license, insurance, background check, ~3 minor violations in 3 years max).
- **Note:** Currently works Lyft (Thomas, Nov 18, 2026).
- **App:** [Lyft Driver](https://play.google.com/store/apps/details?id=com.lyft.android.driver)
- **App sweep note:** Official driver app.

### Mach1
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Roadside-assistance provider network onboarding individual providers
- **App:** [Mach1 Provider App](https://play.google.com/store/apps/details?id=com.mach1services.provider)
- **App sweep note:** App for Mach1's roadside-assistance provider network.

### Mapillary Marketplace
- **Category:** Field & Photo
- **Stage:** signed_up
- **Description:** Paid assignments capturing street-level imagery and GPS traces with phone/dashcam
- **Note:** Account CREATED Nov 22, 2026 as username ThomasDensley (tomas.densley@gmail.com); Terms agreed by Thomas. PENDING: Thomas must click the email verification link Mapillary sent. Street-level imagery contribution platform.
- **App:** [Mapillary](https://play.google.com/store/apps/details?id=com.mapillary.app)
- **App sweep note:** Contributors capture and upload street-level imagery with this app.

### Marine Compass Adjuster
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Adjust ships' magnetic compasses and issue deviation cards
- **App:** No app
- **App sweep note:** Niche maritime trade role; no platform or worker app.

### Market Force
- **Category:** Field & Photo
- **Stage:** signed_up
- **Description:** Mystery shopping company
- **Note:** Account CREATED Nov 22, 2026. ShopperID 2734982. Application submitted and Independent Contractor Agreement accepted by Thomas himself (Nov 22). Still his, in-app only, before first assignment: SSN / government photo ID and a payment method (ACH or PayPal). Mystery-shopping platform.
- **App:** [Eyes On Global](https://play.google.com/store/apps/details?id=com.marketforce.eyesonglobal)
- **App sweep note:** Market Force's mystery-shopper app.

### MedZoomer
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** HIPAA-compliant prescription delivery. High hourly potential and meaningful medical work, but limited market coverage — the gig-apps overview says 'if they expand to Utah' — and HIPAA training/compliance is required.
- **App:** [Medzoomer Courier](https://play.google.com/store/apps/details?id=com.revstar.medzoomer)
- **App sweep note:** Official courier app for pharmacy deliveries.

### Meowtel
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Cat-sitting platform: in-home cat visits booked by ZIP. Economics compound through repeat clients inside a deliberately small service radius.
- **App:** [Meowtel: In-Home Cat Sitting](https://play.google.com/store/apps/details?id=com.meowtel.meowmobileapp)
- **App sweep note:** Single app for clients and sitters; sitters manage listings/bookings in it

### Mercari
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Resale marketplace named for book flipping sales
- **App:** [Mercari: Buy and Sell App](https://play.google.com/store/apps/details?id=com.mercariapp.mercari)
- **App sweep note:** Sellers and buyers use the same app.

### Merch by Amazon
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Amazon's invitation print-on-demand T-shirt program
- **App:** No app
- **App sweep note:** No official Merch by Amazon app; the program is web-based. Only third-party tools (Productor, PrettyMerch) exist on Play.

### Metrobi
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Local delivery driving for small businesses (bakeries, florists, etc.) — route-style work where you can become a business's regular driver. Often favors larger vehicles; major-metro focused, so Utah liveness is the open question.
- **App:** [Metrobi Driver](https://play.google.com/store/apps/details?id=com.driver.metrobi)
- **App sweep note:** Driver app for Metrobi delivery

### Mistplay
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** App paying points to play/test mobile games
- **App:** [MISTPLAY: Play to Earn Money](https://play.google.com/store/apps/details?id=com.mistplay.mistplay)
- **App sweep note:** Earner app.

### MOBI
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Mystery shopping and retail audit tasks
- **App:** No app
- **App sweep note:** No official MOBI gig app found on Play (two probes); the name is ambiguous and MOBI's work is web-based.

### MobilAds
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Car wrap advertising network advertising up to $300/month
- **Note:** Nov 21, 2026 (re-run): MobilAds is now GOOD TRAFFIC (mobilads.co redirects to goodtraffic.com; its FAQ: 'GOOD TRAFFIC (formerly mobilads)'). Driver form goodtraffic.com/drivers filled (name, email, phone, Salt Lake City UT, 2024 Toyota Corolla Hybrid, platform Uber — form allows only one). Parked at: car color (not supplied), 'How did you hear about us?', the autodialer consent checkbox, APPLY NOW. Thomas: car color, source answer, consent tick if he agrees, APPLY NOW, then app onboarding + wrapped-car photos. NOTE: this also explains run 1 — the 'Good Traffic' tab stuck at Cloudflare in the f
- **App:** [GOOD TRAFFIC](https://play.google.com/store/apps/details?id=com.mobilads)
- **App sweep note:** MobilAds is now Good Traffic; its official driver app 'GOOD TRAFFIC' is featured on this Play search page (10K+ downloads). Package ID was not exposed in the fetched pages, so the link given is the Play search result that features the app rather than a details URL. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### MobileXpression
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Paid mobile-data panel app paying small monthly rewards
- **App:** [MobileXpression Panel](https://play.google.com/store/apps/details?id=com.mobilexpression.ltvpnb)
- **App sweep note:** Panel member app (Comscore research panel).

### Movement Logistics
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Cargo-van route contract work. The guide REJECTS it without a van: the payout can work only for an already-owned, underused van — 'Do not buy a van for one contract.'
- **App:** No app
- **App sweep note:** No driver app found on Play

### Neighbor
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Rent out spare space (garage, driveway, closet) as self-storage to local renters
- **App:** [Neighbor Storage & Parking](https://play.google.com/store/apps/details?id=com.neighbor.js)
- **App sweep note:** Hosts list and manage their storage/parking space in the same app renters use.

### Nickelytics
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Vehicle-advertising network named with Carvertise and Wrapify in the Wasatch guide's reviewed-not-promoted table: campaign-dependent supplemental revenue, not an income engine.
- **App:** [Nickelytics](https://play.google.com/store/apps/details?id=com.nickelytics.driver)
- **App sweep note:** Driver app for car-wrap advertising campaigns; verified on Play.

### Nielsen Computer & Mobile Panel
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Paid research panel — run Nielsen's app/software and earn rewards for usage data
- **App:** [Nielsen Mobile App](https://play.google.com/store/apps/details?id=com.nielsen.odm)
- **App sweep note:** The panel app; its listing explicitly covers the Nielsen Computer and Mobile Panel.

### NORA Organ Transport
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Drive organ and transplant materials on call — the driving fits; the hiring bar is the catch
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; courier/transport coordination is dispatch-based, no public worker app known.

### Observa
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Micro-earning retail-observation app in the same family as Field Agent and Gigwalk (store visits, photo checks). The Drive guides name it only as a sibling micro-task option next to Shopkick (which leans to points/gift cards).
- **App:** [Observa: Earn Money From Gigs](https://play.google.com/store/apps/details?id=com.observa.observa)
- **App sweep note:** Observer (mystery shopper) app.

### Octapharma Plasma
- **Category:** Health & Plasma
- **Stage:** not_started
- **Description:** Paid plasma donation centers
- **App:** [OctaApp - Donate Plasma](https://play.google.com/store/apps/details?id=com.octapharma.OctaAppV2)
- **App sweep note:** plasma — do not recommend (existence recorded as fact only).

### OfferUp
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Local buy/sell app for flipping and reselling items
- **App:** [OfferUp Buy & Sell Marketplace](https://play.google.com/store/apps/details?id=com.offerup)
- **App sweep note:** Sellers and buyers use the same app.

### OnlineVerdict
- **Category:** Legal & Enforcement
- **Stage:** not_started
- **Description:** Consider real legal disputes in simulated jury exercises and give your verdict and reasoning
- **Note:** Nov 21, 2026: Juror signup form filled by Muse (name, email, address, Salt Lake County, cell, license Yes) in an open tab — not submitted, no save-draft. Awaiting Thomas: DOB, demographic fields, his own e-signature consent checkbox, Register.
- **App:** No app
- **App sweep note:** Web-based mock-juror platform; no Android app known. Not individually verified — browser tools rate-limited (429) mid-batch.

### OnMyWay
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** safe-driving / GPS data monetization rewards app
- **App:** [OnMyWay Safety That Pays](https://play.google.com/store/apps/details?id=com.onmyway.mobi)
- **App sweep note:** Earner app (safe-driving rewards).

### Ozone Odor Removal
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Hired ozone odor-removal service for cars/homes
- **App:** No app
- **App sweep note:** Local service/role entry, not a platform; no app exists for it.

### Paid Research Participation
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Join university laboratory studies as a paid participant
- **App:** No app
- **App sweep note:** Role/category, not a company; served by many separate platforms (Respondent, User Interviews, dscout — each its own Atlas gig).

### Papa Pal
- **Category:** Home, Yard & Assets
- **Stage:** first_job
- **Description:** Companion errands and check-in visits for seniors — companionship, shopping and light help rather than medical transport. Thomas is already waitlisted here (per the comprehensive guide).
- **Note:** Signed up; has worked about 2 jobs. Thomas's read: they don't pay very well, and payout takes a couple of days (Thomas, Nov 18, 2026).
- **App:** [Papa Pal: Find flexible work](https://play.google.com/store/apps/details?id=com.joinpapa.papapal)
- **App sweep note:** Worker (Pal) app; Papa Care is the member app.

### Park City Rides
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Licensed transportation-network company (TNC) for airport/Park City transfers, listed alongside Uber and Lyft at Salt Lake City International Airport. Utah law classifies TNC drivers as independent contractors.
- **App:** No app
- **App sweep note:** No company app found on Play; web/phone booking business

### PARS Vehicle Relocation
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** The long-distance version of moving someone else's car, for a relocation company
- **App:** [PARS Driver 2.0](https://play.google.com/store/apps/details?id=com.pars)
- **App sweep note:** Official driver app for PARS vehicle relocation drivers.

### Patreon
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Creator membership platform — fan subscriptions for content
- **App:** [Patreon](https://play.google.com/store/apps/details?id=com.patreon.android)
- **App sweep note:** Creators and patrons use the same app.

### Peerspace
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Rent out creative/event space by the hour
- **App:** [Peerspace: Unique Event Spaces](https://play.google.com/store/apps/details?id=com.peerspace.app)
- **App sweep note:** Hosts and guests use the same app.

### PeoplePerHour
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance marketplace listed under marketing/creative and freelancing jobs
- **App:** No app
- **App sweep note:** No official PeoplePerHour app on Play (two probes); only third-party 'hints/advice' apps exist. Freelancers use the web.

### PeopleReady JobStack
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Day-labor / temp staffing via the JobStack app — named in the work plan's sign-up list for next week, and its day-labor alternative is the W-2 comparison point against GigSmart's 1099 shift ('a certain $109 beats an expected ~$65-100' from dispatch gambling).
- **App:** [JobStack for Work | Daily Pay](https://play.google.com/store/apps/details?id=org.peopleready.jobstack)
- **App sweep note:** Worker-facing JobStack by PeopleReady; verified on Play.

### Pickup
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Large-item delivery from big-box retailers such as Lowe's/Costco, truck/SUV required — distinct in the text from Point Pickup
- **App:** No app
- **App sweep note:** No Play listing for the PICKUP delivery company (pickupnow) driver app (three probes). The 'Pickup: Driver' listing by Pickup Technologies is pickup.be, an unrelated Belgian rideshare company.

### PigeonShip Courier
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Same-day delivery as an independent courier in a Utah-rooted network
- **App:** [PigeonShip Driver 2.0](https://play.google.com/store/apps/details?id=com.pigeonship)
- **App sweep note:** Official driver/courier app from PigeonShip.

### Pinecone Research
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Paid survey panel
- **App:** [Pinecone Research](https://play.google.com/store/apps/details?id=com.pineconeresearch.app)
- **App sweep note:** Developer account is Oceanside Ten; app name and package match Pinecone Research. Verified in the Nov 22 gap-fill pass.

### Play Octopus
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** In-car entertainment add-on for rideshare: a backseat tablet running games and ads for passengers; you are paid on passenger engagement, ad impressions and tips. Only useful while actively doing rideshare (Uber/Lyft); Thomas has an Octopus driver sign-up form photo in Drive. Earnings modest but truly additive.
- **App:** [Octopus - Driver](https://play.google.com/store/apps/details?id=com.octopus.driver.prod)
- **App sweep note:** Driver app for the Octopus rideshare tablet; verified on Play.

### Pogo
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Data-panel / fuel-cashback app listed as savings/passive data, not counted as an earnings function in the text
- **App:** [Pogo: Earn Cash & Rewards](https://play.google.com/store/apps/details?id=com.pogotech.pogocash)
- **App sweep note:** Verified in the Nov 22 gap-fill pass on the live Play details page.

### Point Pickup
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Retailer delivery app (historically some Walmart and grocery locations): orders claimed one by one. A backup when Spark or Instacart are slow; drivers report cancellations if slightly behind schedule.
- **App:** No app
- **App sweep note:** Point Pickup Driver app (Point Pick-Up Technologies, Inc., com.pointpickup.partner) was removed/unpublished from Google Play in Feb 2025 per AppBrain; no official APK download found.

### Poop Scoop Utah
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Clean dog waste from yards on a recurring route
- **App:** No app
- **App sweep note:** Local pet-waste service company, not an app platform; no worker app expected. Not individually verified — 429 rate limit.

### Poplin Laundry Pro
- **Category:** Home, Yard & Assets
- **Stage:** signed_up
- **Description:** Pick up laundry, wash/fold at home, return it — a local route plus home work
- **Note:** Applied — BANNED over a duplicate-account issue (Thomas, Nov 18, 2026). Not workable unless Poplin lifts the ban.
- **App:** [Poplin for Laundry Pros](https://play.google.com/store/apps/details?id=com.sudshare.sudster)
- **App sweep note:** Dedicated Laundry Pro (worker) app; separate from the customer Poplin app.

### Poshmark
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Clothing resale marketplace
- **App:** [Poshmark: Shop & Sell Fashion](https://play.google.com/store/apps/details?id=com.poshmark.app)
- **App sweep note:** Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Postmates
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Food and retail delivery network, now folded into Uber Eats with residual zones
- **App:** No app
- **App sweep note:** No driver/Fleet app on Google Play anymore (Nov 22 gap-fill pass); only the customer food-delivery app by Uber and an unrelated third-party app remain.

### Premise
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Micro-tasks that widen the view from a shelf to the surrounding city: photos, prices, local data
- **App:** [Premise - Earn Money for Tasks](https://play.google.com/store/apps/details?id=com.premise.android.prod)
- **App sweep note:** Play listing verified on Play search page (10M+ downloads); package ID not captured — 429 rate limit. Do not guess the ID. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Prime Opinion
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Paid survey platform rated above Eureka/InboxDollars/Swagbucks
- **App:** [Prime Opinion](https://play.google.com/store/apps/details?id=com.primeopinion.appname)
- **App sweep note:** Verified in the Nov 22 gap-fill pass on the live Play details page.

### Professional Cuddling
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Paid, clothed, nonsexual consensual closeness, conversation or quiet company
- **App:** No app
- **App sweep note:** Role, not a company; platforms (Cuddlist, Cuddle Comfort) are web-based with no single dominant worker app.

### Professional Game Master
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Run tabletop games professionally for paying players, online
- **App:** No app
- **App sweep note:** Role, not a company; booking platforms such as StartPlaying are web-based with no dominant GM app.

### Prolific
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Online research-study platform connecting participants with studies from universities, companies and brands. Enforces a minimum pay rate of £6/hour or $8/hour; larger studies can pay much more (many users report tasks averaging around $100 for certain larger studies). Payouts via PayPal after submission and approval. Also bookmarked in Thomas's survey-app list.
- **App:** No app
- **App sweep note:** No official app: Play search shows only third-party imitators (e.g. PETWORK ENTERPRISES); Prolific is web-only. Verified by Play search.

### Proxy Auction Bidder
- **Category:** Legal & Enforcement
- **Stage:** not_started
- **Description:** Attend tax-lien auctions and bid exactly to a firm's instructions
- **App:** No app
- **App sweep note:** Role, not a company or platform; no app serves this exact role.

### ProxyPics
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Address-based on-demand photo tasks
- **App:** [ProxyPics](https://play.google.com/store/apps/details?id=com.proxypics.app)
- **App sweep note:** Package ID from the parent agent's verified Google Play check on Nov 21, 2026 (listing confirmed on Play); not re-fetched in this run.

### ProZ
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance translation jobs platform
- **App:** No app
- **App sweep note:** No official app found in the Nov 22 gap-fill pass (searched "ProZ" and "ProZ.com translator"); translators use the website.

### Quiktrak
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Inventory/asset-verification inspection work: 1099, per-inspection, needs a reliable car, smartphone/tablet and daytime availability. No Utah-specific opening or local fee verified — watchlist inside the inspection function.
- **App:** No app
- **App sweep note:** No inspector app found on Play

### Qwick
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Hospitality shift platform (banquets, dishwashing, line cooking, event staffing). The comprehensive guide says Qwick has been active in Utah and sourced workers for Sundance-related hospitality gigs; the work plan could NOT confirm SLC presence and flags a 2022 app-store review warning that onboarding showed example shifts that weren't real. Hospitality vetting required.
- **App:** [Qwick for Professionals](https://play.google.com/store/apps/details?id=com.qwickmobile)
- **App sweep note:** Worker/professional app (not Qwick for Business); verified on Play.

### Rapid Medical
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Fixed-route medical courier work. The Wasatch guide REJECTS it at published terms: the modeled route economics land near $10.95/hour once miles are counted.
- **App:** [Rapid Medical](https://play.google.com/store/apps/details?id=com.rapidmedical.app)
- **App sweep note:** Contractor app ("to be used by contractors that work with companies utilizing Rapid Medical"); developer account is RM Dev Mgmt. Verified in the Nov 22 gap-fill pass.

### Reborn Doll Artist
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Paint and finish hyper-realistic baby dolls for collectors
- **App:** No app
- **App sweep note:** Craft role; dolls are sold through general marketplaces (Etsy, eBay, Reborns.com) with no dedicated artist platform app.

### Red Wagon
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** on-demand moving labor help (customer provides truck)
- **App:** No app
- **App sweep note:** No official app found in the Nov 22 gap-fill pass (searched "Red Wagon delivery" and "Red Wagon").

### Redbubble
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Print-on-demand marketplace for designs on shirts/mugs/stickers
- **App:** No app
- **App sweep note:** No seller/artist app; Redbubble has only a shopper app ("Redbubble - Shop original art", com.redbubble). Checked in the Nov 22 gap-fill pass.

### Reklaim
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** personal data monetization app
- **App:** [Reklaim You](https://play.google.com/store/apps/details?id=com.reklaimyou.app)
- **App sweep note:** Member app for selling/claiming data value

### Reliable Couriers
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Local courier company handling documents, parts and medical deliveries, with dedicated routes
- **App:** No app
- **App sweep note:** No official app found; Play results were unrelated courier companies

### Remote Dream Interpreter
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Niche platforms paying per chat/call for dream interpretation / symbolic analysis for entertainment
- **Note:** Nov 21, 2026 (re-run): Keen advisor application is a Greenhouse job form (keen.com/give-advice → job-boards.greenhouse.io/keen/jobs/5819317004). Muse filled name/email/phone only; parked unsubmitted — remaining questions need Thomas's own answers (guidance experience, topics, methods) plus a bundled background-screening/quiz willingness question and a resume upload. After submitting: Keen account, platform policies, payment & tax info, identity verification, background review, onboarding quiz + call — all Thomas's steps.
- **App:** [Keen Advisor](https://play.google.com/store/apps/details?id=com.ingenio.keen_advisor_app)
- **App sweep note:** Advisor-facing Keen app (gig is the Keen advisor route for psychic/dream-interpretation readings)

### RepRally
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** B2B field-sales platform: sell wholesale CPG orders and the RepRally marketplace to independent stores; the economic object is a store that reorders while your commission stays attached.
- **App:** [RepRally](https://play.google.com/store/apps/details?id=com.reprally.augusta)
- **App sweep note:** Sales-rep app and order tracker for RepRally reps.

### Respondent
- **Category:** Research & Testing
- **Stage:** signed_up
- **Description:** Paid market and UX research studies platform, named inside the Paid Research Participant entry
- **Note:** Account CREATED Nov 22, 2026: sign-up submitted with Thomas's own password (set via secure card) and his yes on the Terms checkbox; Thomas then tapped the email confirmation link himself, so the account is activated. Paid research studies/interviews platform. Next: complete the participant profile so study invitations can match him.
- **App:** No app
- **App sweep note:** No official app; participants use the web platform (only a third-party guide app exists)

### Rev.com
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance transcription, captioning and translation platform
- **App:** [Rev: Transcription & Analysis](https://play.google.com/store/apps/details?id=com.rev.revcorder)
- **App sweep note:** Client-facing app; Rev freelancers/transcriptionists work via the web platform

### RGS Exteriors
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Family-run exterior remodeling contractor in West Jordan, decades in Utah. Outside Sales Representative / Estimator roles (typically W-2 or 1099 with options) with unusually flexible pay structures — commission, base + commission, or a draw — and an explicitly uncapped ceiling.
- **App:** No app
- **App sweep note:** No official app found on Google Play in the Nov 22 gap-fill pass.

### Ridge To Ridge Delivery & Courier Service
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** local delivery and courier company (Utah)
- **App:** No app
- **App sweep note:** No app found for this local courier company

### Ritugo
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Newer Utah-based rideshare platform launched in 2025, positioned as driver-friendly: drivers keep around 70% of each fare. Catch for Thomas: it advertises a clean-MVR requirement — stricter than Uber/Lyft — so with three recent tickets he may not qualify until violations age off; the guide frames it as a medium-term goal.
- **App:** No app
- **App sweep note:** No Google Play listing found for Ritugo; searches surfaced only unrelated apps (Ritgo Netherlands taxi, RideGo).

### Roadie
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Point-to-point delivery marketplace (small packages to large items, retail and Home Depot runs, lost luggage). Two Drive facts define Thomas's status: the comprehensive guide says he was previously rejected, and the Wasatch guide lists 'Roadie access is blocked' as a known blocker — a status problem, not an available channel.
- **Note:** DENIED (Thomas's report, Nov 22, 2026): Roadie rejected Thomas on driving-record grounds. Closed for him — do not suggest reapplying.
- **App:** [Roadie Driver](https://play.google.com/store/apps/details?id=com.roadie.drive.android.app)
- **App sweep note:** Official driver app.

### RoadsideCalls
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Paid-lead service for roadside-assistance providers: the lead cost is known, the close rate is not — prove lead-to-paid-job conversion before buying volume.
- **App:** No app
- **App sweep note:** No RoadsideCalls company app found on Play

### Rocky Mountain Laboratories
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** 1099 medical-courier role with a company vehicle available during shifts — the guide's top medical-logistics pick because a company vehicle shields the contractor from the largest courier cost.
- **App:** No app
- **App sweep note:** No official Google Play app found; courier job postings reference only generic company-provided routing/documentation apps.

### Rover
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Pet boarding, daycare, walking and drop-in visits: you set your own rates and services; Rover handles payments and client acquisition for ~20% of what the client pays. Demand in Utah's urban/suburban areas is healthy (weekday dog walks, travel boarding). Driving record largely irrelevant.
- **App:** [Rover – Pet Sitters](https://play.google.com/store/apps/details?id=com.rover.android)
- **App sweep note:** Single app; sitters/walkers manage their business in the same app pet parents use.

### RubiRides
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Child/senior transport service, D.C. region
- **App:** No app
- **App sweep note:** No official app found on Play

### Safeguard Property Inspection
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Establish whether mortgaged properties are occupied, vacant, abandoned or damaged; photograph and report
- **App:** [Safeguard Mobile](https://play.google.com/store/apps/details?id=com.safeguard.mobile)
- **App sweep note:** Play listing verified on Play search page ('Property inspection app utilized by inspectors/vendors of Safeguard Properties'); package ID not captured — 429 rate limit. Do not guess the ID. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Saucey
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Alcohol delivery platform requiring ID verification
- **App:** [Saucey: Alcohol Delivery](https://play.google.com/store/apps/details?id=com.saucey)
- **App sweep note:** Customer app; no separate courier app found

### Secret Shopper
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** mystery shopping company
- **App:** [Secret Shopper ®](https://play.google.com/store/apps/details?id=com.secretshopper)
- **App sweep note:** Official Sights On Service / secretshopper.com shopper app

### Seek Now
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Roof/property inspection work. The guide REJECTS it for Thomas's current profile: the Provo listing requires a truck/SUV that can carry a 32-foot ladder, general liability and workers comp, LLC documentation, and a HAAG certification path — 'not a Corolla-fit opportunity.'
- **App:** No app
- **App sweep note:** No inspector app found on Play

### SFS
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Retail merchandising contractor projects in Utah; the guide counts it as route filler only — take it when a project is multi-hour or directly on an existing route.
- **App:** No app
- **App sweep note:** No Ship From Store / SFS Inc courier driver app found

### ShareTown
- **Category:** Selling & Creator
- **Stage:** signed_up
- **Description:** Utah program: reps pick up oversized retail returns and resell them
- **Note:** Onboarding started Nov 21, 2026 (application filled by Muse, parked at his steps). Nov 22: Thomas used the emailed login link and reached the onboarding dashboard — ShareTown says there are NO openings in his area right now and he has been added to their WAITLIST (same pattern as WeGoLook). They will contact him when openings appear. Nothing further for him to do. Note: ShareTown moves oversized items and reps usually need a large SUV/truck — his Corolla may not qualify if an opening comes.
- **App:** No app
- **App sweep note:** No official app found; reps use web/other tools

### Shiftsmart
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Shift-work app for retail/merchandising/warehouse gigs
- **App:** [Shiftsmart - Find Work](https://play.google.com/store/apps/details?id=com.shiftsmart.workerapp)
- **App sweep note:** Worker shift app

### Shipt
- **Category:** Drive & Courier
- **Stage:** first_job
- **Description:** Target and other grocery/retail shopping + delivery. Thomas has deep Drive material on it (an 87KB 'Ultimate Guide to Maximizing Your Shipt Earnings in Utah County') — but the comprehensive guide records that Shipt deactivated him for on-time metrics, which is the operative status.
- **Note:** Worked Shipt, then KICKED OFF the platform for frequent late deliveries. It was his second chance and the forgiveness route is closed — a cold hard shutdown; they are not listening to appeals (Thomas, Nov 18, 2026).
- **App:** [Shipt: Shopper and Driver](https://play.google.com/store/apps/details?id=com.shipt.shopper)
- **App sweep note:** Worker app (listing also titled 'Drive and Shop with Shipt'); com.shipt.groceries is the customer app.

### Shopify
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** E-commerce storefront platform for selling your own products
- **App:** [Shopify: Sell. Run a business.](https://play.google.com/store/apps/details?id=com.shopify.mobile)
- **App sweep note:** Seller/merchant app

### Shopkick
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Store-visit/scan rewards app paying points and gift cards for micro-tasks
- **App:** [Shopkick: Rewards Sidekick](https://play.google.com/store/apps/details?id=com.shopkick.app)
- **App sweep note:** Package ID confirmed via APKMirror listing; current version Mar 2026

### Shutterstock
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Stock photo licensing marketplace paying royalties
- **App:** [Shutterstock Contributor](https://play.google.com/store/apps/details?id=com.shutterstock.contributor)
- **App sweep note:** Contributor (seller) app

### SigningOrder
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Loan-signing marketplace listing notary signing agents for title companies
- **App:** No app
- **App sweep note:** No official app found; signing agents use the web platform

### Sinclair Customer Metrics
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** mystery shopping company
- **App:** No app
- **App sweep note:** No own app; mystery shoppers report via the Shopmetrics platform

### Sittercity
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Babysitting platform used by families to find sitters
- **App:** No app
- **App sweep note:** No official app found on Play; sitters use the website

### Skillshare
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Online course platform for creators/teachers
- **App:** [Skillshare: Online Classes App](https://play.google.com/store/apps/details?id=com.skillshare.Skillshare)
- **App sweep note:** Learner-facing app; teachers manage classes via web

### Skillz
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Competitive mobile-gaming platform hosting cash-prize tournaments
- **App:** No app
- **App sweep note:** No single Skillz platform app; Skillz-powered games are separate individual apps

### Skipcart
- **Category:** Drive & Courier
- **Stage:** earning
- **Description:** White-label delivery for restaurants and retailers — the app Thomas has real history with (it supplied his catering experience and the catering bags the Wasatch guide counts as an existing advantage for DeliverThat). Its own Drive field guide stresses the flat-rate model: transparent upfront pay, typically no surge or tip boosts, batching several deliveries per run.
- **Note:** Currently works Skipcart catering orders every once in a while (Thomas, Nov 18, 2026).
- **App:** [Skipcart: Deliver & Earn Money](https://play.google.com/store/apps/details?id=com.skipcart.app.mobile.prod)
- **App sweep note:** Official driver app.

### Snapdocs (Mobile Notary & Signing Agent)
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Notary public + loan-signing-agent work: real-estate closing signings booked through marketplaces like Snapdocs or SigningOrder. The Wasatch guide's framing: Snapdocs is acquisition infrastructure, not the business — the business is the Utah notary commission itself (Utah RON, Atlas #4, is the remote variant).
- **App:** No app
- **App sweep note:** No Snapdocs notary app on Play (only unrelated scanner apps named SnapDoc); signing agents use the web platform

### Sniffspot Host
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Rent your fenced yard by the hour as a private dog park
- **App:** [Sniffspot - Private Dog Parks](https://play.google.com/store/apps/details?id=com.sniffspot)
- **App sweep note:** NOT VERIFIED — browser tools rate-limited (429) before this entry could be checked. Sniffspot likely has an app; this must be re-checked before relying on 'none'. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Society6
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Print-on-demand design marketplace
- **App:** No app
- **App sweep note:** No official app found; artists sell via the website

### Sound-Effect Licensing
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Record clean, usable sound effects — a rope creaking, paper crumpling — and license them
- **App:** No app
- **App sweep note:** Role/activity; sound effects are sold via stock-library websites, no dedicated seller app.

### Speedster
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Smaller B2B courier app for local document and supply delivery
- **App:** [Speedster Driver](https://play.google.com/store/apps/details?id=com.speedsterdriver)
- **App sweep note:** Driver app

### SpotHero
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Parking platform; monetize parking spaces
- **App:** [SpotHero - Find Parking](https://play.google.com/store/apps/details?id=com.spothero.spothero)
- **App sweep note:** Consumer parking app; no host/operator-specific app found

### Stickr
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Rear-window car decal advertising paying monthly gift cards
- **App:** No app
- **App sweep note:** No official app found for the car-advertising Stickr.co

### StowAway
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Peer-to-peer shipping: connect with travelers already going your direction and carry packages along a trip you were making anyway. The 100-mile research ranks it #5 of 5 for long-haul fit — opportunistic money on drives that are already happening; loads may be lighter and volume/income more variable.
- **App:** No app
- **App sweep note:** No Play listing found for StowAway storage in a Play search; web-only.

### StowIt
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** storage space rental marketplace
- **App:** No app
- **App sweep note:** No official app found; storage hosts use the website

### Superior Home Improvement
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Locally owned exterior remodeling company (windows, siding, roofing), 20+ years in Utah, A+ BBB, top-200 exterior remodeler nationally. In-home Outside Sales Representative role: run pre-set appointments as a closer — full-commission at an extremely high payout, with a reputation-for-honesty selling point ('Simply Care More' mission).
- **App:** No app
- **App sweep note:** No official app found in the Nov 22 gap-fill pass; only an unrelated "Superior Home Renovation" app by another developer.

### Superprof
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** online tutoring platform
- **App:** [Superprof | Private lessons](https://play.google.com/store/apps/details?id=com.superprof)
- **App sweep note:** Single app serves both students and tutors

### Survey Junkie
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Survey platform paying users for answering surveys, named inside the Swagbucks entry
- **App:** [Survey Junkie](https://play.google.com/store/apps/details?id=com.survjun)
- **App sweep note:** Paid surveys member app

### Survey Merchandiser
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Store-level audit and merchandising task app, formerly EasyShift
- **App:** [Survey Merchandiser - Gigs](https://play.google.com/store/apps/details?id=iSurvey.Android)
- **App sweep note:** The Play app named Survey Merchandiser is by Survey.com (retail gigs); 'Surveys On The Go' is a separate app by MFour Data Research

### Swagbucks
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Survey and rewards platform paying small amounts for surveys and micro-tasks
- **App:** [Swagbucks Play Games + Surveys](https://play.google.com/store/apps/details?id=com.prodege.swagbucksmobile)
- **App sweep note:** Member rewards app

### Sweatcoin
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Walking/step rewards app
- **App:** [Sweatcoin・Walking Step Counter](https://play.google.com/store/apps/details?id=in.sweatco.app)
- **App sweep note:** Step-to-rewards member app

### Swimply Host
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Rent your swimming pool by the hour
- **App:** [Swimply - Rent Private Pools](https://play.google.com/store/apps/details?id=com.swimply.android)
- **App sweep note:** NOT VERIFIED — browser tools rate-limited (429) before this entry could be checked. Swimply likely has an app; this must be re-checked before relying on 'none'. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Syex
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** On-demand courier and parcel delivery platform
- **App:** No app
- **App sweep note:** No app found; company too obscure to verify any Android app

### Taggr
- **Category:** Legal & Enforcement
- **Stage:** earning
- **Description:** Walk or drive assigned parking lots, scan plates, place tire tags or windshield notices on unauthorized vehicles
- **Note:** Works Taggr regularly — paid once a week (Wednesdays). First shift Oct 10, 2026 paid about $237. EVENTS (researched Nov 18, 2026): there is no event job type or event rate — 'event-based locations' are partnered private lots near venues that flood with violators during games/concerts. Pay is piece rate ($3–$5 per paper notice, $15–$25 per paid Tire Tag), so event money = tag volume. His ~$125/hr is a peak effective rate only (needs ~5 paid tire tags in an hour); Taggr's own SLC page quotes $15–$30/hr typical. No event roster or assignments — self-serve in the app, first-come; enforcement windo
- **App:** No app
- **App sweep note:** Play search for 'Taggr' shows no parking-enforcement app (only unrelated apps: Tagged dating, Taggr Ltd hypnosis); Taggr's agent work appears web-based.

### TakeLessons
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Marketplace connecting music teachers with students
- **Note:** Nov 21, 2026: PLATFORM CLOSED — TakeLessons shut down Nov 15, 2024 (Microsoft). No sign-up exists; no action possible. Atlas replacements: Wyzant, Superprof.
- **App:** No app
- **App sweep note:** CLOSED - TakeLessons shut down in Nov 2024; website offline and no app on Play

### Tapestri
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** location data monetization app
- **App:** No app
- **App sweep note:** No Tapestri app appears in Google Play search results; appears delisted.

### Targeted Goat Grazing
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Clear land with a managed goat herd instead of machines or chemicals
- **App:** No app
- **App sweep note:** Land-management service/role offered by independent operators; no platform app.

### Tarot / Spiritual Reader
- **Category:** Strange Desk & Craft
- **Stage:** not_started
- **Description:** Give paid tarot or spiritual readings through a metered marketplace
- **App:** No app
- **App sweep note:** Role, not a company; readers work through platform websites (Keen, Purple Garden, etc.) and no single dominant reader-side app exists.

### TaskEasy
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Home-services/yard-work platform for independent pros
- **App:** [TaskEasy Contractors](https://play.google.com/store/apps/details?id=com.taskeasy.mobile.beta)
- **App sweep note:** Contractor-side app.

### TaskRabbit (general)
- **Category:** Your active gigs
- **Stage:** active
- **Description:** Handyman, mounting, moving help and seasonal tasks for local clients.
- **App:** [Taskrabbit - Handyman, Errands](https://play.google.com/store/apps/details?id=com.taskrabbit.droid.consumer)
- **App sweep note:** Same single TaskRabbit app used by Taskers and clients.

### TaskRabbit Delivery Hand
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** TaskRabbit's Delivery service line, distinct from general Tasker work: labor-only 'Hands' (no vehicle) vs vehicle 'Helpers' for delivery/moving jobs. Contractors choose tasks and see pay before requesting work; no minimum-hour requirement.
- **App:** [Tasker by Taskrabbit](https://play.google.com/store/apps/details?id=com.taskrabbit.droid.rabbit)
- **App sweep note:** Tasker worker app used for all TaskRabbit tasks including delivery.

### TaskRabbit — Christmas Lights Setup
- **Category:** Your active gigs
- **Stage:** active
- **Description:** Hang Christmas lights for a booked TaskRabbit client.
- **App:** [Taskrabbit - Handyman, Errands](https://play.google.com/store/apps/details?id=com.taskrabbit.droid.consumer)
- **App sweep note:** TaskRabbit runs one app; Taskers (including seasonal lights work) get and manage tasks through this same app.

### Teachable
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Sell online courses
- **App:** [Teachable online courses](https://play.google.com/store/apps/details?id=com.teachable.teachable)
- **App sweep note:** Only official app; learner-facing — no instructor/creator app exists, creators use the web dashboard.

### Teespring
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Print-on-demand shop platform
- **App:** No app
- **App sweep note:** Rebranded 'Spring'; no official creator app on Google Play (checked twice).

### Terraboost Poster Installation
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Install advertising posters/kiosks in stores on an assigned Salt Lake route
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; Terraboost contractor flow so far is ClearCompany web + email (see his Sep-Oct 2026 application), no contractor app confirmed.

### Testlio Freelance Testing
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Test apps and websites in a global freelance network — your phone is part of the kit
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; Testlio testing work is primarily web-platform based.

### TForce Final Mile
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** 1099 final-mile route courier carrier
- **App:** [TForce Trak](https://play.google.com/store/apps/details?id=com.guardianml.android.handset)
- **App sweep note:** Driver/delivery-partner app from TForce's courier arm.

### ThirdChannel
- **Category:** Field & Photo
- **Stage:** not_started
- **Description:** Retail brand-representative program: in-store brand execution visits, roughly monthly per store. Geographic filler to stack onto existing routes, rarely a core income stream alone.
- **App:** [ThirdChannel](https://play.google.com/store/apps/details?id=com.thirdchannel)
- **App sweep note:** Field-agent app for store visit reports; ThirdChannel login required

### Three Brothers LLC
- **Category:** Field Sales & 1099 Sales
- **Stage:** not_started
- **Description:** Home-improvement sales company profiled against JD Roofing: definitively a 1099 commission-only role with qualified leads provided, no cap on earnings, three commission tiers to stack extra money, and a Monthly Success Incentive Bonus. Similar firms pay ~8-12% on company leads (higher for self-generated) — exact Three Brothers percentages are not listed.
- **App:** No app
- **App sweep note:** No official app found in the Nov 22 gap-fill pass; only unrelated apps with similar names.

### Thumbtack
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Lead marketplace for local services: customers post needs (trampoline assembly, painting, DJ, snow removal, holiday-light hanging) and pros respond with quotes. You pay for leads with no guarantee they convert — a client-acquisition channel for a specific skill, not algorithmic dispatch.
- **App:** [Thumbtack for Professionals](https://play.google.com/store/apps/details?id=com.thumbtack.pro)
- **App sweep note:** Pro/worker app; com.thumbtack.consumer is the customer app.

### TikTok
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Short-video creator platform with creator rewards and shop commissions
- **App:** [TikTok - Videos, Shop & LIVE](https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically)
- **App sweep note:** Creators use the main app.

### Time Etc
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Virtual-assistant platform matching VAs with clients
- **App:** No app
- **App sweep note:** Web-based virtual assistant platform; no app found on Google Play.

### Tonquin
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Auto-parts delivery for dealerships and repair shops on regular dispatch routes
- **App:** [Tonquin Delivery Provider App](https://play.google.com/store/apps/details?id=com.tonquin)
- **App sweep note:** Driver/delivery-provider app for auto-parts delivery marketplace.

### ToursByLocals
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Platform connecting travelers with local tour guides
- **Note:** Nov 21, 2026: Guide registration FULLY FILLED by Muse incl. a 125-word guide statement (downtown SLC walking tour from Temple Square) — UNSUBMITTED and not saved; lives in an open browser tab. Awaiting Thomas, in that tab soon: set password, answer 2 questions, accept Terms/Privacy/Cancellation/Guide agreement himself, Submit Application.
- **App:** No app
- **App sweep note:** No app on Google Play (checked twice); guides use the website.

### Traba
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** On-demand staffing app for warehouse, logistics, and hospitality shifts
- **App:** [Traba](https://play.google.com/store/apps/details?id=com.traba.trabaapp)
- **App sweep note:** Worker app; the client-side sibling is Traba Business (com.traba.trabasupervisor)

### Trade Embalmer
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Embalm on contract for funeral homes that need licensed cover
- **App:** No app
- **App sweep note:** Licensed funeral-trade role staffed via agencies/funeral homes; no gig app.

### TranscribeMe
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance transcription platform paying per audio hour
- **App:** [TranscribeMe](https://play.google.com/store/apps/details?id=com.transcribeme.transcriptionapp)
- **App sweep note:** Only official app, but customer-facing (ordering transcription); transcriptionists work via the web portal — no worker app.

### TranslatorsCafe
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance translation jobs platform
- **App:** No app
- **App sweep note:** No official app on Google Play; translators use the website.

### TrustedHousesitters
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** House/pet sitting platform connecting sitters with owners
- **App:** [TrustedHousesitters](https://play.google.com/store/apps/details?id=com.trustedhousesitters.TrustedHousesitters)
- **App sweep note:** Unified app used by sitters and owners.

### TryMyUI
- **Category:** Research & Testing
- **Stage:** researching
- **Description:** Website/app usability testing platform
- **Note:** TryMyUI is dead; successor is QuestionPro UX (ux.questionpro.com). Sign-up attempted Nov 22, 2026: form completed 3x with Thomas's Terms agreement each time, but EVERY submit was rejected by the site's VPN detection ('We have detected that you are using a VPN') on two browser routes — account NOT created (sign-in checks confirm). Password saved in his Secure Vault. Finish = Thomas retries the sign-up from his phone, then stops before the spoken qualification test (his alone).
- **App:** [Trymata Testing](https://play.google.com/store/apps/details?id=com.trymata.testing)
- **App sweep note:** TryMyUI rebranded Trymata under QuestionPro; this is its official paid-tester app.

### Turo
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Peer-to-peer car rental platform; list your car for daily rentals
- **App:** [Turo — Better car rental](https://play.google.com/store/apps/details?id=com.relayrides.android.relayrides)
- **App sweep note:** Hosts list and manage cars in the same main app; no separate host app.

### Twitch
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Livestreaming platform with subscriptions, bits, and ad revenue for creators
- **App:** [Twitch: Live Streaming](https://play.google.com/store/apps/details?id=tv.twitch.android.app)
- **App sweep note:** Streamers broadcast/manage via the main app.

### Uber Eats
- **Category:** Drive & Courier
- **Stage:** earning
- **Description:** Food and convenience delivery on the Uber driver account — no separate sign-up; enable deliveries in the driver app and run them beside rideshare or other apps to cut downtime.
- **Note:** Currently works Uber Eats alongside Uber rideshare (Thomas, Nov 18, 2026).
- **App:** [Uber - Driver: Drive & Deliver](https://play.google.com/store/apps/details?id=com.ubercab.driver)
- **App sweep note:** Uber Eats deliveries run through the Uber Driver app.

### Uber Rideshare
- **Category:** Drive & Courier
- **Stage:** earning
- **Description:** Passenger rideshare on Thomas's keeper Uber account — the comprehensive guide lists Uber as his existing base ('You already drive for Uber'), and Drive holds his Uber Platform Access Agreement (2022), the Rasier Utah City Addendum (2023) and an Uber Rideshare Forecast 2026. Not in the Atlas at all. (Current go-online blocker is the duplicate-account case — account state, not a Drive-research fact.)
- **Note:** Currently works Uber rideshare, and Uber Eats as well (Thomas, Nov 18, 2026).
- **App:** [Uber - Driver: Drive & Deliver](https://play.google.com/store/apps/details?id=com.ubercab.driver)
- **App sweep note:** Same Uber Driver app used for Uber Eats.

### Udemy
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** Online course marketplace; publish a course for passive income
- **App:** [Udemy - Online Courses](https://play.google.com/store/apps/details?id=com.udemy.android)
- **App sweep note:** Main app; no separate instructor app — instructors use the web studio.

### Upshift
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** On-demand shift-work app (hospitality, events, light industrial) grouped with Qwick and GigPro in the comprehensive guide. The work plan's verdict is blunt: 'Not researched — Unverified; skip' — included here because two Drive docs name it, with that status attached.
- **App:** [Upshift - Find flexible shifts](https://play.google.com/store/apps/details?id=com.upshift.androidcustomer)
- **App sweep note:** Worker shift-finding app despite 'customer' in the package name; verified on Play.

### Upwork
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Freelance work marketplace for contract clients
- **App:** [Upwork](https://play.google.com/store/apps/details?id=com.upwork.android.apps.main)
- **App sweep note:** Unified freelancer + client app.

### Urgently
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Roadside-assistance dispatch platform for contractors
- **App:** No app
- **App sweep note:** No official provider/partner app found on Google Play (checked twice); roadside providers are dispatched via partner networks/web.

### User Interviews
- **Category:** Research & Testing
- **Stage:** researching
- **Description:** Paid user interviews and focus group recruitment platform
- **Note:** CORRECTION Nov 22, 2026: NOT signed up. The Nov 22 sign-up never submitted — the Cloudflare 'Verify you are human' check failed on two browser routes ('Security verification unavailable'; page fallback: support@userinterviews.com). Password Thomas set is saved in his Secure Vault; promo-text consent was approved by him but the form was cleared by reloads. Finish options: Thomas signs up on his phone, or retry later. Earlier 'signed_up' record was a reporting error by Muse, corrected the same day.
- **App:** No app
- **App sweep note:** No official app; participants use the website. A same-named app by Direction VsprDevs is unrelated — do not use.

### Userlytics
- **Category:** Research & Testing
- **Stage:** not_started
- **Description:** Website/app usability testing platform
- **App:** [Userlytics - Earn by Testing](https://play.google.com/store/apps/details?id=com.userlytics.recorder)
- **App sweep note:** Official tester app.

### UserTesting
- **Category:** Research & Testing
- **Stage:** signed_up
- **Description:** Use websites, apps and prototypes while thinking aloud about what you notice
- **Note:** Account CREATED Nov 22, 2026 (username TheGlitterPrincess — GlitzyPixie and GlitterPrincess were both taken; Thomas picked TheGlitterPrincess). Password set by Thomas via secure card; updated Privacy Policy accepted on his yes. Remaining step is HIS alone: the spoken practice test, which unlocks paid tests.
- **App:** [UserTesting](https://play.google.com/store/apps/details?id=com.usertesting.recorder.krsna)
- **App sweep note:** Contributor/tester app for taking paid tests.

### USPack
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Contract courier / last-mile route company (medical and retail routes); route-style work with possible longer-term contracts. Named as the operator behind the CBDriver Salt Lake route lead.
- **App:** No app
- **App sweep note:** No driver app found on Play; no official APK source found

### Utah Couriers
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Local Utah courier company taking direct driver applications for medical/legal/document routes
- **App:** No app
- **App sweep note:** Local courier service; no official app found on Google Play.

### Utah Film Utility & Transport
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Day work as production assistant, location assistant, driver or utility crew on film sets
- **App:** No app
- **App sweep note:** Local film-support service, not an app platform; no app expected. Not individually verified — browser tools rate-limited (429) mid-batch.

### Utah Private Ride
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Local SLC/Park City private-ride company, tiered airport/resort transfers
- **App:** No app
- **App sweep note:** Local ride service; no official app found on Google Play.

### Utah Remote Online Notarization
- **Category:** Legal & Enforcement
- **Stage:** not_started
- **Description:** Perform notarizations over video as a commissioned Utah notary with remote certification
- **App:** No app
- **App sweep note:** Role, not a company; no single dominant platform app serves Utah RON work — notaries use assorted platforms (Snapdocs, Nexsys etc.) via web.

### Veho
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** E-commerce parcel-route delivery: pre-booked routes paid per route (not per hour), upfront earnings shown; mid-size sedan or larger. Thomas's account is already accepted but has produced zero offers — the guide classifies this as an account/market-access problem to escalate with support, not a research question.
- **App:** [Veho Driver](https://play.google.com/store/apps/details?id=com.vehotechnologies.Driver)
- **App sweep note:** Driver app for Veho parcel delivery

### Veryable
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Industrial/manufacturing shift marketplace ('Ops') — bid on posted operations shifts. Official Salt Lake market with a named local team contact in the GigSmart work-plan research.
- **App:** [Veryable: Work. Next Day Pay](https://play.google.com/store/apps/details?id=com.veryableops.veryable)
- **App sweep note:** Worker app for on-demand ops

### Veyo
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Non-emergency medical transport (NEMT) for patients going to appointments. Not operating in Utah yet per the guide's source notes; where it operates it typically requires age 21+, ≤2 moving violations in 3 years, insurance, vehicle inspection, short online training and usually CPR certification. Weekday-daytime demand; pay can be lower than regular rideshare.
- **App:** [Veyo Driver](https://play.google.com/store/apps/details?id=com.veyo.driver)
- **App sweep note:** Official driver app for NEMT trips.

### Viator
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Tours and experiences marketplace for local guides
- **App:** [Viator Tours & Attractions](https://play.google.com/store/apps/details?id=com.viator.mobile.android)
- **App sweep note:** Only official app, traveler-facing; tour operators/suppliers manage listings via the web Supplier Portal — no supplier app found.

### VIN Etching / Asset Marking
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Hired vehicle/asset anti-theft VIN etching service
- **App:** No app
- **App sweep note:** A service role, not a platform; no worker app exists (only unrelated VIN-decoder utilities on Play).

### VIPKid
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Online English tutoring for Chinese students
- **App:** [VIPTeacher](https://play.google.com/store/apps/details?id=com.vipkid.app_teacher)
- **App sweep note:** Teacher-side app (VIPKid's teacher platform, now branded VIPTeacher).

### Virtual Tour Guide
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Paid online city/museum tour experiences, live with tips and replay sales
- **App:** No app
- **App sweep note:** A role, not a single platform; no dominant platform app fits exactly.

### VRBO
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Vacation rental listing platform
- **App:** [Vrbo: Vacation Rentals](https://play.google.com/store/apps/details?id=com.vrbo.android)
- **App sweep note:** Hosts manage properties in the main app; the former separate Vrbo Owner app no longer appears on Play.

### Wag!
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** On-demand dog walking: walk requests are pushed to you when nearby. Wag's platform fee is higher than Rover's, so base earnings per walk can be lower, though tips help. Requires a pet-care quiz and background check; traffic tickets don't matter absent animal-related or violent history.
- **App:** [Wag! - Dog Walkers & Sitters](https://play.google.com/store/apps/details?id=com.ionicframework.wagandroid554504)
- **App sweep note:** Single app used by both pet parents and Wag! caregivers/walkers.

### Walmart Spark
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Walmart/Sam's Club grocery and general-merchandise delivery: base pay plus incentives and 100% of customer tips. NB: Spark Driver is Nickolle's account, not Thomas's (standing correction) — this row documents the platform as it appears across his Drive research.
- **Note:** Spark Driver: Nickolle was accepted (her 'busy blocks' in notifications/calendar are hers, not Thomas's shifts). Thomas also applied and was DENIED on driving-record grounds (his report, Nov 22, 2026). Closed for Thomas — do not suggest reapplying.
- **App:** [Spark Driver](https://play.google.com/store/apps/details?id=com.walmart.sparkdriver)
- **App sweep note:** Official Spark Driver app for Walmart deliveries.

### We Geek Together Crew
- **Category:** Events & Performance
- **Stage:** not_started
- **Description:** Work conventions and Renaissance faires for a Utah-rooted traveling merchant
- **App:** No app
- **App sweep note:** Small local crew/service, not an app platform; no app expected. Not individually verified — browser tools rate-limited (429) mid-batch.

### We Pay You Junk Estate Removal
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Clear estates and properties; the model combines removal fees with finding resale value
- **App:** No app
- **App sweep note:** Local junk-removal service, not an app platform; no worker app expected. Not individually verified — 429 rate limit.

### WeGoLook
- **Category:** Field & Photo
- **Stage:** signed_up
- **Description:** Visit sites as a 'Looker' — photograph vehicles, accident scenes, buildings, roofs, businesses; 15–30 min on site
- **Note:** Applied Oct 11, 2026 — account exists; application WAITLISTED (Inspector spots in his area at maximum). WeGoLook will email when an opening lets onboarding continue. Daily email watch set Nov 18, 2026. Filled packet on file (radius 100 mi, full time).
- **App:** [WeGoLook](https://play.google.com/store/apps/details?id=com.wegolook.app)
- **App sweep note:** Play listing verified on Play search page (Looker app, 100K+ downloads); package ID not captured — browser hit a 429 rate limit before the details page could be opened. Do not guess the ID. Package ID verified in the Nov 22 gap-fill pass on the live Play details page.

### Wingz
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Pre-booked scheduled airport rideshare platform
- **App:** [Wingz Driver](https://play.google.com/store/apps/details?id=com.wingz.driver)
- **App sweep note:** Driver app (NEMT trips), verified on its Play details page; distinct from the rider app.

### Wonolo
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** Shift-work app listed as an SLC market, but the work plan's research is skeptical: an SLC reviewer says workers 'VERY RARELY have work/Gigs anymore,' and the app's signup claim was not verified. Indeed's Wonolo salary page puts warehouse associates at $18.36/hr (40 reported salaries).
- **App:** [Wonolo](https://play.google.com/store/apps/details?id=com.wonolodroid)
- **App sweep note:** Worker app; verified on Play.

### Working Solutions
- **Category:** Remote Work
- **Stage:** not_started
- **Description:** Remote customer-contact programs for independent contractors; the guide's backup remote channel behind Liveops.
- **App:** [Working Solutions](https://play.google.com/store/apps/details?id=com.wsol.scheduler)
- **App sweep note:** Agent app for contractor schedules, invoice submission, and contract opportunities

### WorkWhile
- **Category:** Shift Work & Staffing
- **Stage:** not_started
- **Description:** On-demand shift platform also listing full-time jobs
- **App:** [WorkWhile](https://play.google.com/store/apps/details?id=com.workwhilejobs.app)
- **App sweep note:** Worker app for claiming hourly shifts.

### Wrapify
- **Category:** Home, Yard & Assets
- **Stage:** not_started
- **Description:** Car-advertising wraps, the second network in the comprehensive guide's car-ads section (with Carvertise): monthly pay for full or partial ads on your car, campaign-dependent, with strict MVR screening. Thomas is recorded as already pending with both networks.
- **App:** [Wrapify](https://play.google.com/store/apps/details?id=com.wrapify.drive)
- **App sweep note:** Driver app; verified on Play (details page opened, developer Wrapify).

### Wrench
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Mobile mechanic platform
- **App:** [Wrench Technician App](https://play.google.com/store/apps/details?id=com.wrench.app2)
- **App sweep note:** Technician/inspector app for the Wrench platform; login required.

### Wridz
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Small rideshare competitor to Uber/Lyft founded 2022, 22 markets
- **App:** [Wridz](https://play.google.com/store/apps/details?id=com.wridz.app)
- **App sweep note:** Single app for riders and drivers; drivers sign up and work inside it (verified on Play listing)

### Wyzant
- **Category:** Remote Work
- **Stage:** signed_up
- **Description:** Tutoring marketplace where tutors list themselves and set availability
- **Note:** Tutor account CREATED Nov 22, 2026 (username thomas.densley). Preferences entered as Thomas approved, with his correction: students Middle School / High School / College; Piano selected as subject — Go is NOT offered on Wyzant. Stopped at step 2, the 'How Wyzant Works' quiz (his alone). Remaining his steps: quiz, Basic Information, Personalize Profile, Terms for Tutoring, Email Confirmation; SSN in-app only if asked.
- **App:** [Tutor on Wyzant](https://play.google.com/store/apps/details?id=com.wyzant.tutorapp)
- **App sweep note:** Tutor-side app; separate from the student-facing Wyzant app

### YourMechanic
- **Category:** Skilled & Licensed
- **Stage:** not_started
- **Description:** Mobile mechanic platform dispatching mechanics to customers
- **App:** [YourMechanic Mobile Car Repair](https://play.google.com/store/apps/details?id=com.yourmechanic.YourMechanic)
- **App sweep note:** Main company app; no separate technician app found. Verified in the Nov 22 live-browser pass.

### YouTube
- **Category:** Selling & Creator
- **Stage:** not_started
- **Description:** video ad-revenue / creator monetization platform
- **App:** [YouTube](https://play.google.com/store/apps/details?id=com.google.android.youtube)
- **App sweep note:** Creators manage uploads via this app / YouTube Studio. Verified in the Nov 22 live-browser pass.

### Zapmoto Vehicle Delivery
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Move customers' cars to and from dealerships for service
- **App:** No app
- **App sweep note:** Not verified — browser tools rate-limited (429) before this entry could be checked; no official driver app confirmed.

### Zifty
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Restaurant catering and business-lunch delivery in limited cities
- **App:** [Treads Driver](https://play.google.com/store/apps/details?id=com.zifty.TreadsX)
- **App sweep note:** Zifty's driver app is branded Treads Driver (catering delivery)

### Zum
- **Category:** Drive & Courier
- **Stage:** not_started
- **Description:** Children's school/activity transport service drivers join as contractors
- **App:** [Zum Driver](https://play.google.com/store/apps/details?id=com.ridezum.zumdriver)
- **App sweep note:** Driver app for student transportation; separate rider/parent apps exist
