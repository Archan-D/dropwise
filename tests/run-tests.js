#!/usr/bin/env node
/* Dropwise tests for the schedule maths, link encoding, calendar export, translations and QR encoder.
   Run from the project folder:  node tests/run-tests.js */
const path = require("path"), root = path.join(__dirname, "..");
global.I18N = require(path.join(root, "js", "i18n.js"));
const DW = require(path.join(root, "js", "core.js"));
const QR = require(path.join(root, "js", "qr.js"));

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch(e){ fail++; console.log("  ✗ " + name + "\n      " + e.message); } };
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || "expected"} ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, msg) => { if (!c) throw new Error(msg || "assertion failed"); };
const make = (s, e = "R", extra = {}) => Object.assign({s, e, sd:"2026-09-30", st:"2026-10-01", iss:"2026-09-30", l:"en", p:"",
  d:DW.PRESETS[s].map(([drug, ph]) => ({drug, eye:e, off:0, phases:ph.map(([f, n]) => ({f, n}))})), u:[], a:[]}, extra);

console.log("Schedule");
test("course length for each preset", () => {
  eq(Object.fromEntries(Object.keys(DW.PRESETS).map(k => [k, DW.horizon(make(k))])), {cataract:28, trab:63, ppv:28, dmek:150, prk:30, lasik:30, custom:28, glaucoma:1});
});
test("cataract day 1: morning, noon, evening and bedtime, three drops each", () => {
  const p = DW.dayPlan(make("cataract"), 0);
  eq(p.slots.map(s => s.t), [480, 720, 1020, 1260]); ok(p.slots.every(s => s.drugs.length === 3));
});
test("clear drops go before milky suspensions", () => {
  const p = DW.dayPlan(make("cataract"), 0), names = p.slots[0].drugs.map(k => p.drops[k].drug);
  eq(names, ["moxi", "ketor", "pred"]);
});
test("cataract taper 4 → 3 → 2 → 1 drops of prednisolone per day", () => {
  const R = make("cataract"), count = i => DW.dayPlan(R, i).slots.filter(s => s.drugs.some(k => R.d[k] && R.d[k].drug === "pred")).length;
  eq([0, 7, 14, 21, 28].map(count), [4, 3, 2, 1, 0]);
});
test("trab week 1: prednisolone every 2 hours while awake (8 doses)", () => {
  const R = make("trab"); eq(DW.dayPlan(R, 0).slots.filter(s => s.drugs.includes(1)).length, 8);
});
test("a taper drops one time of day per step (4 → 3 → 2 → 1)", () => {
  eq(["4","3","2","1"].map(f => DW.TIMES[f].map(t => DW.SLOT_OF[t])), [["morning","noon","evening","bedtime"],["morning","noon","bedtime"],["morning","bedtime"],["morning"]]);
});
test("pill cards and phone text name the cap colour, generic and brand", () => {
  const R = make("cataract", "R", {l:"pa"}), html = DW.pillCardsHTML(R, "pa", true);
  ok(html.includes("ਗੁਲਾਬੀ ਢੱਕਣ") && html.includes("PINK cap") && html.includes("Prednisolone") && html.includes("Pred Forte"), "pill card names");
  const p = DW.dayPlan(R, 0), said = DW.speakDose(R, p, p.slots[0], "en");
  ok(/LIGHT BROWN cap, Moxifloxacin, Vigamox/.test(said) && /PINK cap, Prednisolone, Pred Forte/.test(said), said);
});
test("DMEK steroid continues until told", () => {
  const R = make("dmek"), segs = DW.segments(R);
  ok(DW.hasOngoing(R)); eq(segs[segs.length - 1].b, Infinity); eq(DW.dayPlan(R, 1000).slots.length, 1);
});
test("second-eye course starts on its own day", () => {
  const R = make("cataract"); R.d.push({drug:"moxi", eye:"L", off:14, phases:[{f:"4", n:7}]});
  const has = i => DW.dayPlan(R, i).slots.some(s => s.drugs.includes(3));
  eq([has(13), has(14), has(20), has(21)], [false, true, true, false]); ok(DW.mixedEyes(R));
});
test("usual drops: 'stop' is never scheduled, 'keep' continues indefinitely", () => {
  const R = make("cataract", "R", {u:[{name:"Latanoprost", cap:"teal", act:"L", f:"hs"}, {name:"Timolol", cap:"yellow", act:"stop", f:"2"}]});
  eq(DW.allDrops(R).filter(d => d.usual).length, 1);
  ok(DW.dayPlan(R, 500).slots.some(s => s.t === 1260));
});

console.log("Glaucoma");
const glauc = () => make("glaucoma", "B", {sd:"2026-10-01", st:"2026-10-01", d:[
  {drug:"latan", eye:"B", off:0, phases:[{f:"hs", n:0}]}, {drug:"cosopt", eye:"R", off:0, phases:[{f:"2", n:0}]},
  {drug:"timxe", eye:"L", off:0, phases:[{f:"1", n:0}]}, {drug:"brinz", eye:"L", off:0, phases:[{f:"2", n:0}]}]});
test("glaucoma drops repeat every day with no end", () => {
  const R = glauc(); ok(DW.hasOngoing(R));
  eq(DW.dayPlan(R, 0).slots.map(s => s.t), [480, 1260]); eq(DW.dayPlan(R, 900).slots.map(s => s.t), [480, 1260]);
  eq(DW.segments(R).length, 1); ok(/RRULE:FREQ=DAILY\r\n/.test(DW.buildICS(R, "en")));
});
test("gel-forming drop goes after clear and milky drops", () => {
  const p = DW.dayPlan(glauc(), 0), am = p.slots[0].drugs.map(k => p.drops[k].drug);
  eq(am, ["cosopt", "brinz", "timxe"]);
});
test("glaucoma sheet: 'every day' card, drop information with side effects, glaucoma warnings", () => {
  const R = glauc(), cards = DW.pillCardsHTML(R, "en", false), info = DW.infoHTML(R, "ko", true);
  ok(cards.includes("Every day") && !cards.includes("Until your doctor says to stop"), "every-day card");
  ok(info.includes("Cosopt") && info.includes(DW.T.ko.se.cai) && info.includes(DW.T.ko.se.bb) && info.includes(DW.T.en.se.pga), "side effects");
  const koCards = DW.pillCardsHTML(R, "ko", true); ok(koCards.includes("남색 뚜껑") && koCards.includes("DARK BLUE cap"), "new cap colour");
  ok(!cards.includes('class="eye-head"') && cards.includes('class="badge eye"'), "one card, eye on each bottle");
  eq(DW.warnings(R, "vi")[0], DW.T.vi.warnG); eq(DW.T.ja.tips.glaucoma.length, 4);
});
test("glaucoma plan round-trips through the link and the chart note has no taper", () => {
  const R = glauc(), back = DW.decode(DW.encode(R));
  eq([back.s, back.d.map(d => d.drug + d.eye + d.phases[0].f)], ["glaucoma", ["latanBhs", "cosoptR2", "timxeL1", "brinzL2"]]);
  const note = DW.chartNote(R); ok(note.includes("Glaucoma drops OU") && note.includes("Dorzolamide + timolol (Cosopt) OD: BID") && !note.includes("until told"), note);
});
test("older links still decode: list positions of existing drops and surgeries are unchanged", () => {
  eq(Object.keys(DW.LIB).indexOf("custom"), 17); eq(DW.SURGERIES.map(s => s[0]).indexOf("custom"), 6); eq(DW.CAPS.indexOf("none"), 11);
});

console.log("Link encoding");
test("round trip keeps the whole regimen", () => {
  const R = make("dmek", "L", {p:"604-555-0100", u:[{name:"Xalatan", cap:"teal", act:"R", f:"hs"}], a:[{date:"2026-10-08", time:"09:30"}]});
  R.d.push({drug:"custom", name:"Combigan", cls:"other", form:"sol", eye:"B", off:3, cap:"blue", phases:[{f:"2", n:0}]});
  const back = DW.decode(DW.encode(R));
  eq(DW.encode(back), DW.encode(R));
});
test("custom surgery keeps its name (including non-Latin text) through the link", () => {
  const R = make("custom", "L", {sn:"Pterygium excision", snl:"翼状胬肉切除术", l:"zh-Hans"});
  const back = DW.decode(DW.encode(R));
  eq([back.s, back.sn, back.snl], ["custom", "Pterygium excision", "翼状胬肉切除术"]);
  eq(DW.surgName(back, "zh-Hans"), "翼状胬肉切除术"); eq(DW.surgName(back, "ko"), "翼状胬肉切除术"); eq(DW.surgName({...back, snl:""}, "ko"), "Pterygium excision");
  eq(DW.surgName({...back, sn:"", snl:""}, "ar"), "جراحة العين");
});
test("patient code travels in the link, with or without a custom surgery", () => {
  for (const extra of [{code:"K7M4QX9P"}, {code:"K7M4QX9P", s:"custom", sn:"Ahmed valve", snl:"阿默德阀"}, {s:"custom", sn:"Ahmed valve"}]){
    const R = Object.assign(make(extra.s || "cataract"), extra), back = DW.decode(DW.encode(R));
    eq([back.code, back.sn, back.snl], [extra.code || "", extra.sn || "", extra.snl || ""]);
  }
  ok(DW.chartNote({...make("cataract"), code:"K7M4QX9P"}).includes("Dropwise code: K7M4-QX9P"), "chart note");
});
test("clinic name travels in the link; empty extras add nothing", () => {
  const R = make("cataract", "R", {clinic:"VGH Eye Care Centre", code:"K7M4QX9P"}), back = DW.decode(DW.encode(R));
  eq([back.clinic, back.code], ["VGH Eye Care Centre", "K7M4QX9P"]);
  ok(DW.encode(make("cataract")).split("~").length === 10, "no trailing fields");
});
test("progress counts the dose times marked done", () => {
  const R = make("cataract"), dk = R.st, done = {[dk + "|480"]:1, [dk + "|720"]:1};
  eq(DW.dayProgress(R, 0, done), {total:4, done:2}); eq(DW.dayProgress(R, 1, done), {total:4, done:0});
});
test("damaged links are rejected", () => { eq(DW.decode("not-a-real-link"), null); });

console.log("Calendar file");
const icsLines = ics => ics.split("\r\n");
test("every line is at most 75 bytes and uses CRLF", () => {
  for (const lang of ["en","ar","pa","ja"]){ const ics = DW.buildICS(make("trab", "R", {a:[{date:"2026-10-08", time:""}]}), lang);
    ok(!/[^\r]\n/.test(ics), "bare LF in " + lang); ok(icsLines(ics).every(l => Buffer.byteLength(l) <= 75), "long line in " + lang); }
});
test("alarm titles name cap colour, generic and brand; link has no characters calendars escape", () => {
  const R = make("cataract"), url = "https://x.test/patient.html#r=" + DW.encode(R);
  ok(!/[,;\\]/.test(DW.encode(R)), "link contains , ; or \\");
  const ics = DW.buildICS(R, "zh-Hans", url).replace(/\r\n /g, "");
  ok(ics.includes("SUMMARY:💧 浅棕色瓶盖 Moxifloxacin (Vigamox) → 灰色瓶盖 Ketorolac (Acular) → 粉色瓶盖 Prednisolone (Pred Forte) · 右眼"), "summary");
  ok(ics.includes("URL:" + url), "URL property");
});
test("events open and close, appointments included", () => {
  const ics = DW.buildICS(make("cataract", "R", {a:[{date:"2026-10-08", time:"09:30"}]}), "en");
  eq((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  ok(ics.includes("TRIGGER:-P1D"), "appointment reminder missing");
});
test("repeating doses add up to the full course", () => {
  const R = make("cataract"), ics = DW.buildICS(R, "en").replace(/\r\n /g, "");
  const blocks = ics.split("BEGIN:VEVENT").slice(1);
  let doses = 0; blocks.forEach(b => { const c = b.match(/COUNT=(\d+)/); const n = b.split("SUMMARY:")[1].split("\r\n")[0].split("→").length; doses += (c ? +c[1] : 1) * n; });
  let expected = 0; for (let i = 0; i < 28; i++) DW.dayPlan(R, i).slots.forEach(s => expected += s.drugs.length);
  eq(doses, expected);
});
test("ongoing steroid repeats with no end date", () => {
  const ics = DW.buildICS(make("dmek"), "en"); ok(/RRULE:FREQ=DAILY\r\n/.test(ics));
});

console.log("Translations");
test("every language has every line", () => {
  const keys = Object.keys(I18N.en).filter(k => !k.includes("#"));
  for (const l of Object.keys(I18N)){ const miss = keys.filter(k => !I18N[l][k]); ok(!miss.length, `${l} missing ${miss.slice(0,5).join(", ")}`); }
});
test("placeholders are kept", () => {
  for (const l of Object.keys(I18N)) for (const [k, v] of Object.entries(I18N[l])) if (k.endsWith("#other")) ok(v.includes("{n}"), `${l} ${k}`);
});
test("Arabic plural forms", () => {
  const t = DW.T.ar; eq([t.fq.n(1), t.fq.n(2), t.dur(2), t.dur(5), t.dur(14)], ["مرة واحدة في اليوم", "مرتان في اليوم", "يومان", "5 أيام", "14 يوماً"]);
});
test("languages without plural forms never borrow English", () => { eq(DW.T["zh-Hans"].fq.n(1), "每天1次"); });

console.log("QR code");
test("version grows with the link and finder patterns are present", () => {
  const short = QR.matrix("hi"), long = QR.matrix("https://dropwise.pages.dev/patient.html#r=" + "A".repeat(500));
  eq(short.length, 21); ok(long.length > 60);
  const m = long, n = m.length;
  ok(m[0][0] && m[0][6] && m[6][0] && m[0][n-1] && m[n-1][0], "finder corners");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
