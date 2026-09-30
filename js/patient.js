/* Dropwise patient page: reads the regimen from the link, shows today's drops, exports calendar reminders
   and reads the instructions aloud. Everything stays on the phone; nothing is sent to a server. */
(() => {
const {LIB,LANGS,VOICE,T,iso,parse,addDays,dayDiff,toMin,fmtTime,fmtDate,fullDate,totalDays,dayPlan,decode,buildICS,esc,L,capDot,drugLabel,dayIcon,glanceHTML,listHTML,warnings,howSteps} = DW;
const app = document.getElementById("app");
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

/* ---------- Load the regimen: from the link first, otherwise the last one saved on this phone ---------- */
const hashCode = s => { let h = 0; for (const c of s) h = (h*31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const m = location.hash.match(/r=([A-Za-z0-9_-]+)/);
let enc = m ? m[1] : store.get("dw:regimen");
const R = enc ? decode(enc) : null;
if (R && m) store.set("dw:regimen", enc);
let lang = (R && store.get("dw:lang:" + (enc ? hashCode(enc) : ""))) || (R ? R.l : "en");
const doneKey = R ? "dw:done:" + hashCode(enc) : "";
const done = (R && store.get(doneKey)) || {};

/* ---------- Speech: a recorded file in audio/<lang>/instructions.mp3 wins; otherwise the phone's own voice ---------- */
let audio = null, speaking = false;
function pickVoice(){
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices().map(v => ({v, code: v.lang.replace("_","-").toLowerCase()}));
  for (const want of VOICE[lang]){ const w = want.toLowerCase();
    const hit = voices.find(x => x.code === w) || (w.includes("-") ? null : voices.find(x => x.code.split("-")[0] === w));
    if (hit) return hit.v; }
  return null;
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};
function stopSpeech(){ if (audio){ audio.pause(); audio = null; } if ("speechSynthesis" in window) speechSynthesis.cancel(); speaking = false; render(); }
async function speak(lines){
  if (speaking){ stopSpeech(); return; }
  try {
    const url = `audio/${lang}/instructions.mp3`;
    const r = await fetch(url, {method:"HEAD"});
    if (r.ok && (r.headers.get("content-type") || "").includes("audio")){
      audio = new Audio(url); speaking = true; render();
      audio.onended = () => { speaking = false; audio = null; render(); };
      await audio.play(); return;
    }
  } catch(e){}
  const v = pickVoice();
  if (!v){ showNote(T[lang].noVoice); return; }
  speechSynthesis.cancel();
  lines.forEach((text,i) => { const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = .9;
    if (i === lines.length-1) u.onend = () => { speaking = false; render(); }; speechSynthesis.speak(u); });
  speaking = true; render();
}
let note = "";
function showNote(msg){ note = msg; render(); setTimeout(() => { note = ""; render(); }, 6000); }

/* ---------- Calendar reminders ---------- */
function downloadICS(){
  const blob = new Blob([buildICS(R, lang)], {type:"text/calendar;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) a.download = "dropwise-reminders.ics";   // iPhone opens the file straight into Calendar instead
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- Rendering ---------- */
function render(){
  const t = T[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const langSel = `<select id="langSel" aria-label="Language">${LANGS.map(([k,v]) => `<option value="${k}"${k===lang?" selected":""}>${v}</option>`).join("")}</select>`;
  const top = `<div class="top"><span class="brand"><span class="drop-mark" aria-hidden="true"></span>Dropwise</span>${langSel}</div>`;

  if (!R){ app.innerHTML = top + `<div class="card invalid"><p class="msg">${esc(t.invalid)}</p></div>`; bind(); return; }

  const now = new Date(), start = parse(R.st), total = totalDays(R);
  const idx = dayDiff(start, now), nowMin = now.getHours()*60 + now.getMinutes();
  const lb = fn => L(lang, false, fn);
  const dayKey = i => iso(addDays(start,i));

  let status, nextHTML = "", todayHTML = "";
  if (idx < 0) status = t.notStarted(fullDate(lang, start));
  else if (idx >= total) status = t.finished;
  else status = t.dayOf(idx+1, total);

  if (idx >= 0 && idx < total){
    const plan = dayPlan(R, idx), dk = dayKey(idx);
    const isDone = s => !!done[`${dk}|${s.t}`];
    const next = plan.slots.find(s => !isDone(s) && s.t >= nowMin - 60) || plan.slots.find(s => !isDone(s));
    if (next){
      nextHTML = `<section class="card next" aria-live="polite">
        <div class="label">${lb(x => x.next)}</div>
        <time>${esc(fmtTime(lang, next.t))}</time>
        <div class="next-drugs">${next.drugs.map(k => drugLabel(R,k,lang,false,true)).join("")}</div>
        <div class="actions">
          <button class="big" data-done="${dk}|${next.t}">${esc(t.done)}</button>
          <button class="big ghost" data-speak="next" aria-label="${esc(t.listen)}">${speaking ? "■" : "▶"}</button>
        </div></section>`;
    }
    todayHTML = `<section class="card"><h2>${lb(x => x.allToday)}</h2><div class="today-list">
      ${plan.slots.map(s => `<button class="trow${isDone(s)?" is-done":""}${next && s.t===next.t?" is-next":""}" data-done="${dk}|${s.t}" aria-pressed="${isDone(s)}">
        ${dayIcon(s.t)}<time>${esc(fmtTime(lang,s.t))}</time>
        <span class="chips">${s.drugs.map(k => `<span class="chip">${capDot(LIB[R.d[k].drug].cap)}<span dir="ltr">${esc(LIB[R.d[k].drug].name.replace(/ \d.*$/,""))}</span></span>`).join("")}</span>
        <span class="tick" aria-hidden="true"></span></button>`).join("")}
      </div>${plan.prn.length ? `<div class="prn-line">${esc(DW.freqStr(lang,"prn"))}: <span dir="ltr">${plan.prn.map(k => esc(LIB[R.d[k].drug].name)).join(", ")}</span></div>` : ""}</section>`;
  }

  const [how] = howSteps(R, lang), [warn] = warnings(R, lang);
  app.innerHTML = top + `
    <section class="card hero">
      <div><h1>${lb(x => x.surg[R.s])}</h1><div class="day">${esc(status)}</div></div>
      <div class="eye-badge">${lb(x => x[R.e])}<small>${R.e === "R" ? "OD" : "OS"}</small></div>
    </section>
    ${note ? `<div class="card"><p class="msg" role="status">${esc(note)}</p></div>` : ""}
    ${nextHTML}${todayHTML}
    <section class="card">
      <button class="big wide" id="ics">${esc(t.remind)}</button>
      <p class="help">${esc(t.remindHelp)}</p>
      <button class="big ghost wide" data-speak="how">${speaking ? "■ " + esc(t.stop) : "▶ " + esc(t.listen)}</button>
    </section>
    <section class="card"><h2>${lb(x => x.glance)}</h2>${glanceHTML(R, lang, false, idx)}</section>
    <section class="card"><h2>${lb(x => x.howT)}</h2><ol class="how">${listHTML(how, [], false, lang)}</ol></section>
    <section class="card"><h2>${lb(x => x.tipsT)}</h2><ul class="tips">${listHTML(t.tips[R.s], [], false, lang)}</ul></section>
    <section class="warn"><h2>${lb(x => x.warnT)}</h2><ul>${listHTML(warn, [], false, lang)}</ul></section>
    ${R.p ? `<section class="card call"><span>${esc(t.callClinic)}</span><a class="phone-num" href="tel:${esc(R.p.replace(/[^\d+]/g,""))}">${esc(R.p)}</a></section>` : ""}
    <p class="foot">${esc(t.install)}</p>`;
  bind();
}

function bind(){
  const sel = document.getElementById("langSel");
  if (sel) sel.onchange = e => { stopSpeech(); lang = e.target.value; if (enc) store.set("dw:lang:" + hashCode(enc), lang); render(); };
  const ics = document.getElementById("ics"); if (ics) ics.onclick = downloadICS;
  app.querySelectorAll("[data-done]").forEach(b => b.onclick = () => {
    const k = b.dataset.done; if (done[k]) delete done[k]; else done[k] = 1; store.set(doneKey, done); render(); });
  app.querySelectorAll("[data-speak]").forEach(b => b.onclick = () => {
    const t = T[lang], [how] = howSteps(R, lang), lines = [...how];
    if (b.dataset.speak === "next"){
      const idx = dayDiff(parse(R.st), new Date()), plan = dayPlan(R, idx), nowMin = new Date().getHours()*60 + new Date().getMinutes();
      const s = plan.slots.find(x => !done[`${iso(new Date())}|${x.t}`] && x.t >= nowMin - 60) || plan.slots[0];
      if (s) lines.unshift(`${fmtTime(lang, s.t)}. ${s.drugs.map(k => t.cls[LIB[R.d[k].drug].cls]).join(", ")}.`);
    }
    speak(lines);
  });
}

render();
setInterval(() => { if (!speaking) render(); }, 60000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
