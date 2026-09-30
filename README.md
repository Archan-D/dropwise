# Dropwise

Post-operative eye drop schedules in the patient's language.

- **`index.html`** is the clinician builder. Pick the surgery, eye, dates and language, edit the taper, and print the patient sheet (Ctrl/Cmd + P).
- **`patient.html`** is the patient's phone page, opened from the QR code on the sheet. It shows today's drops with "Done" buttons, adds reminders to the phone's calendar, and reads the instructions aloud.

There is **no backend and no database**. The regimen travels inside the link after the `#`, which browsers never send to the server, and "done" marks are saved only on the patient's own phone. The patient's name is never put in the link or QR code.

Languages: English, Mandarin (Simplified Chinese), Cantonese (Traditional Chinese, Hong Kong written style), Punjabi (Gurmukhi), Arabic, Korean, Vietnamese and Japanese.

> **Not yet for clinical use.** Default regimens come from published trials and protocols (sources are linked in the builder), not a standard of care. All translations are AI drafts and must be reviewed by certified medical translators before patients see them.

## Files

```
index.html            clinician builder
patient.html          patient phone page
css/dropwise.css      shared styles
js/core.js            drug list, presets, translations, schedule maths, link encoding, calendar export
js/builder.js         builder page logic
js/patient.js         patient page logic
sw.js                 offline support for the patient page
manifest.webmanifest  lets patients add the page to their home screen
icon.svg, icon-192.png, icon-512.png
audio/                optional recorded instructions (see audio/README.md)
```

## Put it online (free)

1. Create a GitHub account and a new repository called `dropwise`.
2. Upload every file and folder above, keeping the folder structure (drag the whole folder into GitHub's "Add file → Upload files" page).
3. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
   - Framework preset: **None**. Build command: leave empty. Output directory: `/`.
4. Deploy. You get `https://dropwise.pages.dev` (or similar). Every change you commit to GitHub redeploys automatically.
5. Optional: buy a domain (e.g. `dropwise.ca`) and add it under the project's **Custom domains** tab.

GitHub Pages also works: repo **Settings → Pages → Deploy from branch → main / root**.

**When you change any file, open `sw.js` and bump `VERSION`** (e.g. `dropwise-v2`) so phones pick up the new copy.

## Test on real phones before any pilot

These depend on the phone and can't be verified from a computer:

- [ ] **Calendar reminders, iPhone:** tapping "Add reminders" should open Calendar's "Add All" screen. Check that alarms ring.
- [ ] **Calendar reminders, Android:** the `.ics` file downloads. Google Calendar on some phones won't open it directly; Samsung Calendar and most others do. Note which ones work.
- [ ] **Read aloud:** check each language. Many iPhones have no Punjabi voice, and Cantonese needs a Cantonese (zh-HK) voice installed. The page says so when no voice exists instead of reading in the wrong language.
- [ ] **Home screen:** add the patient page to the home screen and reopen it. If it shows "link incomplete", the phone kept its home-screen storage separate from the browser; scanning the QR again from the home-screen app fixes it.
- [ ] **QR code:** print a sheet and scan it with both an iPhone and an Android camera.
- [ ] **Print:** check the sheet on paper, in colour and in black and white.

## Customising

- **Default regimens:** edit `PRESETS` and `BASIS` in `js/core.js`.
- **Add a drug:** add it to `LIB` in `js/core.js` with its class (`antibiotic`, `steroid`, `nsaid`, `cyclo`, `lube`), cap colour (`tan`, `pink`, `gray`, `red`, `none`) and `shake:true` if it's a suspension.
- **Fix a translation:** each language is a block in `T` (and `T2` for the phone-page strings) in `js/core.js`.

## Libraries

- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), loaded from jsDelivr.
- Fonts: Atkinson Hyperlegible (designed for low-vision readers), IBM Plex Mono, Noto Sans Gurmukhi, Noto Naskh Arabic, from Google Fonts.
