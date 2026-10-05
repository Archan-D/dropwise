# Dropwise

Eye drop schedules in the patient's language: after eye surgery, and for glaucoma.

- **`index.html`** is the clinician builder. Choose the surgery (or glaucoma), eye and language, edit the drops, then print the two-sided patient sheet (Ctrl/Cmd + P).
- **`patient.html`** is the patient's phone page, opened from the QR code on the sheet. It shows the next drops in order, lets the patient tick doses off, adds reminders to the phone's calendar, reads the instructions aloud and can be sent to a family member.

The schedule travels inside the link after the `#`, which browsers never send to the server. "Done" marks stay on the patient's phone. The patient's name prints on the paper sheet only and is never put in the link, QR code or patient code. The only server part is the optional **patient code** lookup (below); everything else works as plain files.

Languages: English, Mandarin (Simplified Chinese), Cantonese (Traditional Chinese, Hong Kong written style), Punjabi (Gurmukhi), Arabic, Korean, Vietnamese and Japanese.

> Default regimens come from published trials and protocols (sources are linked in the builder), not a standard of care. Translations are AI drafts: have each language reviewed by a certified medical translator before patients use the tool (see "Translations" below).

## What the builder does

- **Six surgery presets**: cataract, trabeculectomy, vitrectomy, DMEK, PRK, LASIK. Every drop, taper step and duration can be edited.
- **Glaucoma (daily drops, no taper)**: choose *Glaucoma* in the Surgery list. The drop list then shows the glaucoma drops (prostaglandins, beta-blockers including gel-forming timolol, alpha agonists, carbonic anhydrase inhibitors, pilocarpine, netarsudil and the fixed combinations Cosopt, Combigan, Simbrinza, Azarga, Xalacom, DuoTrav, Ganfort and Rocklatan) plus lubricants. Each drop has an eye and a "how often" (1×, 2×, 3×, 4×, bedtime or as needed) instead of a taper, and starts with its usual frequency (prostaglandins at bedtime). The surgery date, second-eye course and usual-drops sections are hidden. The sheet becomes an information sheet: one "every day" card, a table with each drop's possible side effects, and glaucoma precautions and warning signs on the back.
- **New surgeries**: choose *＋ New surgery*, type its name (and optionally the name in the patient's language), set up the drops and press *Save as a new surgery*. It then appears in the Surgery list on that computer, with general precautions in all eight languages. Export it under *My protocols* to share with your clinic.
- **Per-eye drops and second-eye surgery**: each drop is assigned to the right, left or both eyes and can start on a later day. "Second-eye course" copies the current drops to the other eye starting day 15. When drops differ between eyes, the sheet shows a separate table for each eye.
- **"Until told" steps** for drops that continue indefinitely (the DMEK preset uses this for the last steroid step).
- **The patient's usual drops** (e.g. glaucoma drops), each set to keep using in both eyes, one eye only, or stop.
- **Drop order**: drops due at the same time are listed clear drops first, milky suspensions next, ointments last, with "wait 5 minutes between drops".
- **Brand names, ointments and combination drops**, a custom drop option, and a cap-colour override for generics that don't follow the AAO cap colour code.
- **Every bottle is named three ways**: the cap colour in words in the patient's language (e.g. "PINK cap"), the generic name, and the common brand (e.g. *Prednisolone acetate 1% (Pred Forte)*). The sheet, phone page and alarms all remind patients that cap colours can differ between manufacturers, so the name on the label is what counts.
- **Shapes as well as colours** (circle = antibiotic, square = steroid, diamond = anti-inflammatory, triangle = dilating drop, hexagon = combination, pentagon = usual drop; for glaucoma: pentagon = prostaglandin, upright capsule = beta-blocker, upside-down triangle = alpha agonist, cross = carbonic anhydrase inhibitor, flat capsule = pilocarpine, octagon = netarsudil, hexagon = combination), so the sheet still works on a black-and-white printer.
- **Follow-up appointments**, printed on the sheet, shown on the phone page and added to the calendar with a reminder the day before.
- **Taper editor**: each step shows as a block whose height follows doses per day, so a taper reads like a staircase. Click a block to edit it; quick buttons set common tapers (4→3→2→1 weekly, 4× for 1 week, 4× for 4 weeks).
- **Drug search**: click a drop's name and type part of the generic name, brand, type or cap colour ("pred", "Vigamox", "steroid", "pink").
- **Clinic settings** (its own tab at the top of the panel): clinic name, phone and logo, saved on that computer and printed at the top of every sheet. Until they're set, the patient plan tab shows a reminder. The name and phone also appear on the patient's phone page ("Call Eye Care Centre"). When you load another clinic's patient code, your own clinic details are used.
- **Preview**: switch between the sheet's **Front**, **Back** and the **Patient's phone** page (a live preview that saves nothing). Printing always prints both sides.
- **My protocols**: save your own tapers in the browser, then export/import a file to share them with your clinic. Protocols remember which drops go in the operated eye, so one protocol works for either side.
- **Chart note**: a plain English summary to paste into the EMR or discharge note.
- **Missed-dose instruction**, pictograms for each how-to step, and a "schedule issued" date on every sheet.

## Patient codes (optional)

A patient code (like `K7M4-QX9P`) lets any clinic that uses Dropwise load a patient's plan by typing it in, even if the clinics don't share a chart.

- **Create a code**: in the builder, under *Patient phone page*, press **Create patient code**. The code prints under the QR code, shows on the patient's phone page and goes in the chart note.
- **Load a plan**: at the top of the builder, type the code under **Find a patient's plan** and press **Load**. Typing is forgiving: lower case, spaces, dashes, and O/I/L for 0/1 all work. You can also paste the link from the patient's phone page, which works without the server.
- A code is a **snapshot**. If you change the plan afterwards, the old code is no longer printed; press **Create a new code** for the updated plan.
- Codes are 8 characters (about a trillion possibilities), expire after **2 years**, and store **only the drop plan**: surgery, eye, dates, drops, usual drops, appointments, language and clinic phone. **Never the patient's name.**

### Turning codes on (Cloudflare, free)

Codes need Cloudflare Pages (GitHub Pages can't run the server part). The two small server functions are already in `functions/`; they just need a database:

1. In Cloudflare: **Storage & Databases → KV → Create a namespace**, name it `dropwise-plans`.
2. Open your Pages project → **Settings → Bindings → Add → KV namespace**. Variable name: `PLANS`. Namespace: `dropwise-plans`. Save.
3. Redeploy (Deployments → ⋯ → Retry deployment, or push any commit).
4. Recommended: **Security → WAF → Rate limiting rules**, add a rule for URI path starting with `/api/plan`, for example 20 requests per 10 seconds per IP → Block. This stops anyone trying to guess codes.

Until step 2 is done, the builder says codes aren't set up and suggests pasting the patient's link instead.

### Privacy before real patients

Even without a name, a surgery type, eye and dates are health information to anyone holding the code. Before using codes with real patients, check with your hospital or university privacy office (a privacy impact assessment may be needed, since Cloudflare stores data outside Canada), and add a short privacy notice to the site. The QR code and link work without storing anything, so they're the zero-storage option.

## The printed sheet

One letter page, printed double-sided:
- **Glaucoma**: the front has one **"every day"** pill card (each bottle with its eye) and an **About each drop** table (which eye and possible side effects; combinations list both medicines' effects). The back has how to use drops, glaucoma precautions (use every day, no symptoms, refills, tell every doctor) and glaucoma warning signs. If the front is full, the table moves to the back.
- **Front**: the QR code, then a **pill card** for each taper stage (the layout AHRQ recommends for medication schedules): one row per bottle, four fixed columns for **morning (8 am), noon, evening (5 pm) and bedtime (9 pm)**, the order to use the drops, and each bottle's last day. Then usual drops and appointments.
- **Back**: what each drop is for, how to use drops (with pictures), what to do after a missed dose, precautions for that surgery, warning signs, and the clinic phone number.

Dose times follow the Universal Medication Schedule, and a taper removes one time of day per step: 4 times a day = all four, 3 = morning, noon and bedtime, 2 = morning and bedtime, 1 = morning. Because the columns are fixed, the schedule can't run off the page however many drops there are. Drops every 1–2 hours, or 5–6 times a day, are written out across the row.

The page prints with no browser header or footer (no URL, date or page numbers). If a long schedule doesn't fit, the text shrinks a little, then usual drops and appointments move to the back, then the drug key on the back is left out (the cards already name every bottle). If it still doesn't fit, as with two eyes on different tapers, it flows onto an extra page rather than being cut off, and the builder shows a warning.

**Print settings**: in the print dialog choose **Letter**, **Two-sided (flip on long edge)**, and leave **Margins** on *Default*. If you see a URL or date at the edge, turn off **Headers and footers** under *More settings*.

## The patient phone page

- **Next drops**: the time of day, then each bottle in order with its cap colour, generic and brand name, eye and what it's for, a **Start these drops** button and a "Mark as done" button. **▶** reads exactly those bottles aloud ("Morning, 8 am. Grey cap, Ketorolac, Acular, right eye. Pink cap, Prednisolone, Pred Forte, right eye, shake well…").
- **Step-by-step screen** ("It's time"): one bottle at a time with a large cap-colour mark, the drug name and eye. After each bottle a **5-minute timer** runs before the next one, then the phone chimes and vibrates. The screen stays on while it runs. Calendar alarms open this screen directly.
- **Today's drops**: one row per time of day (morning, noon, evening, bedtime) listing the bottles in order; tap a row when it's done. The card header shows how many dose times are done today.
- **Progress**: "Day 9 of 28" with a bar, and a calendar of day squares (green = all drops done that day).
- **Add reminders to my calendar**: downloads a calendar file with an alarm at every dose time and one the day before each appointment. Each alarm's title is in the patient's language and names the cap colour, generic and brand, and the eye, e.g. *💧 PINK cap Prednisolone (Pred Forte) · Right eye*. The event notes list the order and include a link that opens this page, where the patient taps ▶ to hear the instructions.
- If the patient opens a newer schedule after adding reminders from an older one, the page warns them to delete the old reminders first.
- **Listen to instructions**: plays a recorded file from `audio/<language>/instructions.mp3` if you add one, otherwise the phone's own voice. Cantonese never falls back to a Mandarin voice.
- **Text size** chosen the first time the page opens (normal, large, extra large) and changeable with **Aa Text size**. **Send to a family member**, and offline use once opened.

## Put it online (free)

1. Create a GitHub account and a new repository called `dropwise`.
2. Upload every file and folder, keeping the structure (drag the folder's contents into GitHub's *Add file → Upload files* page).
3. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pick the repository.
   - Framework preset: **None**. Build command: leave empty. Output directory: `/`.
4. Deploy. You'll get an address like `https://dropwise.pages.dev`. Each commit to GitHub redeploys automatically.
5. Optional: buy a domain (e.g. `dropwise.ca`) and add it under the project's **Custom domains** tab.

GitHub Pages also works: repository **Settings → Pages → Deploy from branch → main / root**.

**Whenever you change any file, open `sw.js` and bump `VERSION`** (e.g. `dropwise-v3`) so phones pick up the new copy.

## Translations

All patient-facing text is in **`translations.csv`**: one row per line of text, a column per language, with English beside each. Reviewers can edit it in Excel, Google Sheets or Numbers.

1. Send `translations.csv` to the reviewer for each language.
2. Paste their corrections back into the CSV and save it as **CSV UTF-8**.
3. Run `node tools/csv-to-i18n.js` to rebuild `js/i18n.js`.
4. Run the tests (below), then commit.

Rows ending in `#1`, `#2`, `#few` or `#other` are plural forms (e.g. "once a day" / "twice a day" / "3 times a day"). Keep `{n}` and `{m}` exactly as they are: the app replaces them with numbers. To go the other way (code → CSV), run `node tools/i18n-to-csv.js`.

## Tests

Install [Node.js](https://nodejs.org) once, then from the project folder run:

```
node tests/run-tests.js
node tests/test-api.mjs
```

The first file checks the taper maths for every preset, drop order, second-eye and usual-drop scheduling, link encoding, the calendar file (line lengths, dose totals, open-ended repeats), every language having every line, Arabic plurals and the QR encoder. The second checks the patient-code server functions (creating, looking up, rejecting bad input, no repeats). Run both after any change.

## Test on real phones before a pilot

- [ ] **QR code**: print a sheet and scan it with an iPhone and an Android camera.
- [ ] **Calendar, iPhone**: "Add reminders" should open Calendar's *Add All* screen. Check the alarms ring.
- [ ] **Calendar, Android**: the file downloads. Some phones' Google Calendar won't open it directly; Samsung Calendar and most others do. Note which work.
- [ ] **Read aloud**: try every language. Many iPhones have no Punjabi voice, and Cantonese needs a Cantonese (zh-HK) voice installed. The page says when no voice is available.
- [ ] **Home screen**: add the page to the home screen and reopen it. If it says the link is incomplete, that phone keeps home-screen storage separate; scanning the QR code again from the home-screen app fixes it.
- [ ] **Print**: check both sides on paper, in colour and in black and white.

## Files

`about.html` is the plain-language page describing what Dropwise does, linked from the bar at the top of the builder.

```
index.html             clinician builder
patient.html           patient phone page
translations.csv       all patient-facing text (edit this, then rebuild js/i18n.js)
css/dropwise.css       shared styles
js/i18n.js             generated from translations.csv
js/core.js             drug list, presets, scheduling, link encoding, calendar export, chart note, shared renderers
js/builder.js          builder page
js/patient.js          patient page
js/qr.js               QR code generator (built in, so it works on clinic networks that block CDNs)
functions/api/         server functions for patient codes (run by Cloudflare Pages)
server/codes.js        code format and checks shared by the server functions
tools/                 CSV ⇄ i18n converters
tests/                 automated checks (run-tests.js, test-api.mjs)
sw.js, manifest.webmanifest, icon.*   offline support and home-screen icon
audio/                 optional recorded instructions (see audio/README.md)
```

## Customising

- **Default regimens**: `PRESETS` and `BASIS` in `js/core.js`.
- **Add a drug**: add it to the **end** of `LIB` in `js/core.js`. Links refer to list positions, so only ever add new drugs, caps, frequencies or languages at the end of their lists.
- **Dose times**: `SLOTS` and `TIMES` in `js/core.js` (morning 8 am, noon, evening 5 pm, bedtime 9 pm).

## Sources for the schedule design

- AHRQ, [Explicit and standardized prescription medicine instructions](https://www.ahrq.gov/health-literacy/improve/pharmacy/instructions.html) (Universal Medication Schedule)
- AHRQ, [How to create a pill card](https://www.ahrq.gov/patients-consumers/diagnosis-treatment/treatments/pillcard/index.html)
- NCPDP, [Universal Medication Schedule white paper](https://ncpdp.org/NCPDP/media/pdf/WhitePaper/NCPDP-UMS-WhitePaper201304.pdf)

## Credits

Fonts: Atkinson Hyperlegible (designed for low-vision readers), IBM Plex Mono, Noto Sans Gurmukhi and Noto Naskh Arabic, from Google Fonts.
