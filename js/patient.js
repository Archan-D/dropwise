/* Dropwise patient page: reads the regimen from the link, shows what to use now, walks the patient through each bottle
   with a 5-minute wait timer, tracks progress, exports calendar alarms and reads instructions aloud.
   Nothing is sent to a server. Opened with "&preview=1" (the builder's phone preview), it saves nothing on the device. */
(() => {
const {LANGS,VOICE,T,iso,parse,addDays,dayDiff,fmtTime,fullDate,shortDate,horizon,hasOngoing,dayPlan,decode,buildICS,esc,L,mark,
  bottleHTML,slotName,capWord,dayIcon,CIRCLED,pillCardsHTML,usualHTML,apptHTML,howHTML,howSteps,listHTML,warnings,hashCode,freqStr,dayProgress} = DW;
const app = document.getElementById("app"), nowBox = document.getElementById("now");
const hash = location.hash, preview = /[#&]preview=1/.test(hash), openNow = /[#&]now=1/.test(hash);
const store = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } },
  set(k, v){ if (preview) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

/* ---------- Regimen: from the link first, otherwise the last one opened on this phone ---------- */
const m = hash.match(/r=([^&]+)/);
const enc = m ? m[1] : store.get("dw:regimen", null);
const R = enc ? decode(enc) : null;
if (R && m) store.set("dw:regimen", enc);
const id = enc ? hashCode(enc) : "";
let lang = (R && !preview && store.get("dw:lang:" + id, null)) || (R ? R.l : "en");
const done = (R && !preview && store.get("dw:done:" + id, {})) || {};
const shareURL = () => location.href.split("#")[0] + "#r=" + enc;
const icsFrom = store.get("dw:ics", null);
const staleReminders = () => R && !preview && icsFrom && icsFrom !== id;
let size = preview ? "n" : store.get("dw:size", null);           // n / l / x; null = not chosen yet
if (store.get("dw:big", false) && !size) size = "l";               // carry over the old "larger text" setting
const saveDone = () => store.set("dw:done:" + id, done);

/* ---------- Speech: a recorded file in audio/<lang>/instructions.mp3 wins for the how-to steps; otherwise the phone's voice ---------- */
let audio = null, speaking = false, note = "";
function pickVoice(){
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices().map(v => ({v, code:v.lang.replace("_","-").toLowerCase()}));
  for (const want of VOICE[lang]){ const w = want.toLowerCase();
    const hit = voices.find(x => x.code === w) || (w.includes("-") ? null : voices.find(x => x.code.split("-")[0] === w));
    if (hit) return hit.v; }
  return null;
}
if ("speechSynthesis" in window){ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; }
function stopSpeech(){ if (audio){ audio.pause(); audio = null; } if ("speechSynthesis" in window) speechSynthesis.cancel(); speaking = false; refresh(); }
async function speak(lines, useRecording = true){
  if (speaking){ stopSpeech(); return; }
  if (useRecording) try {
    const url = `audio/${lang}/instructions.mp3`, r = await fetch(url, {method:"HEAD"});
    if (r.ok && (r.headers.get("content-type") || "").includes("audio")){
      audio = new Audio(url); speaking = true; refresh();
      audio.onended = () => { speaking = false; audio = null; refresh(); }; await audio.play(); return;
    }
  } catch(e){}
  const v = pickVoice();
  if (!v){ showNote(T[lang].noVoice); return; }
  speechSynthesis.cancel();
  lines.forEach((text, i) => { const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = .9;
    if (i === lines.length - 1) u.onend = () => { speaking = false; refresh(); }; speechSynthesis.speak(u); });
  speaking = true; refresh();
}
function showNote(msg){ note = msg; render(); clearTimeout(showNote.t); showNote.t = setTimeout(() => { note = ""; render(); }, 7000); }

/* ---------- Calendar and sharing ---------- */
function downloadICS(){
  /* Each alarm links back here with "&now=1", which opens the step-by-step screen for that dose */
  const url = URL.createObjectURL(new Blob([buildICS(R, lang, shareURL() + "&now=1")], {type:"text/calendar;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) a.download = "dropwise-reminders.ics";      // iPhone opens it straight into Calendar instead
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  store.set("dw:ics", id); render();
}
async function share(){
  const t = T[lang];
  if (navigator.share){ try { await navigator.share({title:"Dropwise", text:t.title, url:shareURL()}); return; } catch(e){ if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(shareURL()); showNote(t.shared); } catch(e){ showNote(shareURL()); }
}

/* ---------- Where we are today ---------- */
function today(){
  const now = new Date(), start = parse(R.st), H = horizon(R), open = hasOngoing(R);
  const idx = dayDiff(start, now), nowMin = now.getHours()*60 + now.getMinutes();
  const active = idx >= 0 && (open || idx < H);
  const plan = active ? dayPlan(R, idx) : null, dk = iso(addDays(start, Math.max(idx, 0)));
  const isDone = s => !!done[`${dk}|${s.t}`];
  const next = plan ? plan.slots.find(s => !isDone(s) && s.t >= nowMin - 60) || plan.slots.find(s => !isDone(s)) : null;
  return {start, H, open, idx, active, plan, dk, isDone, next};
}

/* ---------- "It's time" screen: one bottle at a time, then a 5-minute wait before the next ---------- */
const WAIT_MS = 5 * 60 * 1000;
const SPEAKER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
let flow = null, tick = null, wakeLock = null, audioCtx = null;
function openFlow(slotT){
  const d = today(); if (!d.plan) return;
  const s = d.plan.slots.find(x => x.t === slotT) || d.next; if (!s) return;
  flow = {dk:d.dk, t:s.t, drugs:s.drugs, drops:d.plan.drops, i:0, phase:"bottle", endsAt:0};
  try { if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => wakeLock = l).catch(() => {});
  document.body.classList.add("flow-open");
  renderNow();
}
function closeFlow(){
  flow = null; clearInterval(tick); tick = null;
  if (wakeLock){ wakeLock.release().catch(() => {}); wakeLock = null; }
  document.body.classList.remove("flow-open"); nowBox.innerHTML = ""; nowBox.hidden = true;
  if (speaking) stopSpeech(); render();
}
function chime(){
  try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch(e){}
  if (!audioCtx) return;
  try { const t0 = audioCtx.currentTime;
    [0, .35].forEach((d, k) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = k ? 880 : 660; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(.0001, t0 + d); g.gain.exponentialRampToValueAtTime(.35, t0 + d + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + .3);
      o.start(t0 + d); o.stop(t0 + d + .32); });
  } catch(e){}
}
function nextStep(){
  if (!flow) return;
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  if (flow.i >= flow.drugs.length - 1){ done[`${flow.dk}|${flow.t}`] = 1; saveDone(); flow.phase = "done"; renderNow(); return; }
  flow.phase = "wait"; flow.endsAt = Date.now() + WAIT_MS; renderNow();
  clearInterval(tick); tick = setInterval(() => {
    if (!flow || flow.phase !== "wait") return;
    const left = flow.endsAt - Date.now(), el = document.getElementById("timer");
    if (left <= 0){ clearInterval(tick); chime(); flow.i++; flow.phase = "bottle"; renderNow(); return; }
    if (el) el.textContent = mmss(left);
  }, 250);
}
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function speakBottle(d){
  const t = T[lang], m = d.m;
  return [m.cap !== "none" ? capWord(m.cap, lang) : "", m.short, m.brand, t[d.eye || R.e], m.shake ? t.shake : ""].filter(Boolean).join(", ") + ".";
}
function renderNow(){
  if (!flow){ nowBox.hidden = true; return; }
  const t = T[lang], n = flow.drugs.length, d = flow.drops[flow.drugs[flow.i]], sn = slotName(lang, flow.t);
  const dots = flow.drugs.map((_, k) => `<i class="${k < flow.i || flow.phase === "done" ? "was" : k === flow.i ? "on" : ""}"></i>`).join("");
  const head = `<div class="nw-head"><span>${sn ? `<b>${esc(sn)}</b> · ` : ""}${esc(fmtTime(lang, flow.t))} · ${esc(t[d.eye || R.e])}</span>
    <button class="nw-x" id="nwClose" aria-label="${esc(t.close)}">×</button></div>`;
  let body = "";
  if (flow.phase === "bottle") body = `
    <p class="nw-step">${n > 1 ? esc(t.bottleN(flow.i + 1, n)) : esc(t.itsTime)}</p>
    <div class="nw-dots" aria-hidden="true">${n > 1 ? dots : ""}</div>
    <div class="nw-mark">${mark(d.m.cls, d.m.cap, 132)}</div>
    <h1 class="nw-cap">${esc(d.m.cap !== "none" ? capWord(d.m.cap, lang) : d.m.short)}</h1>
    <p class="nw-name" dir="ltr">${esc(d.m.name)}${d.m.brand ? ` <span>(${esc(d.m.brand)})</span>` : ""}</p>
    <div class="nw-badges">${d.m.shake ? `<span class="badge">↻ ${esc(t.shake)}</span>` : ""}${d.m.form === "oint" ? `<span class="badge">${esc(t.oint)}</span>` : ""}${d.m.form === "gel" ? `<span class="badge">${esc(t.gel)}</span>` : ""}<span class="badge eye">${esc(t[d.eye || R.e])}</span></div>
    <p class="nw-hint">${esc(t.how[4])}</p>
    <div class="nw-actions">
      <button class="big-btn ghost" id="nwSpeak">${speaking ? "■ " + esc(t.stop) : "▶ " + esc(t.listen)}</button>
      <button class="big-btn" id="nwNext">${esc(flow.i < n - 1 ? t.doneNext : t.taken)}</button>
    </div>`;
  else if (flow.phase === "wait"){ const nx = flow.drops[flow.drugs[flow.i + 1]]; body = `
    <p class="nw-step">${esc(t.how[5])}</p>
    <div class="nw-dots" aria-hidden="true">${dots}</div>
    <p class="nw-sub">${esc(t.nextIn)}</p>
    <div class="nw-timer" id="timer" role="timer" aria-live="off">${mmss(flow.endsAt - Date.now())}</div>
    <div class="nw-next">${bottleHTML(R, nx, lang, false, {size:28, compact:true, eye:true})}</div>
    <div class="nw-actions one"><button class="big-btn ghost" id="nwSkip">${esc(t.skipWait)}</button></div>`; }
  else body = `
    <div class="nw-check" aria-hidden="true"></div>
    <h1 class="nw-cap">${esc(t.allDone)}</h1>
    <div class="nw-actions one"><button class="big-btn" id="nwClose2">${esc(t.close)}</button></div>`;
  nowBox.hidden = false;
  nowBox.setAttribute("lang", lang); nowBox.dir = lang === "ar" ? "rtl" : "ltr";
  nowBox.innerHTML = `<div class="nw" role="dialog" aria-modal="true" aria-label="${esc(t.itsTime)}">${head}<div class="nw-body">${body}</div></div>`;
  const on = (sel, fn) => { const el = document.getElementById(sel); if (el) el.onclick = fn; };
  on("nwClose", closeFlow); on("nwClose2", closeFlow); on("nwNext", nextStep);
  on("nwSkip", () => { clearInterval(tick); flow.i++; flow.phase = "bottle"; renderNow(); });
  on("nwSpeak", () => speak([speakBottle(d), t.how[3], t.how[4]], false));
  const focus = document.getElementById(flow.phase === "wait" ? "nwSkip" : flow.phase === "done" ? "nwClose2" : "nwNext"); if (focus) focus.focus();
}

/* ---------- Main page ---------- */
function sizeChooser(t){
  const opt = (k, label, px) => `<button class="size-opt${size === k ? " on" : ""}" data-size="${k}" style="font-size:${px}px" aria-pressed="${size === k}"><span class="size-aa">${esc(t.alarmTitle)}</span><span class="size-lbl">${esc(label)}</span></button>`;
  return `<section class="card size-card"><h2>${esc(t.sizeT)}</h2><div class="size-opts">${opt("n", t.sizeN, 17)}${opt("l", t.sizeL, 21)}${opt("x", t.sizeXL, 25)}</div></section>`;
}
function progressHTML(d, t){
  /* Up to 4 weeks of day squares: the course so far plus the week ahead */
  const last = d.open ? d.idx + 7 : d.H - 1, first = Math.max(0, Math.min(d.idx, last) - 20), end = Math.min(last, first + 27);
  if (end < first) return "";
  const cells = [];
  for (let i = first; i <= end; i++){
    const day = addDays(d.start, i), p = dayProgress(R, i, done);
    const state = i > d.idx ? "future" : p.total === 0 ? "none" : p.done >= p.total ? "full" : p.done > 0 ? "part" : i < d.idx ? "missed" : "todo";
    cells.push(`<div class="pday ${state}${i === d.idx ? " today" : ""}" title="${esc(shortDate(lang, day))}: ${p.done}/${p.total}"><span>${day.getDate()}</span></div>`);
  }
  return `<section class="card"><h2>${esc(t.progressT)}</h2><div class="pgrid">${cells.join("")}</div><p class="help">${esc(t.progressKey)}</p></section>`;
}
function render(){
  const t = T[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.size = size || "n";
  const tools = `<div class="top-tools">
      <button class="pill" id="sizeBtn">Aa ${esc(t.textSize)}</button>
      <select id="langSel" aria-label="Language">${LANGS.map(([k,v]) => `<option value="${k}"${k === lang ? " selected" : ""}>${v}</option>`).join("")}</select></div>`;
  const top = `<div class="top"><span class="brand"><span class="drop-mark" aria-hidden="true"></span>Dropwise</span>${tools}</div>`;
  if (!R){ app.innerHTML = top + `<div class="card invalid"><p class="msg">${esc(t.invalid)}</p></div>`; bind(); return; }

  const d = today(), lb = fn => L(lang, false, fn), mixed = DW.mixedEyes(R);
  const g = DW.isInfo(R);
  const status = d.idx < 0 ? t.notStarted(fullDate(lang, d.start)) : g ? t.gStatus : d.active ? (d.open ? t.dayN(d.idx + 1) : t.dayOf(d.idx + 1, d.H)) : t.finished;
  const bar = d.active && !d.open ? `<div class="pbar" role="progressbar" aria-valuemin="1" aria-valuemax="${d.H}" aria-valuenow="${d.idx + 1}"><i style="width:${Math.round((d.idx + 1) / d.H * 100)}%"></i></div>` : "";
  let nextHTML = "", todayHTML = "";
  if (d.plan){
    const drops = d.plan.drops;
    if (d.next){
      const many = d.next.drugs.length > 1, sn = slotName(lang, d.next.t);
      nextHTML = `<section class="card next" aria-live="polite">
        <div class="label">${lb(x => x.next)}</div>
        <div class="when-now">${dayIcon(d.next.t)}<span>${sn ? `<b>${esc(sn)}</b> · ` : ""}<time>${esc(fmtTime(lang, d.next.t))}</time></span></div>
        ${many ? `<p class="msg">${esc(t.order)}</p>` : ""}
        <ol class="next-drugs">${d.next.drugs.map((k, n) => `<li>${many ? `<span class="num">${CIRCLED[n] || n + 1}</span>` : "<span></span>"}${bottleHTML(R, drops[k], lang, false, {size:34, full:true, eye:true, purpose:true})}</li>`).join("")}</ol>
        <p class="help">${esc(t.capWarn)}</p>
        <button class="big-btn wide" data-start="${d.next.t}">▶ ${esc(t.start)}</button>
        <div class="actions">
          <button class="big-btn ghost" data-done="${d.dk}|${d.next.t}">${esc(t.done)}</button>
          <button class="big-btn ghost" data-speak="next" aria-label="${esc(t.listen)}">${speaking ? "■" : SPEAKER}</button>
        </div></section>`;
    }
    const p = dayProgress(R, d.idx, done);
    todayHTML = `<section class="card"><div class="card-head"><h2>${lb(x => x.allToday)}</h2><span class="count">${esc(t.todayCount(p.done, p.total))}</span></div><div class="today-list">
      ${d.plan.slots.map(s => `<button class="trow${d.isDone(s) ? " is-done" : ""}${d.next && s.t === d.next.t ? " is-next" : ""}" data-done="${d.dk}|${s.t}" aria-pressed="${d.isDone(s)}">
        <span class="t-when">${dayIcon(s.t)}<span>${slotName(lang, s.t) ? `<b>${esc(slotName(lang, s.t))}</b>` : ""}<time>${esc(fmtTime(lang, s.t))}</time></span></span>
        <span class="t-drops">${s.drugs.map((k, n) => `<span class="t-drop">${s.drugs.length > 1 ? `<b class="num">${CIRCLED[n] || n + 1}</b>` : ""}${bottleHTML(R, drops[k], lang, false, {size:22, compact:true, eye:mixed})}</span>`).join("")}</span>
        <span class="tick" aria-hidden="true"></span></button>`).join("")}
      </div>${d.plan.prn.length ? `<div class="prn">${d.plan.prn.map(k => mark(drops[k].m.cls, drops[k].m.cap, 15)).join("")}<span>${esc(freqStr(lang, "prn"))}: <span dir="ltr">${d.plan.prn.map(k => esc(drops[k].m.short)).join(", ")}</span></span></div>` : ""}</section>`;
  }

  const [warn] = warnings(R, lang), usual = usualHTML(R, lang, false), appts = apptHTML(R, lang);
  const callLabel = R.clinic ? t.callNamed.replace("{n}", R.clinic) : t.callClinic;
  app.innerHTML = top + `
    ${size === null ? sizeChooser(t) : ""}
    <section class="card hero">
      <div class="hero-row">
        <div><h1>${DW.surgLabel(R, lang, false)}</h1><div class="day">${esc(status)}</div></div>
        <div class="eye-badge">${lb(x => x[DW.shownEye(R)])}<small>${{R:"OD",L:"OS",B:"OU"}[DW.shownEye(R)]}</small></div>
      </div>${bar}
    </section>
    ${staleReminders() ? `<div class="card alert" role="alert"><p class="msg">${esc(t.oldReminders)}</p></div>` : ""}
    ${note ? `<div class="card"><p class="msg" role="status">${esc(note)}</p></div>` : ""}
    ${nextHTML}${todayHTML}
    <section class="card">
      <button class="big-btn wide" id="ics">${esc(t.remind)}</button>
      <p class="help">${esc(t.remindHelp)}</p>
      <button class="big-btn ghost wide" data-speak="how">${speaking ? "■ " + esc(t.stop) : "▶ " + esc(t.listen)}</button>
      <button class="big-btn ghost wide" id="share">${esc(t.share)}</button>
    </section>
    ${d.active ? progressHTML(d, t) : ""}
    ${R.code ? `<section class="card code-card"><h2>${lb(x => x.codeLabel)}</h2><div class="big-code">${esc(DW.prettyCode(R.code))}</div><p class="help">${esc(t.codeHelp)}</p></section>` : ""}
    ${appts ? `<section class="card"><h2>${lb(x => x.apptT)}</h2>${appts}</section>` : ""}
    <section class="card"><h2>${lb(x => x.whenT)}</h2>${pillCardsHTML(R, lang, false, d.idx)}</section>
    ${g ? `<section class="card"><h2>${lb(x => x.gInfoT)}</h2>${DW.infoHTML(R, lang, false, {when:true})}</section>` : ""}
    ${usual ? `<section class="card"><h2>${lb(x => x.usualT)}</h2>${usual}</section>` : ""}
    <section class="card"><h2>${lb(x => x.howT)}</h2>${howHTML(R, lang, false)}<p class="missed">${esc(t.missed)}</p></section>
    <section class="card"><h2>${lb(x => x.tipsT)}</h2><ul class="tips">${listHTML(t.tips[R.s], [], false, lang)}</ul></section>
    <section class="warn"><h2>${lb(x => x.warnT)}</h2><ul>${listHTML(warn, [], false, lang)}</ul></section>
    ${R.p ? `<section class="card call"><span>${esc(callLabel)}</span><a class="phone-num" href="tel:${esc(R.p.replace(/[^\d+]/g, ""))}">${esc(R.p)}</a></section>` : ""}
    <p class="foot">${esc(t.issued)}: ${esc(fullDate(lang, parse(R.iss)))}</p>
    <p class="foot">${esc(t.install)}</p>`;
  bind();
}
const refresh = () => { render(); if (flow) renderNow(); };

function bind(){
  const sel = document.getElementById("langSel");
  if (sel) sel.onchange = e => { stopSpeech(); lang = e.target.value; if (id) store.set("dw:lang:" + id, lang); refresh(); };
  const sb = document.getElementById("sizeBtn"); if (sb) sb.onclick = () => { size = null; render(); const c = app.querySelector(".size-card"); if (c) c.scrollIntoView({block:"start"}); };
  app.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { size = b.dataset.size; store.set("dw:size", size); render(); });
  const ics = document.getElementById("ics"); if (ics) ics.onclick = downloadICS;
  const sh = document.getElementById("share"); if (sh) sh.onclick = share;
  app.querySelectorAll("[data-start]").forEach(b => b.onclick = () => openFlow(+b.dataset.start));
  app.querySelectorAll("[data-done]").forEach(b => b.onclick = () => {
    const k = b.dataset.done; if (done[k]) delete done[k]; else done[k] = 1; saveDone(); render(); });
  app.querySelectorAll("[data-speak]").forEach(b => b.onclick = () => {
    const t = T[lang];
    if (b.dataset.speak === "next"){
      const d = today(); if (d.next) speak([DW.speakDose(R, d.plan, d.next, lang), t.capWarn], false);
      return;
    }
    const lines = howSteps(R, lang).map(x => x.text); lines.push(t.missed);
    speak(lines);
  });
}

render();
/* Opened from a calendar alarm: go straight to the step-by-step screen for the dose that's due */
if (R && openNow){ const d = today(); if (d.next) openFlow(d.next.t); }
setInterval(() => { if (!speaking && !flow) render(); }, 60000);
if ("serviceWorker" in navigator && !preview) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
