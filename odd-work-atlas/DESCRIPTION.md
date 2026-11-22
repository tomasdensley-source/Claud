# Odd-Work Atlas

## What it is

Odd-Work Atlas is an Android app that holds every gig platform Thomas has found, applied to, or worked: 341 records in one place. Each record has a category, a pipeline stage, status flags, a one-line description, a living note, the verified Google Play link (or "No app"), a money ledger, and any dates that matter.

It runs fully on the phone. There are no accounts, no servers and no sharing. Data stays on the device, with a backup file you control.

## Why it was made

The income comes from many small gigs at once. No single platform is full time. The money is in the portfolio: knowing which gigs are live, which are stuck, which pay best per hour and per mile, and what the next action is on each one.

The old Atlas was a web prototype. This app is the same registry, rebuilt to be used every day on a Galaxy S24 Ultra, which is the only computer in the house.

## What it answers at a glance

- What can I make money on today?
- What is waiting on me?
- What is waiting on them?
- What is each gig actually worth, per hour and per mile, door to door?
- What should I do next?

## How it works

### The five tabs

1. **Today.** Money earned this month. Confirmed dates for the coming week. The Respondent counter (3 applications a day). Gigs you can earn on right now, best paying first. Then "Your move" and "Their move".
2. **Pipeline.** Every gig by stage: Earning, First job done, Active, Signed up, Researching, Not started. Filter by Waiting on me, Waiting on them, Waitlisted, Blocked, Closed.
3. **Queue.** Your ordered apply-or-work-next list. Pinned gigs go first. Drag the handle to reorder. It starts with the Nov 18 Top 10.
4. **Search.** Search every word of every name, category, description, note and next step. Filter by stage, status, app or no app, saved list (Top 10, Top 25) and category. Sort by name, $ per hour, $ per mile, or recently updated.
5. **Money.** Totals for the last 7 days, this month, this year, or all time. Per-gig earnings with $/hr and $/mile, and the best and worst gigs.

The gear on Today opens **More**: the Application profile, Category floors, Backup and Restore.

### A gig's page

Tap any gig to see everything about it: stage, flags, the next step and whose move it is, the app link, a review video link, the money numbers, its floor, its dates, and the full note. One tap to open the app, add a job, add to the queue, pin, change stage or flags, or edit the note.

### The money math

Every job records total pay, hours worked, round-trip drive minutes, and round-trip miles from home (933 E 300 S).

- **Door-to-door $/hr** = pay ÷ (hours worked + drive hours)
- **$/mile** = pay ÷ round-trip miles

A gig's ranking everywhere comes from its own ledger.

### Floors are filters

Set a minimum door-to-door $/hr on a gig, or on a whole category. When a gig earns under its floor, it leaves Today and the queue. It is not shown with a warning; it is just not shown. Shift offers can be checked against the floor with **Check an offer**: an offer under the floor is not saved anywhere. Instawork starts with a $20/hr floor that ends after Dec 25, 2026.

### Rules built in

- **Needle rule.** The four plasma records (BioLife, CSL, Grifols, Octapharma) are kept as records only. They never appear on Today or in the queue and cannot be queued.
- **Closed is closed.** Walmart Spark, Roadie, Poplin, Shipt, DeliverThat and TakeLessons are closed. They stay searchable but leave every active screen. Amazon Flex is blocked (identity theft), not "reapply".
- **Confirmed only.** Only confirmed dates appear on Today. Unconfirmed ones stay on the gig's page.
- **Your actions stay yours.** Background checks, signatures, quizzes and voice tests are tracked as "Your move", never marked done for you.
- **Never stored.** The Application profile keeps standing answers once. Social Security number, license number and bank details are never stored.
- **No Indeed.** The app has no job-board feed. Its world is this Atlas.

### Back button

Back always goes to the previous screen. It closes a sheet or dialog first. From another tab it returns to Today. On Today it asks before closing the app. If you have unsaved edits, it asks before throwing them away.

### Your data

Everything saves on the phone as you go, and a second private copy is written to the app's own files on every change. **More → Save a backup file** writes a JSON file to Documents and opens the share sheet, so you can send it to Drive or email. **Restore from a file** brings it back.

## Design

The look comes from the app icon: a folded map with a dotted route that ends at a gold coin.

- **The route.** A gig's stage is drawn as six stops on a route, filled up to where it is, with a gold coin at the end for Earning. The stage name always sits beside it. Today is laid out as your day's route: On the calendar, then Earn now, then Your move, then Their move.
- **Color.** Light mode always. A pale mint "map paper" background (light, not white), deep atlas-teal ink, and coin gold used only for money. Text is dark, not black. Every text color passes WCAG AA contrast (most above 7:1), and control borders pass 3:1.
- **Type.** Atkinson Hyperlegible Next (Braille Institute, 2025), made for easy reading. 18px body, 1.6 line height, a little extra letter and word spacing, sentence case, no all-caps, italics or underlines, nothing under 15px.
- **Reach.** Following Samsung One UI: big titles sit in the top reading area and fold into a slim bar when you scroll; actions live low, in thumb reach. Gig pages have an action dock (Open app, Add job, Add to queue), and the queue has an "Add a gig" button bottom right.
- **Touch.** Every tap target is at least 48px (Material 3), with space between. Buttons give a small spring squeeze when pressed and turn more square (Material 3 Expressive). Motion is skipped when the phone's "reduce motion" setting is on.
- **Logos.** 271 gigs show the company's real logo: the official Google Play icon where the gig has an app (188), otherwise the logo from the company's own website, checked to be the right company. The other 70 show a designed two-tone monogram: about 45 are kinds of work rather than companies, and the rest are companies whose site is closed, blocked or unconfirmed (list in `data/logos-missing.txt`).

## What is seeded

- All 340 records from Appendix A of the brief, exactly as registered (names, categories, stages, descriptions, notes, app links and sweep notes).
- One added record from section 6.4: CDS (Club Demonstration Services).
- The Nov 22, 2026 live state from section 6: flags, next steps, the ABC Legal court date and training block, the Instawork floor, the Respondent daily cap.
- The Top 10 (Nov 18) as the starting queue, and the Top 10 and Top 25 as saved lists.

## Not yet filled in

The brief's companion files were not attached, so two fields start empty and can be filled on each gig's page:

- **Review video links** (from `gig-directory-2026-11-22.md`).
- **No-skill tier** (from `no-skill-gigs-2026-11-22.md`).

Notes in Appendix A are capped at about 600 characters; the full text lives in the old Atlas.
