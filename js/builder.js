/* Dropwise clinician builder: edits the regimen and renders the printable patient sheet with its QR code. */
(() => {
const {LIB,FREQS,PRESETS,BASIS,LANGS,T,iso,parse,addDays,esc,L,glanceHTML,whenHTML,listHTML,warnings,howSteps,fullDate,encode} = DW;
const $ = id => document.getElementById(id);

const today = new Date(); today.setHours(0,0,0,0);
const S = {s:"cataract",e:"R",sd:iso(today),st:iso(addDays(today,1)),startTouched:false,l:"zh-Hans",bi:true,patient:"",p:"",w:"08:00",b:"22:00",d:[]};
const loadPreset = k => { S.d = PRESETS[k].map(([drug,ph]) => ({drug, phases: ph.map(([f,n]) => ({f,n}))})); };
loadPreset(S.s);

/* The link the QR code opens. The regimen goes after "#", so it is never sent to the web server. The patient name is never included. */
const patientURL = () => new URL("patient.html", location.href).href.split("#")[0] + "#r=" + encode(S);

/* ---------- Drops editor ---------- */
function renderDrops(){
  const drugOpts = sel => Object.entries(LIB).map(([k,v]) => `<option value="${k}"${k===sel?" selected":""}>${esc(v.name)}</option>`).join("");
  const freqOpts = sel => FREQS.map(([k,v]) => `<option value="${k}"${k===sel?" selected":""}>${v}</option>`).join("");
  $("drops").innerHTML = S.d.map((d,i) => `
    <div class="drop" data-i="${i}">
      <div class="drop-head"><span class="cap cap-${LIB[d.drug].cap}" aria-hidden="true"></span>
        <select id="drug-${i}" data-f="drug" aria-label="Drop ${i+1}">${drugOpts(d.drug)}</select>
        <button class="x" type="button" data-act="rm" aria-label="Remove this drop">×</button></div>
      <ol class="phases">${d.phases.map((p,j) => `
        <li data-p="${j}"><select id="f-${i}-${j}" data-f="f" aria-label="Frequency, step ${j+1}">${freqOpts(p.f)}</select>
          <span>for</span><input id="n-${i}-${j}" type="number" min="1" max="730" data-f="n" value="${p.n}" aria-label="Days, step ${j+1}"><span>d</span>
          <button class="x" type="button" data-act="rmp" aria-label="Remove step ${j+1}"${d.phases.length<2?" hidden":""}>×</button></li>`).join("")}
      </ol>
      <button class="link" type="button" data-act="addp">+ Add taper step</button>
    </div>`).join("");
}
function renderBasis(){
  const b = BASIS[S.s];
  $("basis").innerHTML = `<div><strong>Regimen basis.</strong> ${esc(b.txt)}</div>
    <ul>${b.src.map(([t,u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
    <div>Every surgeon's protocol differs. Edit the drops above to match yours.</div>`;
}

/* ---------- QR code ---------- */
function qrSVG(text){
  if (typeof qrcode !== "function") return "";
  try { const qr = qrcode(0,"M"); qr.addData(text); qr.make(); return qr.createSvgTag({cellSize:4, margin:0, scalable:true}); }
  catch(e){ return ""; }
}

/* ---------- Patient sheet ---------- */
function renderSheet(){
  const lang = S.l, bi = S.bi && lang !== "en", t = T[lang];
  const sheet = $("sheet");
  sheet.lang = lang; sheet.dir = lang === "ar" ? "rtl" : "ltr";
  const [how, howEn] = howSteps(S, lang), [warn, warnEn] = warnings(S, lang);
  const url = patientURL(), svg = qrSVG(url);
  const lb = fn => L(lang, bi, fn);

  sheet.innerHTML = `
    <header class="s-head">
      <h2>${lb(x => x.title)}</h2>
      <div class="eye-badge">${lb(x => x[S.e])}<small>${S.e === "R" ? "OD" : "OS"}</small></div>
    </header>
    <dl class="meta">
      <div><dt>${lb(x => x.patient)}</dt><dd>${esc(S.patient)}</dd></div>
      <div><dt>${lb(x => x.surgery)}</dt><dd>${lb(x => x.surg[S.s])}</dd></div>
      <div><dt>${lb(x => x.surgeryDate)}</dt><dd>${esc(fullDate(lang, parse(S.sd)))}</dd></div>
      <div><dt>${lb(x => x.startDate)}</dt><dd>${esc(fullDate(lang, parse(S.st)))}</dd></div>
    </dl>
    <section class="s-sec"><h3>${lb(x => x.glance)}</h3>${glanceHTML(S, lang, bi)}
      <div class="legend">${S.d.map((_,k) => `<div>${DW.drugLabel(S,k,lang,bi,true)}</div>`).join("")}</div>
    </section>
    <section class="s-sec"><h3>${lb(x => x.whenT)}</h3>${whenHTML(S, lang, bi)}</section>
    <section class="qr-box">
      ${svg ? `<div class="qr" role="img" aria-label="QR code">${svg}</div>` : ""}
      <div><p>${lb(x => x.qrT)}</p>${svg ? "" : `<div class="qr-url">${esc(url)}</div>`}</div>
    </section>
    <section class="s-sec"><h3>${lb(x => x.howT)}</h3><ol class="how">${listHTML(how, howEn, bi, lang)}</ol></section>
    <section class="s-sec"><h3>${lb(x => x.tipsT)}</h3><ul class="tips">${listHTML(t.tips[S.s], T.en.tips[S.s], bi, lang)}</ul></section>
    <section class="s-sec warn"><h3>${lb(x => x.warnT)}</h3><ul>${listHTML(warn, warnEn, bi, lang)}</ul></section>
    <footer class="s-foot">
      <div>${lb(x => x.bring)}</div>
      <div>${lb(x => x.footQ)} <span class="phone-num">${S.p ? esc(S.p) : "________________"}</span></div>
    </footer>
    <div class="brandline">Dropwise</div>`;
}

/* ---------- Wiring ---------- */
$("lang").innerHTML = LANGS.map(([k,v]) => `<option value="${k}">${v}</option>`).join("");
function syncForm(){
  $("surgery").value = S.s; $("eye"+S.e).checked = true; $("sdate").value = S.sd; $("start").value = S.st;
  $("lang").value = S.l; $("bi").checked = S.bi;
}
const renderAll = () => { renderDrops(); renderBasis(); renderSheet(); };
const flash = msg => { $("status").textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(() => $("status").textContent = "", 2500); };

$("surgery").addEventListener("change", e => { S.s = e.target.value; loadPreset(S.s); renderAll(); });
document.querySelectorAll('input[name="eye"]').forEach(r => r.addEventListener("change", e => { S.e = e.target.value; renderSheet(); }));
$("sdate").addEventListener("change", e => { if (!e.target.value) return; S.sd = e.target.value;
  if (!S.startTouched){ S.st = iso(addDays(parse(S.sd),1)); $("start").value = S.st; } renderSheet(); });
$("start").addEventListener("change", e => { if (!e.target.value) return; S.st = e.target.value; S.startTouched = true; renderSheet(); });
$("lang").addEventListener("change", e => { S.l = e.target.value; renderSheet(); });
$("bi").addEventListener("change", e => { S.bi = e.target.checked; renderSheet(); });
$("patient").addEventListener("input", e => { S.patient = e.target.value; renderSheet(); });
$("phone").addEventListener("input", e => { S.p = e.target.value; renderSheet(); });
$("wake").addEventListener("input", e => { if (e.target.value){ S.w = e.target.value; renderSheet(); } });
$("bed").addEventListener("input", e => { if (e.target.value){ S.b = e.target.value; renderSheet(); } });
$("addDrop").addEventListener("click", () => { S.d.push({drug:"tears", phases:[{f:"prn", n:30}]}); renderDrops(); renderSheet(); });

$("drops").addEventListener("change", e => {
  const dEl = e.target.closest(".drop"); if (!dEl) return; const d = S.d[+dEl.dataset.i]; const f = e.target.dataset.f;
  if (f === "drug"){ d.drug = e.target.value; renderDrops(); }
  else { const p = d.phases[+e.target.closest("li").dataset.p]; p[f] = f === "n" ? Math.max(1, +e.target.value || 1) : e.target.value; }
  renderSheet();
});
$("drops").addEventListener("input", e => {
  if (e.target.dataset.f !== "n") return; const dEl = e.target.closest(".drop");
  const p = S.d[+dEl.dataset.i].phases[+e.target.closest("li").dataset.p]; const v = +e.target.value; if (v > 0){ p.n = v; renderSheet(); }
});
$("drops").addEventListener("click", e => {
  const act = e.target.dataset.act; if (!act) return; const i = +e.target.closest(".drop").dataset.i; const d = S.d[i];
  if (act === "rm") S.d.splice(i,1);
  if (act === "addp"){ const last = d.phases[d.phases.length-1]; d.phases.push({f: last && /^\d+$/.test(last.f) && +last.f > 1 ? String(+last.f-1) : "1", n:7}); }
  if (act === "rmp") d.phases.splice(+e.target.closest("li").dataset.p, 1);
  renderDrops(); renderSheet();
});

$("openPatient").addEventListener("click", () => window.open(patientURL(), "_blank", "noopener"));
$("copyLink").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(patientURL()); flash("Patient link copied."); }
  catch(e){ flash("Copy failed. Use Open phone view and copy the address bar."); }
});

syncForm(); renderAll();
})();
