/* Dropwise clinician builder: edits the regimen and renders the two-sided patient sheet. */
(() => {
const {LIB,CAPS,CLASSES,FORMS,FREQS,PRESETS,SURGERIES,BASIS,LANGS,T,iso,parse,addDays,esc,L,mark,
  glanceHTML,legendHTML,whenHTML,scheduleHTML,usualHTML,apptHTML,howHTML,listHTML,warnings,fullDate,encode,chartNote} = DW;
const $ = id => document.getElementById(id);
const store = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

const today = new Date(); today.setHours(0,0,0,0);
const S = {s:"cataract", e:"R", sd:iso(today), st:iso(addDays(today,1)), iss:iso(today), startTouched:false, l:"zh-Hans", bi:true, patient:"", p:"", d:[], u:[], a:[], sn:"", snl:"", sel:"cataract", code:"", codeFor:"", clinic:""};
/* Clinic name, phone and logo are saved on this computer and printed on every sheet. The logo stays on paper only. */
const CLINIC = store.get("dw:clinic", {name:"", phone:"", logo:""});
S.clinic = CLINIC.name || ""; S.p = CLINIC.phone || "";
const saveClinic = () => store.set("dw:clinic", CLINIC);
const other = e => e === "R" ? "L" : e === "L" ? "R" : "B";
const fromPreset = k => PRESETS[k].map(([drug, ph]) => ({drug, eye:S.e, off:0, phases:ph.map(([f,n]) => ({f, n}))}));
/* Glaucoma mode: ongoing daily drops with no taper, so each drop has one "how often" and no start day */
const G = () => S.s === "glaucoma";
const G_FREQS = [["1","1×/day · morning"],["2","2×/day · morning + bedtime"],["3","3×/day · morning, noon, bedtime"],["4","4×/day"],["hs","1×/day · bedtime"],["prn","As needed"]];
const defFreq = k => (LIB[k] && LIB[k].def) || (k === "tears" ? "prn" : k === "gel" ? "hs" : "2");
function toGlaucoma(){
  S.u = []; S.d.forEach(d => { const f = (d.phases[d.phases.length - 1] || {}).f;
    d.off = 0; d.phases = [{f:G_FREQS.some(([k]) => k === f) ? f : defFreq(d.drug), n:0}]; });
  if (!S.startTouched) S.st = S.sd; S.sd = S.st;
}
S.d = fromPreset(S.s);

/* The link the QR code opens. Everything after "#" stays in the browser; the patient name is never included. */
/* A patient code is a snapshot: once the plan is edited, the old code no longer matches and isn't printed */
const planKey = () => encode({...S, code:"", iss:S.sd});
const liveCode = () => S.code && S.codeFor === planKey() ? S.code : "";
const patientURL = () => new URL("patient.html", location.href).href.split("#")[0] + "#r=" + encode({...S, code:liveCode()});

/* ---------- Option helpers ---------- */
const opts = (list, sel) => list.map(([k,v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
const capOpts = (sel, auto) => (auto ? `<option value="">Cap: default</option>` : "") + CAPS.map(c => `<option value="${c}"${c === sel ? " selected" : ""}>Cap: ${c === "none" ? "none / clear" : c}</option>`).join("");
const eyeOpts = sel => opts([["R","Right eye"],["L","Left eye"],["B","Both eyes"]], sel);
const drugOpts = sel => Object.entries(LIB).map(([k,v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.name)}${v.brand ? " (" + esc(v.brand) + ")" : ""}</option>`).join("");

/* ---------- Editors ---------- */
/* Taper steps are shown as blocks whose height follows doses per day, so the taper reads like a staircase */
const selStep = new Map();
const FREQ_SHORT = {"1":"1×","2":"2×","3":"3×","4":"4×","5":"5×","6":"6×",q2h:"q2h",q1h:"q1h",hs:"Night",prn:"PRN"};
const FREQ_LABEL = Object.fromEntries(FREQS);
const doses = f => f === "prn" ? 0 : (DW.TIMES[f] || []).length;
const QUICK = {w4:[["4",7],["3",7],["2",7],["1",7]], q1w:[["4",7]], q4w:[["4",28]]};
function taperHTML(d, i){
  const sel = Math.min(selStep.get(i) ?? 0, d.phases.length - 1);
  const blocks = d.phases.map((p, j) => { const h = p.f === "prn" ? 16 : Math.round(16 + Math.min(doses(p.f), 8) / 8 * 44);
    return `<button type="button" class="tb${j === sel ? " sel" : ""}" data-act="selp" data-p="${j}" aria-pressed="${j === sel}" aria-label="Step ${j + 1}: ${FREQ_LABEL[p.f]}, ${+p.n ? p.n + " days" : "until told"}">
      <span class="tb-bar" style="height:${h}px"><b>${FREQ_SHORT[p.f]}</b></span><small>${+p.n ? p.n + " d" : "∞"}</small></button>`; }).join("");
  const p = d.phases[sel], last = sel === d.phases.length - 1, ongoing = !(+p.n);
  return `<div class="taper" role="group" aria-label="Taper steps">${blocks}<button type="button" class="tb add" data-act="addp" aria-label="Add a taper step"><span class="tb-bar"><b>+</b></span><small>step</small></button></div>
    <div class="tedit" data-p="${sel}"><span class="tedit-lbl">Step ${sel + 1}</span>
      <select id="f-${i}" data-f="f" aria-label="How often, step ${sel + 1}">${opts(FREQS, p.f)}</select>
      ${ongoing ? `<span class="muted">until told</span>` : `<input id="n-${i}" type="number" min="1" max="730" data-f="n" value="${p.n}" aria-label="Days, step ${sel + 1}"><span class="muted">days</span>`}
      ${last ? `<label class="ongoing"><input type="checkbox" data-f="ongoing" id="o-${i}"${ongoing ? " checked" : ""}>until told</label>` : ""}
      ${d.phases.length > 1 ? `<button class="x" type="button" data-act="rmp" aria-label="Remove step ${sel + 1}">×</button>` : ""}</div>
    <div class="quick"><span class="muted">Quick:</span><button type="button" class="qchip" data-act="qt" data-q="w4">4→3→2→1 weekly</button><button type="button" class="qchip" data-act="qt" data-q="q1w">4× for 1 week</button><button type="button" class="qchip" data-act="qt" data-q="q4w">4× for 4 weeks</button></div>`;
}
function pickerBtn(d, i){
  const m = DW.meta(d);
  return `<button type="button" class="dpick" id="dp-${i}" data-act="pick" aria-haspopup="listbox" aria-expanded="false" aria-label="Drop ${i + 1}: ${esc(m.name)}. Change">
    ${mark(m.cls, m.cap, 20)}<span class="dp-txt"><b>${esc(d.drug === "custom" ? (d.name || "Other drop") : m.short)}</b>${m.brand ? ` <small>${esc(m.brand)}</small>` : ""}</span><span class="dp-caret" aria-hidden="true">▾</span></button>`;
}
function renderDrops(){
  closePicker();
  $("drops").innerHTML = S.d.map((d, i) => {
    const custom = d.drug === "custom" ? `
      <input type="text" id="nm-${i}" data-f="name" value="${esc(d.name || "")}" placeholder="Drop name, e.g. Combigan" aria-label="Custom drop name">
      <div class="row"><select id="cl-${i}" data-f="cls" aria-label="Type">${opts(CLASSES, d.cls || "other")}</select><select id="fm-${i}" data-f="form" aria-label="Form">${opts(FORMS, d.form || "sol")}</select></div>` : "";
    if (G()){ const f = d.phases[0].f, times = (DW.TIMES[f] || []).map(m => DW.fmtTime("en", m)).join(" · ");
      return `<div class="card" data-i="${i}">
      <div class="card-head">${pickerBtn(d, i)}<button class="x" type="button" data-act="rm" aria-label="Remove this drop">×</button></div>
      ${custom}
      <div class="row"><select id="eye-${i}" data-f="eye" aria-label="Eye">${eyeOpts(d.eye || S.e)}</select>
        <select id="cap-${i}" data-f="cap" aria-label="Cap colour">${capOpts(d.cap || "", true)}</select></div>
      <label class="gfreq">How often<select id="gf-${i}" data-f="gf">${opts(G_FREQS, f)}</select></label>
      ${times ? `<p class="gtimes">Alarms at ${esc(times)}</p>` : ""}
    </div>`; }
    return `<div class="card" data-i="${i}">
      <div class="card-head">${pickerBtn(d, i)}<button class="x" type="button" data-act="rm" aria-label="Remove this drop">×</button></div>
      ${custom}
      <div class="row3">
        <select id="eye-${i}" data-f="eye" aria-label="Eye">${eyeOpts(d.eye || S.e)}</select>
        <select id="cap-${i}" data-f="cap" aria-label="Cap colour">${capOpts(d.cap || "", true)}</select>
        <label style="flex-direction:row;align-items:center;gap:4px;font-size:.78rem;color:var(--muted)">Day<input type="number" id="off-${i}" data-f="off" min="1" max="366" value="${(d.off || 0) + 1}" aria-label="Starts on day"></label>
      </div>
      ${taperHTML(d, i)}
    </div>`; }).join("");
  $("addSecond").disabled = S.e === "B";
}

/* ---------- Drug search: type part of a generic name, brand, type or cap colour ---------- */
const CLASS_LABEL = Object.fromEntries(CLASSES);
const SYN = {pga:"pga prostaglandin glaucoma",bb:"beta blocker glaucoma",aa:"alpha agonist glaucoma",cai:"cai glaucoma",miotic:"miotic glaucoma",rock:"rock rho kinase glaucoma",gcombo:"combination combo glaucoma",lube:"dry eye lubricant"};
const DRUG_LIST = Object.entries(LIB).map(([k, v]) => ({k, v, hay:[v.name, v.brand, v.short, CLASS_LABEL[v.cls], SYN[v.cls] || "", v.cap, v.form === "susp" ? "milky suspension" : v.form === "oint" ? "ointment" : v.form === "gel" ? "gel" : ""].join(" ").toLowerCase()}));
/* In glaucoma mode the list shows glaucoma drops first, then lubricants and "Other" */
const inMode = x => !G() || DW.isGlaucomaDrug(x.k) || x.v.cls === "lube" || x.k === "custom";
let picker = null;
function closePicker(focusBtn){
  if (!picker) return;
  const btn = $("dp-" + picker.i); picker.el.remove(); document.removeEventListener("mousedown", picker.outside, true);
  if (btn){ btn.setAttribute("aria-expanded", "false"); if (focusBtn) btn.focus(); }
  picker = null;
}
function openPicker(i){
  closePicker();
  const card = $("drops").querySelector(`[data-i="${i}"]`), btn = $("dp-" + i);
  const el = document.createElement("div"); el.className = "dpop";
  el.innerHTML = `<input type="search" id="dpq" placeholder="${G() ? "Search: latanoprost, Cosopt, beta-blocker, yellow…" : "Search: pred, Vigamox, steroid, pink…"}" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="dplist" aria-autocomplete="list" aria-label="Search eye drops">
    <ul id="dplist" role="listbox" aria-label="Eye drops"></ul>`;
  card.querySelector(".card-head").after(el);
  btn.setAttribute("aria-expanded", "true");
  picker = {i, el, active:0, items:[], outside:e => { if (!el.contains(e.target) && e.target !== btn && !btn.contains(e.target)) closePicker(); }};
  document.addEventListener("mousedown", picker.outside, true);
  const q = el.querySelector("#dpq"), list = el.querySelector("#dplist");
  const draw = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    picker.items = DRUG_LIST.filter(x => inMode(x) && words.every(w => x.hay.includes(w)))
      .sort((a, b) => G() ? (DW.isGlaucomaDrug(b.k) - DW.isGlaucomaDrug(a.k)) : 0);
    picker.active = Math.min(picker.active, Math.max(0, picker.items.length - 1));
    list.innerHTML = picker.items.length ? picker.items.map((x, n) => `<li role="option" id="dpo-${n}" data-k="${x.k}" aria-selected="${n === picker.active}" class="${n === picker.active ? "on" : ""}">
      ${mark(x.v.cls, x.v.cap, 18)}<span><b>${esc(x.v.name)}</b>${x.v.brand ? ` <span class="brand">${esc(x.v.brand)}</span>` : ""}<small>${esc(CLASS_LABEL[x.v.cls] || "")}${x.v.cap !== "none" ? " · " + x.v.cap + " cap" : ""}</small></span></li>`).join("")
      : `<li class="none">No drops match. Choose "Other (type a name)" to add any drop.</li>`;
    q.setAttribute("aria-activedescendant", picker.items.length ? "dpo-" + picker.active : "");
    const on = list.querySelector(".on"); if (on) on.scrollIntoView({block:"nearest"});
  };
  q.addEventListener("input", () => { picker.active = 0; draw(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown"){ e.preventDefault(); picker.active = Math.min(picker.active + 1, picker.items.length - 1); draw(); }
    else if (e.key === "ArrowUp"){ e.preventDefault(); picker.active = Math.max(picker.active - 1, 0); draw(); }
    else if (e.key === "Enter"){ e.preventDefault(); if (picker.items[picker.active]) chooseDrug(i, picker.items[picker.active].k); }
    else if (e.key === "Escape"){ e.preventDefault(); closePicker(true); }
  });
  list.addEventListener("mousedown", e => { const li = e.target.closest("[data-k]"); if (li){ e.preventDefault(); chooseDrug(i, li.dataset.k); } });
  draw(); q.focus();
}
function chooseDrug(i, k){
  const d = S.d[i]; d.drug = k; d.cap = undefined;
  if (k === "custom"){ d.name = d.name || ""; d.cls = d.cls || "other"; d.form = d.form || "sol"; }
  if (G()) d.phases = [{f:k === "custom" ? d.phases[0].f : defFreq(k), n:0}];
  renderDrops(); renderSheet();
  const focus = k === "custom" ? $("nm-" + i) : $("dp-" + i); if (focus) focus.focus();
}

function renderUsual(){
  const acts = [["B","Keep using, both eyes"],["R","Keep using, right eye only"],["L","Keep using, left eye only"],["stop","Stop, both eyes"]];
  $("usual").innerHTML = S.u.map((u, i) => `<div class="card" data-u="${i}">
    <div class="card-head">${mark("usual", u.cap, 20)}<input type="text" id="un-${i}" data-f="name" value="${esc(u.name)}" placeholder="e.g. Latanoprost (Xalatan)" aria-label="Usual drop name">
      <button class="x" type="button" data-act="rmu" aria-label="Remove this usual drop">×</button></div>
    <div class="row3"><select id="ua-${i}" data-f="act" aria-label="Instruction">${opts(acts, u.act)}</select>
      <select id="uf-${i}" data-f="f" aria-label="How often"${u.act === "stop" ? " disabled" : ""}>${opts(FREQS.filter(([k]) => k !== "prn"), u.f)}</select>
      <select id="uc-${i}" data-f="cap" aria-label="Cap colour">${capOpts(u.cap, false)}</select></div>
  </div>`).join("");
}
function renderAppts(){
  $("appts").innerHTML = S.a.map((a, i) => `<div class="card" data-a="${i}"><div class="card-head">
    <input type="date" id="ad-${i}" data-f="date" value="${a.date}" aria-label="Appointment date">
    <input type="time" id="at-${i}" data-f="time" value="${a.time}" aria-label="Appointment time" style="max-width:8.5em">
    <button class="x" type="button" data-act="rma" aria-label="Remove this appointment">×</button></div></div>`).join("");
}
const surgTitle = p => p.s === "custom" ? (p.sn || "New surgery") : (SURGERIES.find(([k]) => k === p.s) || [,""])[1];
function renderProtos(){
  const list = store.get("dw:protocols", []);
  $("protoList").innerHTML = list.length ? list.map((p, i) => `<option value="${i}">${esc(p.name)} · ${esc(surgTitle(p))}</option>`).join("")
    : `<option value="">No saved protocols yet</option>`;
  $("protoLoad").disabled = $("protoDelete").disabled = !list.length;
  /* Surgery list: built-in surgeries, then the clinician's saved surgeries and protocols, then "New surgery" */
  const surg = SURGERIES.filter(([k]) => k !== "custom" && k !== "glaucoma"), ongoing = SURGERIES.filter(([k]) => k === "glaucoma");
  $("surgery").innerHTML = `<optgroup label="Surgery">${opts(surg, S.sel)}</optgroup><optgroup label="Ongoing drops">${opts(ongoing, S.sel)}</optgroup>`
    + (list.length ? `<optgroup label="My saved surgeries &amp; protocols">${list.map((p, i) => `<option value="p:${i}"${S.sel === "p:" + i ? " selected" : ""}>${esc(p.name)}${p.s !== "custom" ? " (" + esc(surgTitle(p)) + ")" : ""}</option>`).join("")}</optgroup>` : "")
    + `<option value="custom"${S.sel === "custom" ? " selected" : ""}>＋ New surgery (type a name)</option>`;
  $("customFields").hidden = S.s !== "custom";
  $("sn").value = S.sn; $("snl").value = S.snl;
}
function renderBasis(){
  const b = BASIS[S.s];
  $("basis").innerHTML = `<div><strong>Regimen basis.</strong> ${esc(b.txt)}</div>
    ${b.src.length ? `<ul>${b.src.map(([t,u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>` : ""}
    <div>${G() ? "Set each drop, eye and frequency to match the prescription. Save common combinations under My protocols." : "Every surgeon's protocol differs. Edit the drops to match yours and save them under My protocols."}</div>`;
}

/* ---------- Glaucoma mode: hide the taper tools, surgery date, second-eye course and usual drops ---------- */
function renderMode(){
  const g = G();
  $("usualSet").hidden = g; $("addSecond").hidden = g; $("sdateLbl").hidden = g;
  $("dateRow").classList.toggle("one", g);
  $("startTxt").textContent = g ? "Start date" : "Drops start";
  $("dropsLegend").textContent = g ? "Glaucoma drops" : "Drops & taper";
  $("dropsHint").textContent = g ? "Each drop continues every day until the doctor changes it. Drops due at the same time go in the order shown, 5 minutes apart." : 'Tick "until told" on a last step for drops that continue indefinitely.';
  $("eyeSeg").setAttribute("aria-label", g ? "Eye to treat" : "Operated eye");
  $("clinicHint").hidden = !!(CLINIC.name || CLINIC.phone);
  $("fitWarn").textContent = g ? "This sheet is too long for one page and will print on an extra sheet. Turning off English under each line makes it shorter."
    : "This schedule is too long for one page and will print on an extra sheet. Consider splitting the second-eye course onto its own sheet.";
}

/* ---------- Sheet ---------- */
function renderSheet(o = {}){
  const {extrasBack = false, legend = true, infoBack = false, infoStay = false} = o, g = G();
  const lang = S.l, bi = S.bi && lang !== "en", t = T[lang], lb = fn => L(lang, bi, fn);
  S.iss = iso(new Date());
  const [warn, warnEn] = warnings(S, lang);
  const code = liveCode();
  let qr = ""; try { qr = QR.svg(patientURL(), 2); } catch(e){}
  const usual = g ? "" : usualHTML(S, lang, bi), appts = apptHTML(S, lang), eye = DW.shownEye(S);
  const info = g ? `<section class="s-sec"><h3>${lb(x => x.gInfoT)}</h3>${DW.infoHTML(S, lang, bi)}</section>` : "";
  const front = $("front"), back = $("back");
  [front, back].forEach(p => { p.lang = lang; p.dir = lang === "ar" ? "rtl" : "ltr"; });

  const clinicLine = CLINIC.logo || S.clinic || S.p ? `<div class="clinic-line">${CLINIC.logo ? `<img src="${CLINIC.logo}" alt="">` : ""}${S.clinic ? `<b>${esc(S.clinic)}</b>` : ""}${S.p ? `<span class="phone-num">${esc(S.p)}</span>` : ""}</div>` : "";
  front.innerHTML = `${clinicLine}
    <header class="s-head">
      <h2>${lb(x => g ? x.gTitle : x.title)}</h2>
      <div class="head-right">
        <div class="eye-badge">${lb(x => x[eye])}<small>${{R:"OD",L:"OS",B:"OU"}[eye]} · ${lb(x => g ? x.treatEye : x.operated)}</small></div>
        <div class="qr-box"><div><p>${lb(x => x.qrT)}</p>${code ? `<p class="code-line">${lb(x => x.codeLabel)}<b>${esc(DW.prettyCode(code))}</b></p>` : ""}</div>${qr ? `<div class="qr" role="img" aria-label="QR code">${qr}</div>` : ""}</div>
      </div>
    </header>
    <dl class="meta${g ? " m4" : ""}">
      <div><dt>${lb(x => x.patient)}</dt><dd>${esc(S.patient)}</dd></div>
      <div><dt>${lb(x => g ? x.condition : x.surgery)}</dt><dd>${DW.surgLabel(S, lang, bi)}</dd></div>
      ${g ? "" : `<div><dt>${lb(x => x.surgeryDate)}</dt><dd>${esc(DW.shortDate(lang, parse(S.sd)))}</dd></div>`}
      <div><dt>${lb(x => x.startDate)}</dt><dd>${esc(DW.shortDate(lang, parse(S.st)))}</dd></div>
      <div><dt>${lb(x => x.issued)}</dt><dd>${esc(DW.shortDate(lang, parse(S.iss)))}</dd></div>
    </dl>
    <section class="s-sec"><h3>${lb(x => x.whenT)}</h3>${DW.pillCardsHTML({...S, u:[]}, lang, bi)}</section>
    ${infoBack ? "" : info}
    ${(usual || appts) && !extrasBack ? `<div class="bottom">
        ${usual ? `<section class="s-sec"><h3>${lb(x => x.usualT)}</h3>${usual}</section>` : ""}
        ${appts ? `<section class="s-sec"><h3>${lb(x => x.apptT)}</h3>${appts}</section>` : ""}
    </div>` : ""}
    <p class="turn">${lb(x => x.turnOver)} ↻</p>`;

  back.innerHTML = `
    ${infoBack ? info : ""}
    ${(usual || appts) && extrasBack ? `<div class="bottom">
        ${usual ? `<section class="s-sec"><h3>${lb(x => x.usualT)}</h3>${usual}</section>` : ""}
        ${appts ? `<section class="s-sec"><h3>${lb(x => x.apptT)}</h3>${appts}</section>` : ""}
    </div>` : ""}
    ${legend && !g ? `<section class="s-sec"><h3>${lb(x => x.glance)}</h3>${legendHTML(S, lang, bi)}</section>` : ""}
    <section class="s-sec"><h3>${lb(x => x.howT)}</h3>${howHTML(S, lang, bi)}</section>
    <p class="missed">${lb(x => x.missed)}</p>
    <section class="s-sec"><h3>${lb(x => x.tipsT)}</h3><ul class="tips">${listHTML(t.tips[S.s], T.en.tips[S.s], bi, lang)}</ul></section>
    <section class="s-sec warn"><h3>${lb(x => x.warnT)}</h3><ul>${listHTML(warn, warnEn, bi, lang)}</ul></section>
    <footer class="s-foot">
      <div>${lb(x => x.bring)}</div>
      <div>${S.clinic ? lb(x => x.callNamed.replace("{n}", S.clinic)) : lb(x => x.footQ)} <span class="phone-num">${S.p ? esc(S.p) : "________________"}</span></div>
    </footer>
    <div class="brandline">Dropwise · ${esc(S.iss)}</div>`;

  $("note").value = chartNote({...S, code});
  const out = $("codeOut");
  out.hidden = !S.code; out.classList.toggle("stale", !!S.code && !code);
  out.textContent = code ? DW.prettyCode(code) : S.code ? `The plan changed after code ${DW.prettyCode(S.code)} was made, so it isn't printed. Create a new code for the updated plan.` : "";
  $("codeMake").textContent = code ? "Create a new code" : "Create patient code";
  $("openPatient").href = patientURL();
  schedulePhone();
  /* If the front only fits at the smallest text size, move usual drops and appointments to the back instead of shrinking further */
  const lv = fitPages();
  if (!extrasBack && (usual || appts) && lv.front >= 3) return renderSheet({...o, extrasBack:true});
  /* Glaucoma: if the front still overflows, the drop information moves to the back, unless that makes the back overflow instead */
  if (g && !infoBack && !infoStay && lv.front > 3) return renderSheet({...o, infoBack:true});
  if (g && infoBack && lv.back > 3) return renderSheet({...o, infoBack:false, infoStay:true});
  /* The drug key on the back repeats what the cards already say, so it's the first thing to go when the back is full */
  if (legend && !g && lv.back >= 3) return renderSheet({...o, legend:false});
}

/* Shrink the text until each side fits one letter page (11in at 96px/in, measured at print width). Never clips: if it still
   doesn't fit at the smallest size, it prints on an extra page and the clinician sees a warning. */
const PAGE_PX = 11 * 96 - 4;
function fitPages(){
  let over = false; const levels = {};
  ["front","back"].forEach(id => {
    const page = $(id), probe = page.cloneNode(true);
    probe.removeAttribute("id"); probe.classList.add("measure"); document.body.appendChild(probe);
    let level = 0;
    for (; level <= 3; level++){
      probe.classList.remove("fit1","fit2","fit3"); if (level) probe.classList.add("fit" + level);
      if (probe.scrollHeight <= PAGE_PX) break;
    }
    probe.remove();
    page.classList.remove("fit1","fit2","fit3");
    levels[id] = level;
    if (level > 3){ level = 3; over = true; }
    if (level) page.classList.add("fit" + level);
  });
  $("fitWarn").hidden = !over;
  return levels;
}

/* ---------- Wiring ---------- */
$("lang").innerHTML = opts(LANGS, S.l);
const syncForm = () => { $("eye" + S.e).checked = true; $("sdate").value = S.sd; $("start").value = S.st; $("lang").value = S.l; $("bi").checked = S.bi; };
const renderAll = () => { renderMode(); renderDrops(); renderUsual(); renderAppts(); renderProtos(); renderBasis(); renderSheet(); };
const flash = msg => { $("status").textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(() => $("status").textContent = "", 3000); };

$("surgery").addEventListener("change", e => {
  const v = e.target.value;
  if (v.startsWith("p:")){ loadProto(+v.slice(2)); return; }
  const wasG = G();
  S.s = v; S.sel = v; S.d = fromPreset(S.s);
  if (G()) toGlaucoma(); else if (wasG && !S.startTouched) S.st = iso(addDays(parse(S.sd), 1));
  syncForm(); renderAll();
  if (v === "custom") $("sn").focus();
});
$("sn").addEventListener("input", e => { S.sn = e.target.value; renderSheet(); });
$("snl").addEventListener("input", e => { S.snl = e.target.value; renderSheet(); });
$("saveSurgery").addEventListener("click", () => {
  const name = S.sn.trim(); if (!name){ flash("Type a name for the new surgery first."); $("sn").focus(); return; }
  saveProto(name); flash(`Saved "${name}". It's now in the Surgery list.`);
});
document.querySelectorAll('input[name="eye"]').forEach(r => r.addEventListener("change", e => {
  const old = S.e; S.e = e.target.value;
  S.d.forEach(d => { if (d.eye === old) d.eye = S.e; });         // drops that followed the operated eye move with it
  renderDrops(); renderSheet(); }));
$("sdate").addEventListener("change", e => { if (!e.target.value) return; S.sd = e.target.value;
  if (!S.startTouched){ S.st = iso(addDays(parse(S.sd), 1)); $("start").value = S.st; } renderSheet(); });
$("start").addEventListener("change", e => { if (!e.target.value) return; S.st = e.target.value; S.startTouched = true; if (G()) S.sd = S.st; renderSheet(); });
$("lang").addEventListener("change", e => { S.l = e.target.value; renderSheet(); });
$("bi").addEventListener("change", e => { S.bi = e.target.checked; renderSheet(); });
$("patient").addEventListener("input", e => { S.patient = e.target.value; renderSheet(); });
$("phone").addEventListener("input", e => { S.p = CLINIC.phone = e.target.value; saveClinic(); renderMode(); renderSheet(); });
$("clinic").addEventListener("input", e => { S.clinic = CLINIC.name = e.target.value; saveClinic(); renderMode(); renderSheet(); });

/* ---------- Panel tabs: patient plan / clinic settings ---------- */
function showTab(name, focus){
  document.querySelectorAll(".ptabs [data-ptab]").forEach(b => { const on = b.dataset.ptab === name;
    b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $("tabPlan").hidden = name !== "plan"; $("tabClinic").hidden = name !== "clinic";
  document.querySelector(".panel").scrollTop = 0;
}
document.querySelectorAll(".ptabs [data-ptab]").forEach(b => {
  b.addEventListener("click", () => showTab(b.dataset.ptab));
  b.addEventListener("keydown", e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight"){ e.preventDefault(); showTab(b.dataset.ptab === "plan" ? "clinic" : "plan", true); } });
});
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => {
  showTab(b.dataset.goto, true); if (b.dataset.goto === "clinic") $("clinic").focus(); }));
function renderLogo(){
  $("logoPrev").innerHTML = CLINIC.logo ? `<img src="${CLINIC.logo}" alt="Clinic logo">` : "No logo";
  $("logoRm").hidden = !CLINIC.logo; $("logoBtn").textContent = CLINIC.logo ? "Change logo" : "Add logo";
}
$("logoBtn").addEventListener("click", () => $("logoFile").click());
$("logoRm").addEventListener("click", () => { CLINIC.logo = ""; saveClinic(); renderLogo(); renderSheet(); });
$("logoFile").addEventListener("change", e => {
  const file = e.target.files[0]; e.target.value = ""; if (!file) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    /* Shrink the logo to at most 600 × 160 px so it stays small enough to save in the browser */
    const k = Math.min(1, 600 / img.naturalWidth, 160 / img.naturalHeight) || 1, c = document.createElement("canvas");
    c.width = Math.max(1, Math.round((img.naturalWidth || 600) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || 160) * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    CLINIC.logo = c.toDataURL("image/png"); saveClinic(); renderLogo(); renderSheet(); flash("Logo saved on this computer.");
  };
  img.onerror = () => { URL.revokeObjectURL(url); flash("That file couldn't be read as an image. Try a PNG or JPG."); };
  img.src = url;
});

$("addDrop").addEventListener("click", () => {
  if (G()){ const k = ["timolol","dorzo","brimo","latan","netar"].find(k => !S.d.some(d => d.drug === k)) || "timolol";
    S.d.push({drug:k, eye:S.e, off:0, phases:[{f:defFreq(k), n:0}]}); }
  else S.d.push({drug:"tears", eye:S.e, off:0, phases:[{f:"prn", n:30}]});
  renderDrops(); renderSheet(); openPicker(S.d.length - 1); });
$("addSecond").addEventListener("click", () => {
  const second = S.d.filter(d => d.eye === S.e).map(d => ({...d, eye:other(S.e), off:(d.off || 0) + 14, phases:d.phases.map(p => ({...p}))}));
  S.d.push(...second); renderDrops(); renderSheet(); flash("Second-eye drops added starting day 15. Change the start day to match the second surgery.");
});
$("drops").addEventListener("change", e => {
  const card = e.target.closest("[data-i]"); if (!card || !e.target.dataset.f) return;
  const i = +card.dataset.i, d = S.d[i], f = e.target.dataset.f, v = e.target.value, pe = e.target.closest("[data-p]"), p = pe ? d.phases[+pe.dataset.p] : null;
  if (f === "ongoing"){ p.n = e.target.checked ? 0 : 7; renderDrops(); }
  else if (["eye","cap","cls","form"].includes(f)){ d[f] = v || undefined; renderDrops(); }
  else if (f === "off"){ d.off = Math.max(0, (+v || 1) - 1); }
  else if (f === "f"){ p.f = v; renderDrops(); const el = $("f-" + i); if (el) el.focus(); }
  else if (f === "gf"){ d.phases = [{f:v, n:0}]; renderDrops(); const el = $("gf-" + i); if (el) el.focus(); }
  else if (f === "n"){ p.n = Math.max(1, +v || 1); renderDrops(); }
  renderSheet();
});
$("drops").addEventListener("input", e => {
  const card = e.target.closest("[data-i]"); if (!card) return; const d = S.d[+card.dataset.i], f = e.target.dataset.f;
  if (f === "name"){ d.name = e.target.value; renderSheet(); }
  if (f === "n" && +e.target.value > 0){ d.phases[+e.target.closest("[data-p]").dataset.p].n = +e.target.value; renderSheet(); }
  if (f === "off" && +e.target.value > 0){ d.off = +e.target.value - 1; renderSheet(); }
});
$("drops").addEventListener("click", e => {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const act = btn.dataset.act, i = +btn.closest("[data-i]").dataset.i, d = S.d[i];
  if (act === "pick"){ if (picker && picker.i === i) closePicker(true); else openPicker(i); return; }
  if (act === "selp"){ selStep.set(i, +btn.dataset.p); renderDrops(); const b = $("drops").querySelector(`[data-i="${i}"] .tb.sel`); if (b) b.focus(); return; }
  if (act === "rm"){ S.d.splice(i, 1); selStep.clear(); }
  if (act === "addp"){ const last = d.phases[d.phases.length - 1];
    if (last && !(+last.n)) last.n = 7;
    d.phases.push({f: last && /^\d+$/.test(last.f) && +last.f > 1 ? String(+last.f - 1) : "1", n:7}); selStep.set(i, d.phases.length - 1); }
  if (act === "rmp"){ const j = +btn.closest("[data-p]").dataset.p; d.phases.splice(j, 1); selStep.set(i, Math.max(0, j - 1)); }
  if (act === "qt"){ d.phases = QUICK[btn.dataset.q].map(([f, n]) => ({f, n})); selStep.set(i, 0); }
  renderDrops(); renderSheet();
});

$("addUsual").addEventListener("click", () => { S.u.push({name:"", cap:"teal", act:other(S.e) === "B" ? "B" : other(S.e), f:"hs"}); renderUsual(); renderSheet(); });
$("usual").addEventListener("input", e => { const c = e.target.closest("[data-u]"); if (c && e.target.dataset.f === "name"){ S.u[+c.dataset.u].name = e.target.value; renderSheet(); } });
$("usual").addEventListener("change", e => { const c = e.target.closest("[data-u]"); if (!c) return; const f = e.target.dataset.f;
  if (f !== "name"){ S.u[+c.dataset.u][f] = e.target.value; renderUsual(); renderSheet(); } });
$("usual").addEventListener("click", e => { if (e.target.dataset.act === "rmu"){ S.u.splice(+e.target.closest("[data-u]").dataset.u, 1); renderUsual(); renderSheet(); } });

$("addAppt").addEventListener("click", () => { S.a.push({date:iso(addDays(parse(S.sd), 7)), time:""}); renderAppts(); renderSheet(); });
$("appts").addEventListener("change", e => { const c = e.target.closest("[data-a]"); if (!c) return; S.a[+c.dataset.a][e.target.dataset.f] = e.target.value; renderSheet(); });
$("appts").addEventListener("click", e => { if (e.target.dataset.act === "rma"){ S.a.splice(+e.target.closest("[data-a]").dataset.a, 1); renderAppts(); renderSheet(); } });

/* Protocols store eyes relative to the operated eye, so one protocol works for either side */
const toRel = e => e === "B" ? "B" : e === S.e ? "op" : "other";
const fromRel = r => r === "B" ? "B" : r === "op" ? S.e : other(S.e);
function saveProto(name){
  const list = store.get("dw:protocols", []).filter(p => p.name !== name);
  list.push({name, s:S.s, sn:S.s === "custom" ? S.sn.trim() : "", snl:S.s === "custom" ? S.snl.trim() : "",
    d:S.d.map(d => ({...d, eye:toRel(d.eye || S.e), phases:d.phases.map(p => ({...p}))}))});
  store.set("dw:protocols", list); S.sel = "p:" + (list.length - 1); renderProtos();
}
function loadProto(i){
  const p = store.get("dw:protocols", [])[i]; if (!p) return;
  S.s = p.s; S.sn = p.sn || ""; S.snl = p.snl || ""; S.sel = "p:" + i;
  S.d = p.d.map(d => ({...d, eye:fromRel(d.eye), phases:d.phases.map(x => ({...x}))})); if (G()) toGlaucoma(); syncForm(); renderAll(); flash(`Loaded "${p.name}".`);
}
$("protoSave").addEventListener("click", () => {
  const name = $("protoName").value.trim(); if (!name){ flash("Type a name for this protocol first."); $("protoName").focus(); return; }
  saveProto(name); $("protoName").value = ""; flash(`Saved "${name}".`);
});
$("protoLoad").addEventListener("click", () => loadProto(+$("protoList").value));
$("protoDelete").addEventListener("click", () => {
  const list = store.get("dw:protocols", []), i = +$("protoList").value; if (!list[i]) return;
  const name = list[i].name; list.splice(i, 1); store.set("dw:protocols", list);
  if (S.sel.startsWith("p:")) S.sel = S.s;                 // positions shift after a delete
  renderProtos(); flash(`Deleted "${name}".`);
});
$("protoExport").addEventListener("click", () => {
  const list = store.get("dw:protocols", []); if (!list.length){ flash("No saved protocols to export."); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify({dropwise:1, protocols:list}, null, 2)], {type:"application/json"}));
  const a = Object.assign(document.createElement("a"), {href:url, download:"dropwise-protocols.json"}); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});
$("protoImportBtn").addEventListener("click", () => $("protoImport").click());
$("protoImport").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text()); const incoming = (data.protocols || []).filter(p => p && p.name && PRESETS[p.s] && Array.isArray(p.d));
    const list = store.get("dw:protocols", []).filter(p => !incoming.some(q => q.name === p.name));
    store.set("dw:protocols", list.concat(incoming)); renderProtos(); flash(`Imported ${incoming.length} protocol${incoming.length === 1 ? "" : "s"}.`);
  } catch(err){ flash("That file isn't a Dropwise protocol file."); }
  e.target.value = "";
});


const copy = async (text, ok) => { try { await navigator.clipboard.writeText(text); flash(ok); } catch(e){ flash("Copy failed. Select the text and copy it manually."); } };
$("copyLink").addEventListener("click", () => copy(patientURL(), "Patient link copied."));
$("copyNote").addEventListener("click", () => copy($("note").value, "Chart note copied."));

/* ---------- Preview switcher: front, back, or the patient's phone page ---------- */
let view = "front", phoneTimer = 0, phoneN = 0;
function schedulePhone(){
  if (view !== "phone") return;
  clearTimeout(phoneTimer);
  phoneTimer = setTimeout(() => {
    /* A new query string forces the frame to reload; "preview=1" tells the phone page not to save anything */
    const u = new URL("patient.html", location.href); u.search = "pv=" + (++phoneN);
    $("phoneFrame").src = u.href + "#" + patientURL().split("#")[1] + "&preview=1";
  }, 300);
}
document.querySelectorAll(".view-seg [data-view]").forEach(b => b.addEventListener("click", () => {
  view = b.dataset.view; $("stage").dataset.view = view;
  document.querySelectorAll(".view-seg [data-view]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  schedulePhone();
}));

/* ---------- Patient codes ---------- */
const CODE_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const normCode = raw => { const c = String(raw || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return c.length === 8 && [...c].every(ch => CODE_CHARS.includes(ch)) ? c : null; };
const codeMsg = (msg, err) => { $("codeMsg").textContent = msg; $("codeMsg").classList.toggle("err", !!err); };
/* Why codes aren't working, in plain words, from the server's own status report */
async function codeTrouble(){
  if (location.protocol === "file:") return "Patient codes only work on the live website, not on a copy opened from this computer. You can paste the patient's link instead.";
  let j = null;
  try { const res = await fetch("api/status", {headers:{accept:"application/json"}, cache:"no-store"}); j = await res.json().catch(() => null); }
  catch(e){ return "Couldn't reach the website. Check the internet connection and try again."; }
  if (!j || !j.server) return "This copy of Dropwise is running without its server part, so codes can't be saved or looked up. "
    + "Make sure worker.js, wrangler.jsonc and the functions and server folders are in your GitHub repository, then check in Cloudflare that the latest deploy succeeded (Workers & Pages → your project → Deployments). Until then, paste the patient's link instead.";
  if (!j.codes) return "The code database isn't connected yet. On Cloudflare Workers, check that the latest deploy succeeded: wrangler.jsonc creates the database (PLANS) automatically. On Cloudflare Pages: Settings → Bindings → Add → KV namespace named PLANS, then retry the deployment."
    + (j.bindings && j.bindings.length ? ` (Connected now: ${j.bindings.join(", ")}.)` : "");
  return "";
}
const makeMsg = (msg, err) => { $("codeMakeMsg").textContent = msg; $("codeMakeMsg").classList.toggle("err", !!err); $("codeMakeMsg").hidden = !msg; };
function applyPlan(R, code){
  Object.assign(S, {s:R.s, e:R.e, sd:R.sd, st:R.st, l:R.l, p:R.p || "", clinic:R.clinic || "", d:R.d, u:R.u || [], a:R.a || [], sn:R.sn || "", snl:R.snl || "",
    sel:R.s, patient:"", startTouched:true});
  S.code = code || ""; S.codeFor = code ? planKey() : "";
  if (CLINIC.name || CLINIC.phone){ S.clinic = CLINIC.name; S.p = CLINIC.phone; }
  if (G()) toGlaucoma();
  $("patient").value = ""; $("phone").value = S.p; $("clinic").value = S.clinic;
  syncForm(); renderAll();
  codeMsg(`Loaded: ${DW.surgName(S, "en")}, ${{R:"right eye",L:"left eye",B:"both eyes"}[DW.shownEye(S)]}, drops ${G() ? "from" : "started"} ${S.st}. The patient's name isn't stored with codes, so add it before printing.${CLINIC.name || CLINIC.phone ? " Clinic name and phone are set to yours." : ""}`);
}
async function loadInput(){
  const v = $("codeIn").value.trim(); if (!v){ codeMsg("Type a code or paste a link first.", true); $("codeIn").focus(); return; }
  const m = v.match(/r=([^&\s#]+)/), raw = m ? m[1] : v.startsWith("3~") ? v : null;
  if (raw){ const R = DW.decode(raw); if (!R){ codeMsg("That link is incomplete or damaged. Ask the patient to send it again.", true); return; } applyPlan(R, R.code); return; }
  const code = normCode(v);
  if (!code){ codeMsg("Codes have 8 letters and numbers, like K7M4-QX9P. Check it and try again.", true); return; }
  codeMsg("Looking up " + DW.prettyCode(code) + "…");
  try {
    const res = await fetch("api/plan/" + code, {headers:{accept:"application/json"}});
    const j = await res.json().catch(() => null);
    if (!res.ok || !j){ codeMsg(j && j.error && res.status !== 503 ? j.error : await codeTrouble() || "Couldn't look up that code. Try again.", true); return; }
    const R = DW.decode(j.plan); if (!R){ codeMsg("That code's plan couldn't be read.", true); return; }
    applyPlan(R, j.code);
  } catch(e){ codeMsg(await codeTrouble() || "Couldn't look up that code. Try again.", true); }
}
$("codeLoad").addEventListener("click", loadInput);
$("codeIn").addEventListener("keydown", e => { if (e.key === "Enter") loadInput(); });
$("codeMake").addEventListener("click", async () => {
  const btn = $("codeMake"); btn.disabled = true; makeMsg("Creating a code…");
  try {
    const res = await fetch("api/plan", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({plan:encode({...S, code:""})})});
    const j = await res.json().catch(() => null);
    if (!res.ok || !j || !j.code){ makeMsg(j && j.error && res.status !== 503 ? j.error : await codeTrouble() || "Couldn't create a code. Try again.", true); return; }
    S.code = j.code; S.codeFor = planKey(); renderSheet(); makeMsg(`Code ${DW.prettyCode(j.code)} created. It's now on the sheet and the phone page.`);
  } catch(e){ makeMsg(await codeTrouble() || "Couldn't create a code. Try again.", true); }
  finally { btn.disabled = false; }
});

/* Opening the builder with a patient link (…/index.html#r=…) loads that plan */
const startHash = location.hash.match(/r=([^&]+)/);
const startPlan = startHash ? DW.decode(startHash[1]) : null;
$("clinic").value = S.clinic; $("phone").value = S.p; renderLogo();
syncForm(); renderAll();
if (startPlan) applyPlan(startPlan, startPlan.code);
})();
