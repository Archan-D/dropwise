/* Dropwise core: drug list, presets, scheduling maths, link encoding, calendar (.ics) export,
   chart note and the shared renderers used by the printed sheet and the patient page.
   Patient-facing text lives in js/i18n.js (generated from translations.csv). */
const DW = (() => {

/* ---------- Drug list ----------
   cls: antibiotic | steroid | nsaid | cyclo | lube | combo     form: sol (clear) | susp (milky) | oint (ointment)
   cap: default cap colour from the AAO topical ocular cap colour code; the clinician can override per patient. */
const LIB = {
  moxi:{name:"Moxifloxacin 0.5%",brand:"Vigamox",short:"Moxifloxacin",cls:"antibiotic",cap:"tan",form:"sol"},
  gati:{name:"Gatifloxacin 0.3%",brand:"Zymar",short:"Gatifloxacin",cls:"antibiotic",cap:"tan",form:"sol"},
  tobra:{name:"Tobramycin 0.3%",brand:"Tobrex",short:"Tobramycin",cls:"antibiotic",cap:"tan",form:"sol"},
  erythro:{name:"Erythromycin 0.5% ointment",brand:"",short:"Erythromycin",cls:"antibiotic",cap:"tan",form:"oint"},
  pred:{name:"Prednisolone acetate 1%",brand:"Pred Forte",short:"Prednisolone",cls:"steroid",cap:"pink",form:"susp",shake:true},
  dex:{name:"Dexamethasone 0.1%",brand:"Maxidex",short:"Dexamethasone",cls:"steroid",cap:"pink",form:"susp",shake:true},
  lote:{name:"Loteprednol 0.5%",brand:"Lotemax",short:"Loteprednol",cls:"steroid",cap:"pink",form:"susp",shake:true},
  difl:{name:"Difluprednate 0.05%",brand:"Durezol",short:"Difluprednate",cls:"steroid",cap:"pink",form:"susp"},
  fml:{name:"Fluorometholone 0.1%",brand:"FML",short:"Fluorometholone",cls:"steroid",cap:"pink",form:"susp",shake:true},
  tobradex:{name:"Tobramycin + dexamethasone",brand:"Tobradex",short:"Tobradex",cls:"combo",cap:"pink",form:"susp",shake:true},
  maxitrol:{name:"Neomycin + polymyxin B + dexamethasone ointment",brand:"Maxitrol",short:"Maxitrol",cls:"combo",cap:"pink",form:"oint"},
  ketor:{name:"Ketorolac 0.5%",brand:"Acular",short:"Ketorolac",cls:"nsaid",cap:"gray",form:"sol"},
  nepaf:{name:"Nepafenac 0.1%",brand:"Nevanac",short:"Nepafenac",cls:"nsaid",cap:"gray",form:"susp",shake:true},
  atro:{name:"Atropine 1%",brand:"Isopto Atropine",short:"Atropine",cls:"cyclo",cap:"red",form:"sol"},
  cyclo:{name:"Cyclopentolate 1%",brand:"Cyclogyl",short:"Cyclopentolate",cls:"cyclo",cap:"red",form:"sol"},
  tears:{name:"Preservative-free artificial tears",brand:"",short:"Artificial tears",cls:"lube",cap:"none",form:"sol"},
  gel:{name:"Lubricating gel or ointment (bedtime)",brand:"",short:"Lubricating gel",cls:"lube",cap:"none",form:"oint"},
  custom:{name:"Other (type a name)",brand:"",short:"",cls:"other",cap:"none",form:"sol"},
  /* Glaucoma drops. def = usual frequency; comps = classes in a combination (for side-effect information).
     Cap colours follow the AAO code; netarsudil isn't in the code, so it defaults to white. */
  latan:{name:"Latanoprost 0.005%",brand:"Xalatan",short:"Latanoprost",cls:"pga",cap:"teal",form:"sol",def:"hs"},
  travo:{name:"Travoprost 0.004%",brand:"Travatan Z",short:"Travoprost",cls:"pga",cap:"teal",form:"sol",def:"hs"},
  bimat:{name:"Bimatoprost 0.01%",brand:"Lumigan RC",short:"Bimatoprost",cls:"pga",cap:"teal",form:"sol",def:"hs"},
  taflu:{name:"Tafluprost 0.0015% (preservative-free)",brand:"Saflutan",short:"Tafluprost",cls:"pga",cap:"teal",form:"sol",def:"hs"},
  lbunod:{name:"Latanoprostene bunod 0.024%",brand:"Vyzulta",short:"Latanoprostene bunod",cls:"pga",cap:"teal",form:"sol",def:"hs"},
  timolol:{name:"Timolol 0.5%",brand:"Timoptic",short:"Timolol",cls:"bb",cap:"yellow",form:"sol",def:"2"},
  timxe:{name:"Timolol 0.5% gel-forming",brand:"Timoptic-XE",short:"Timolol gel",cls:"bb",cap:"yellow",form:"gel",def:"1"},
  betax:{name:"Betaxolol 0.25%",brand:"Betoptic S",short:"Betaxolol",cls:"bb",cap:"yellow",form:"susp",shake:true,def:"2"},
  levob:{name:"Levobunolol 0.5%",brand:"Betagan",short:"Levobunolol",cls:"bb",cap:"yellow",form:"sol",def:"2"},
  brimo:{name:"Brimonidine 0.15%",brand:"Alphagan P",short:"Brimonidine",cls:"aa",cap:"purple",form:"sol",def:"2"},
  apra:{name:"Apraclonidine 0.5%",brand:"Iopidine",short:"Apraclonidine",cls:"aa",cap:"purple",form:"sol",def:"3"},
  dorzo:{name:"Dorzolamide 2%",brand:"Trusopt",short:"Dorzolamide",cls:"cai",cap:"orange",form:"sol",def:"2"},
  brinz:{name:"Brinzolamide 1%",brand:"Azopt",short:"Brinzolamide",cls:"cai",cap:"orange",form:"susp",shake:true,def:"2"},
  pilo:{name:"Pilocarpine 2%",brand:"Isopto Carpine",short:"Pilocarpine",cls:"miotic",cap:"green",form:"sol",def:"4"},
  netar:{name:"Netarsudil 0.02%",brand:"Rhopressa",short:"Netarsudil",cls:"rock",cap:"white",form:"sol",def:"hs"},
  cosopt:{name:"Dorzolamide + timolol",brand:"Cosopt",short:"Dorzolamide-timolol",cls:"gcombo",comps:["cai","bb"],cap:"navy",form:"sol",def:"2"},
  combigan:{name:"Brimonidine + timolol",brand:"Combigan",short:"Brimonidine-timolol",cls:"gcombo",comps:["aa","bb"],cap:"navy",form:"sol",def:"2"},
  simbrinza:{name:"Brinzolamide + brimonidine",brand:"Simbrinza",short:"Brinzolamide-brimonidine",cls:"gcombo",comps:["cai","aa"],cap:"lightgreen",form:"susp",shake:true,def:"2"},
  azarga:{name:"Brinzolamide + timolol",brand:"Azarga",short:"Brinzolamide-timolol",cls:"gcombo",comps:["cai","bb"],cap:"navy",form:"susp",shake:true,def:"2"},
  xalacom:{name:"Latanoprost + timolol",brand:"Xalacom",short:"Latanoprost-timolol",cls:"gcombo",comps:["pga","bb"],cap:"navy",form:"sol",def:"1"},
  duotrav:{name:"Travoprost + timolol",brand:"DuoTrav",short:"Travoprost-timolol",cls:"gcombo",comps:["pga","bb"],cap:"navy",form:"sol",def:"1"},
  ganfort:{name:"Bimatoprost + timolol",brand:"Ganfort",short:"Bimatoprost-timolol",cls:"gcombo",comps:["pga","bb"],cap:"navy",form:"sol",def:"1"},
  rocklatan:{name:"Netarsudil + latanoprost",brand:"Rocklatan",short:"Netarsudil-latanoprost",cls:"gcombo",comps:["rock","pga"],cap:"white",form:"sol",def:"hs"}
};
const GLAUCOMA_CLS = ["pga","bb","aa","cai","miotic","rock","gcombo"];
const isGlaucomaDrug = k => LIB[k] && GLAUCOMA_CLS.includes(LIB[k].cls);
/* Glaucoma plans are information sheets: ongoing daily drops, no taper, no course length */
const isInfo = R => R.s === "glaucoma";
/* The eye shown on the badge: for glaucoma, whichever eyes the drops are for; after surgery, the operated eye */
function shownEye(R){
  if (!isInfo(R) || !R.d.length) return R.e;
  const s = new Set(R.d.map(d => d.eye || R.e));
  return s.has("B") || (s.has("R") && s.has("L")) ? "B" : [...s][0];
}
const CAPS = ["tan","pink","gray","red","green","purple","yellow","teal","orange","blue","white","none","navy","lightgreen"];
const CLASSES = [["antibiotic","Antibiotic"],["steroid","Steroid"],["nsaid","NSAID"],["cyclo","Cycloplegic"],["combo","Antibiotic + steroid"],["lube","Lubricant"],["other","Other"],
  ["pga","Prostaglandin analogue"],["bb","Beta-blocker"],["aa","Alpha agonist"],["cai","Carbonic anhydrase inhibitor"],["miotic","Miotic"],["rock","Rho kinase inhibitor"],["gcombo","Glaucoma combination"]];
const FORMS = [["sol","Clear drop"],["susp","Milky drop (shake)"],["oint","Ointment"],["gel","Gel-forming drop"]];
const FREQS = [["1","1×/day"],["2","2×/day"],["3","3×/day"],["4","4×/day"],["5","5×/day"],["6","6×/day"],["q2h","q2h while awake"],["q1h","q1h while awake"],["hs","1×/day at bedtime"],["prn","As needed"]];
const ABBR = {"1":"daily","2":"BID","3":"TID","4":"QID","5":"5×/day","6":"6×/day",q2h:"q2h",q1h:"q1h",hs:"QHS",prn:"PRN"};

/* Fixed dose times (minutes after midnight), anchored to 8 am so different drops line up */
/* Dose times follow the Universal Medication Schedule (AHRQ): morning 8 am, noon, evening 5 pm, bedtime 9 pm.
   A taper drops one time of day per step: 4× = all four, 3× = morning/noon/bedtime, 2× = morning/bedtime, 1× = morning. */
const SLOTS = [[480,"morning"],[720,"noon"],[1020,"evening"],[1260,"bedtime"]];
const SLOT_OF = Object.fromEntries(SLOTS);
const TIMES = {"1":[480],"2":[480,1260],"3":[480,720,1260],"4":[480,720,1020,1260],"5":[480,660,840,1020,1260],"6":[480,630,780,930,1080,1260],
  q2h:[480,600,720,840,960,1080,1200,1320], q1h:Array.from({length:14},(_,i)=>480+i*60), hs:[1260], prn:[]};
const fitsSlots = f => (TIMES[f] || []).length > 0 && TIMES[f].every(t => SLOT_OF[t]);

/* ---------- Presets: [drug, [[freq, days], ...]]; days 0 = continue until the doctor says to stop ---------- */
const PRESETS = {
  cataract:[["moxi",[["4",7]]],["pred",[["4",7],["3",7],["2",7],["1",7]]],["ketor",[["4",28]]]],
  trab:[["moxi",[["4",14]]],["pred",[["q2h",7],["4",35],["3",7],["2",7],["1",7]]]],
  ppv:[["moxi",[["4",7]]],["pred",[["4",7],["3",7],["2",7],["1",7]]],["atro",[["1",7]]]],
  dmek:[["moxi",[["4",7]]],["pred",[["4",90],["3",30],["2",30],["1",0]]]],
  prk:[["moxi",[["4",7]]],["fml",[["4",7],["3",7],["2",7],["1",7]]],["tears",[["prn",30]]]],
  lasik:[["moxi",[["4",7]]],["pred",[["4",7]]],["tears",[["prn",30]]]],
  custom:[["moxi",[["4",7]]],["pred",[["4",7],["3",7],["2",7],["1",7]]]],
  glaucoma:[["latan",[["hs",0]]]]
};
const SURGERIES = [["cataract","Cataract (phaco + IOL)"],["trab","Trabeculectomy"],["ppv","Pars plana vitrectomy"],["dmek","DMEK (endothelial keratoplasty)"],["prk","PRK"],["lasik","LASIK"],["custom","New surgery (type a name)"],["glaucoma","Glaucoma (daily drops, no taper)"]];
const BASIS = {
  cataract:{txt:"Fluoroquinolone QID × 1 wk; prednisolone 1% QID tapered weekly 4/3/2/1; NSAID QID × 4 wk.",src:[["Control arm, NCT06681688","https://clinicaltrials.gov/study/NCT06681688"],["Standard-drops arm, PMC9325575","https://pmc.ncbi.nlm.nih.gov/articles/PMC9325575/"]]},
  trab:{txt:"Antibiotic QID; intensive steroid (q1–2h) for the first days, then 4–6×/day, reduced by one drop per week after ~6 wk (≈9 wk total).",src:[["Community Eye Health: care after glaucoma surgery","https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5100471/"],["SNAP trial regimen, PMC9784245","https://pmc.ncbi.nlm.nih.gov/articles/PMC9784245/"]]},
  ppv:{txt:"Antibiotic QID × 1 wk; prednisolone 1% 4/3/2/1 weekly; atropine 1% daily × 1 wk.",src:[["Mass Eye and Ear Dropless PPV Study, NCT05331664","https://clinicaltrials.gov/study/NCT05331664"],["Retina Specialist: post-op drop survey","https://www.retina-specialist.com/article/rethinking-routine-use-of-steroid-drops-after-surgery"]]},
  dmek:{txt:"Steroid QID months 1–3, TID month 4, BID month 5, then daily; many surgeons continue low-dose steroid indefinitely, so the last step is set to continue until stopped.",src:[["AAO: low-dose steroids after DMEK","https://www.aao.org/editors-choice/very-weak-steroids-effective-after-dmek"],["Cornea surgeon survey, PMC13317915","https://pmc.ncbi.nlm.nih.gov/articles/PMC13317915/"]]},
  prk:{txt:"Fluoroquinolone QID until bandage lens removal (~1 wk); FML tapered from QID over 4 wk; preservative-free tears as needed.",src:[["Healio: PRK post-op regimens","https://www.healio.com/news/ophthalmology/20120331/at-issue-preferred-regimen-for-curing-haze-after-prk"],["Walter Reed PRK post-op instructions","https://walterreed.tricare.mil/Portals/126/PRK%20Postop%20Instructions.pdf"]]},
  lasik:{txt:"Antibiotic and steroid QID × 1 wk; artificial tears as needed.",src:[["UCLA Health: LASIK & PRK post-op instructions","https://www.uclahealth.org/medical-services/ophthalmology/laser-refractive-surgery/your-visit/postoperative-instructions"]]},
  glaucoma:{txt:"Ongoing glaucoma drops with no taper. Choose each drop, the eye and how often. Times follow morning / noon / evening / bedtime; prostaglandin analogues default to bedtime. Cap colours follow the AAO code; check the patient's actual bottles.",src:[["EyeWiki: Review of topical glaucoma medications","https://eyewiki.aao.org/Review_of_Topical_Glaucoma_Medications"],["AAO: Color codes for topical ocular medications","https://www.aao.org/about/policies/color-codes-topical-ocular-medications"]]},
  custom:{txt:"New surgery: starts from a general antibiotic + steroid taper. Edit the drops to match your protocol, then save it so it appears in the Surgery list.",src:[]}
};

const LANGS = [["zh-Hans","中文（普通话）· Mandarin"],["zh-Hant","中文（粵語）· Cantonese"],["pa","ਪੰਜਾਬੀ · Punjabi"],["ar","العربية · Arabic"],["ko","한국어 · Korean"],["vi","Tiếng Việt · Vietnamese"],["ja","日本語 · Japanese"],["en","English"]];
const LOCALE = {en:"en-CA","zh-Hans":"zh-CN","zh-Hant":"zh-HK",pa:"pa-IN",ar:"ar-u-nu-latn",ko:"ko-KR",vi:"vi-VN",ja:"ja-JP"};
/* Cantonese never falls back to a Mandarin voice */
const VOICE = {en:["en-CA","en-US","en-GB","en"],"zh-Hans":["zh-CN","cmn-CN","zh"],"zh-Hant":["zh-HK","yue-HK","yue"],pa:["pa-IN","pa"],ar:["ar-SA","ar-EG","ar"],ko:["ko-KR","ko"],vi:["vi-VN","vi"],ja:["ja-JP","ja"]};

/* ---------- Text: rebuild the nested structure from the flat translation table ----------
   "how.3" -> how[2];  "fq.n#1" / "fq.n#other" -> fq.n(n) picks the plural form and fills {n} {m}.
   Missing lines fall back to English, but plural forms only ever come from the same language. */
function hydrate(lang){
  const own = I18N[lang] || {}, flat = {};
  const ownBases = new Set(Object.keys(own).filter(k => k.includes("#")).map(k => k.split("#")[0]));
  for (const [k,v] of Object.entries(I18N.en)){ if (k.includes("#") && ownBases.has(k.split("#")[0])) continue; flat[k] = v; }
  Object.assign(flat, own);
  const root = {}, fns = {};
  const setPath = (path, val) => { const segs = path.split("."); let o = root;
    segs.forEach((s, i) => { const key = /^\d+$/.test(s) ? +s - 1 : s;
      if (i === segs.length - 1) o[key] = val; else { if (o[key] == null) o[key] = /^\d+$/.test(segs[i+1]) ? [] : {}; o = o[key]; } }); };
  for (const [k, v] of Object.entries(flat)){ const [p, variant] = k.split("#"); if (variant) (fns[p] = fns[p] || {})[variant] = v; else setPath(p, v); }
  for (const [p, vars] of Object.entries(fns)) setPath(p, (n, m) => {
    const form = n === 1 && vars["1"] ? vars["1"] : n === 2 && vars["2"] ? vars["2"] : n >= 3 && n <= 10 && vars.few ? vars.few : vars.other;
    return String(form).replace(/\{n\}/g, n).replace(/\{m\}/g, m); });
  return root;
}
const T = Object.fromEntries(LANGS.map(([l]) => [l, hydrate(l)]));

/* ---------- Dates & times ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const dayDiff = (a,b) => Math.round((parse(iso(b)) - parse(iso(a))) / 864e5);
const fmtTime = (lang,m) => new Intl.DateTimeFormat(LOCALE[lang],{hour:"numeric",minute:"2-digit"}).format(new Date(2026,0,1,Math.floor(m/60)%24,m%60));
const fmtDate = (lang,d,opt) => new Intl.DateTimeFormat(LOCALE[lang],opt||{weekday:"short",month:"short",day:"numeric"}).format(d);
/* Some browsers ship without Punjabi date names (they print "M10"), so Punjabi has its own month and weekday names as a fallback */
const PA_MONTHS = ["ਜਨਵਰੀ","ਫ਼ਰਵਰੀ","ਮਾਰਚ","ਅਪ੍ਰੈਲ","ਮਈ","ਜੂਨ","ਜੁਲਾਈ","ਅਗਸਤ","ਸਤੰਬਰ","ਅਕਤੂਬਰ","ਨਵੰਬਰ","ਦਸੰਬਰ"];
const PA_DAYS = ["ਐਤਵਾਰ","ਸੋਮਵਾਰ","ਮੰਗਲਵਾਰ","ਬੁੱਧਵਾਰ","ਵੀਰਵਾਰ","ਸ਼ੁੱਕਰਵਾਰ","ਸ਼ਨੀਵਾਰ"];
let paOK = null;
const paNative = () => paOK ?? (paOK = !/M\d/.test(new Intl.DateTimeFormat("pa-IN",{month:"short"}).format(new Date(2026,9,1))));
const shortDate = (lang,d) => lang === "pa" && !paNative() ? `${d.getDate()} ${PA_MONTHS[d.getMonth()]}` : fmtDate(lang,d,{month:"short",day:"numeric"});
const fullDate = (lang,d) => lang === "pa" && !paNative() ? `${PA_DAYS[d.getDay()]}, ${d.getDate()} ${PA_MONTHS[d.getMonth()]} ${d.getFullYear()}` : fmtDate(lang,d,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const freqStr = (lang,f) => { const q = T[lang].fq; return /^\d+$/.test(f) ? q.n(+f) : q[f]; };
const capWord = (cap, lang) => (T[lang].cap || {})[cap] || T[lang].cap.none;
const slotName = (lang, m) => SLOT_OF[m] ? T[lang].slot[SLOT_OF[m]] : "";
const prettyCode = c => c ? c.slice(0, 4) + "-" + c.slice(4) : "";
const hashCode = s => { let h = 0; for (const c of s) h = (h*31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };

/* ---------- Regimen ----------
   R = {s, e:"R"|"L"|"B" (operated eye), sd (surgery date), st (drops start), iss (issued), l, p (clinic phone),
        d:[{drug, eye, off (start day offset), cap?, name?, cls?, form?, phases:[{f, n}]}],      n = 0 means "until told"
        u:[{name, cap, act:"B"|"R"|"L"|"stop", f}],  a:[{date, time}]} */
function meta(d){
  const base = LIB[d.drug];
  if (base && d.drug !== "custom") return {name:base.name, brand:base.brand, short:base.short, cls:base.cls, comps:base.comps, form:base.form, shake:!!base.shake, cap:d.cap || base.cap};
  const form = d.form || "sol";
  return {name:d.name || "Eye drop", brand:"", short:d.name || "Eye drop", cls:d.cls || "other", form, shake:form === "susp", cap:d.cap || "none"};
}
/* Every drop that is actually scheduled: the post-op drops plus the usual drops the patient keeps using */
function allDrops(R){
  const post = R.d.map(d => ({...d, m:meta(d)}));
  const usual = (R.u || []).filter(u => u.act !== "stop").map(u => ({drug:"usual", eye:u.act, off:0, usual:true, phases:[{f:u.f, n:0}],
    m:{name:u.name || "Eye drop", brand:"", short:u.name || "Eye drop", cls:"usual", form:"sol", shake:false, cap:u.cap || "none"}}));
  return post.concat(usual);
}
function phaseOn(d, i){
  const j = i - (d.off || 0); if (j < 0) return null; let c = 0;
  for (const p of d.phases){ const n = +p.n || 0; if (n === 0) return p; if (j < c + n) return p; c += n; }
  return null;
}
const finiteEnd = d => (d.off || 0) + d.phases.reduce((a,p) => a + (+p.n || 0), 0);
const isOngoing = d => d.phases.some(p => !(+p.n));
const hasOngoing = R => allDrops(R).some(isOngoing);
const horizon = R => Math.max(1, ...allDrops(R).map(finiteEnd));
const FORM_RANK = {sol:0, susp:1, gel:2, oint:3};

/* All doses on day i, drops in the order they go in (clear, then milky, then ointment) */
function dayPlan(R, i){
  const drops = allDrops(R), map = new Map(), prn = [];
  drops.forEach((d,k) => { const p = phaseOn(d,i); if (!p) return;
    if (p.f === "prn") { prn.push(k); return; }
    (TIMES[p.f] || []).forEach(t => { if (!map.has(t)) map.set(t,[]); map.get(t).push(k); }); });
  const rank = k => FORM_RANK[drops[k].m.form] ?? 0;
  return {drops, prn, slots:[...map.entries()].sort((a,b) => a[0]-b[0]).map(([t,ks]) => ({t, drugs:ks.sort((a,b) => rank(a)-rank(b) || a-b)}))};
}

/* Stretches of the course where nothing changes: the rows of the "at a glance" table. b = Infinity for the open-ended last stretch. */
function segments(R){
  const drops = allDrops(R), H = horizon(R), cuts = new Set([0, H]);
  drops.forEach(d => { let c = d.off || 0; cuts.add(c); d.phases.forEach(p => { if (+p.n){ c += +p.n; cuts.add(c); } }); });
  const pts = [...cuts].filter(x => x <= H).sort((a,b) => a-b);
  const ranges = []; for (let i = 0; i < pts.length - 1; i++) if (pts[i+1] > pts[i]) ranges.push([pts[i], pts[i+1]]);
  if (hasOngoing(R)) ranges.push([H, Infinity]);
  const out = [];
  ranges.forEach(([a,b]) => {
    const per = drops.map(d => { const p = phaseOn(d,a); return p ? p.f : null; });
    if (per.every(x => x === null)) return;
    const prev = out[out.length-1];
    if (prev && prev.b === a && prev.per.join() === per.join()) prev.b = b; else out.push({a, b, per});
  });
  return out;
}
const mixedEyes = R => { const eyes = new Set(allDrops(R).map(d => d.eye || R.e)); return eyes.size > 1 || !eyes.has(R.e); };

/* ---------- Surgery name (custom surgeries carry the clinician's own name, optionally in the patient's language) ---------- */
function surgName(R, lang){
  if (R.s !== "custom") return T[lang].surg[R.s];
  if (lang !== "en" && R.snl) return R.snl;
  return R.sn || T[lang].surg.custom;
}
function surgLabel(R, lang, bi){
  const a = surgName(R, lang), b = R.s === "custom" ? (R.sn || T.en.surg.custom) : T.en.surg[R.s];
  return esc(a) + (bi && lang !== "en" && a !== b ? `<span class="en" lang="en" dir="ltr">${esc(b)}</span>` : "");
}

/* ---------- Link encoding ----------
   Compact text after "#r=" (browsers never send it to the server; the patient name is never included).
   Lists are referenced by position, so only ever ADD new entries to the END of LIB, CAPS, FREQS, LANGS, SURGERIES, CLASSES, FORMS.
   Separators (~ ! . _ :) never need escaping in links or calendar files, so the link stays clickable inside calendar alarms. */
const EPOCH = new Date(2020, 0, 1);
const LIBK = Object.keys(LIB), FREQK = FREQS.map(x => x[0]), LANGK = LANGS.map(x => x[0]), SURGK = SURGERIES.map(x => x[0]), CLSK = CLASSES.map(x => x[0]), FORMK = FORMS.map(x => x[0]);
const txt = v => encodeURIComponent(v || "").replace(/[._~!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const untxt = v => { try { return decodeURIComponent(v || ""); } catch(e){ return ""; } };
function encode(R){
  const sd = parse(R.sd), off = d => dayDiff(sd, parse(d));
  const drops = R.d.map(d => [LIBK.indexOf(d.drug).toString(36), d.eye || R.e, (d.off || 0).toString(36), d.cap ? CAPS.indexOf(d.cap).toString(36) : "",
    d.phases.map(p => FREQK.indexOf(p.f).toString(36) + ":" + (+p.n || 0).toString(36)).join("_"),
    ...(d.drug === "custom" ? [txt(d.name), CLSK.indexOf(d.cls || "other"), FORMK.indexOf(d.form || "sol")] : [])].join(".")).join("!");
  const usual = (R.u || []).map(u => [txt(u.name), CAPS.indexOf(u.cap), u.act, FREQK.indexOf(u.f).toString(36)].join(".")).join("!");
  const appts = (R.a || []).filter(a => a.date).map(a => off(a.date) + "." + (a.time || "").replace(":", "")).join("!");
  const head = ["3", SURGK.indexOf(R.s) + R.e, dayDiff(EPOCH, sd).toString(36), off(R.st), off(R.iss), LANGK.indexOf(R.l), txt(R.p), drops, usual, appts];
  /* Optional tail: patient code, custom surgery names, clinic name. Trailing empty fields are left off to keep the QR small. */
  const tail = [R.code || "", R.s === "custom" ? txt(R.sn) : "", R.s === "custom" ? txt(R.snl) : "", txt(R.clinic)];
  while (tail.length && !tail[tail.length - 1]) tail.pop();
  return [...head, ...tail].join("~");
}
function decode(str){
  try {
    const f = String(str).split("~"); if (f[0] !== "3" || f.length < 10) return null;
    const s = SURGK[+f[1][0]], e0 = f[1][1]; if (!s) return null;
    const eye = e => ["R","L","B"].includes(e) ? e : "R", e = eye(e0);
    const sdDate = addDays(EPOCH, parseInt(f[2], 36)), at = n => iso(addDays(sdDate, +n || 0));
    const freq = i => FREQK[parseInt(i, 36)] || "1";
    const d = (f[7] ? f[7].split(/[!,]/) : []).map(x => { const [k, de, o, c, ph, nm, cl, fm] = x.split(".");
      const drug = LIBK[parseInt(k, 36)]; if (!drug) return null;
      return {drug, eye:eye(de), off:Math.min(365, parseInt(o, 36) || 0), cap:c ? CAPS[parseInt(c, 36)] : undefined,
        name:drug === "custom" ? untxt(nm).slice(0, 60) : undefined, cls:drug === "custom" ? CLSK[+cl] || "other" : undefined, form:drug === "custom" ? FORMK[+fm] || "sol" : undefined,
        phases:(ph || "").split("_").filter(Boolean).map(p => { const [fi, n] = p.split(":"); return {f:freq(fi), n:Math.min(730, parseInt(n, 36) || 0)}; })};
    }).filter(Boolean);
    const u = (f[8] ? f[8].split(/[!,]/) : []).map(x => { const [nm, c, act, fi] = x.split(".");
      return {name:untxt(nm).slice(0, 60), cap:CAPS[+c] || "none", act:["B","R","L","stop"].includes(act) ? act : "B", f:freq(fi)}; });
    const a = (f[9] ? f[9].split(/[!,]/) : []).map(x => { const [o, t] = x.split("."); return {date:at(o), time:/^\d{4}$/.test(t || "") ? t.slice(0,2) + ":" + t.slice(2) : ""}; });
    return {s, e, sd:iso(sdDate), st:at(f[3]), iss:at(f[4]), l:LANGK[+f[5]] || "en", p:untxt(f[6]).slice(0, 40), d, u, a,
      code:/^[0-9A-HJKMNP-TV-Z]{8}$/.test(f[10] || "") ? f[10] : "",
      sn:s === "custom" ? untxt(f[11]).slice(0, 60) : "", snl:s === "custom" ? untxt(f[12]).slice(0, 60) : "", clinic:untxt(f[13]).slice(0, 60)};
  } catch(err){ return null; }
}

/* ---------- Calendar export (.ics) ---------- */
const icsEscape = s => String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
function icsFold(line){
  const enc = new TextEncoder(); let out = "", cur = "", bytes = 0;
  for (const ch of line){ const n = enc.encode(ch).length; if (bytes + n > 73){ out += cur + "\r\n "; cur = ""; bytes = 1; } cur += ch; bytes += n; }
  return out + cur;
}
const icsDT = (d,m) => `${iso(d).replace(/-/g,"")}T${String(Math.floor(m/60)).padStart(2,"0")}${String(m%60).padStart(2,"0")}00`;
function buildICS(R, lang, url){
  const t = T[lang], start = parse(R.st), H = horizon(R), open = hasOngoing(R), last = open ? H : H - 1;
  const runs = [], live = new Map();
  for (let i = 0; i <= last; i++) dayPlan(R,i).slots.forEach(s => {
    const key = `${s.t}|${s.drugs.join(",")}`, run = live.get(key);
    if (run && run.start + run.count === i) run.count++; else { const r = {t:s.t, drugs:s.drugs, start:i, count:1}; runs.push(r); live.set(key, r); }
  });
  const drops = allDrops(R), id = hashCode(encode(R));
  const stamp = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const L = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dropwise//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${icsEscape("Dropwise · " + t.alarmTitle)}`];
  runs.forEach((r,k) => {
    /* Title: what the patient sees on the lock screen. Cap colour first, then generic and brand, then the eye. */
    const eyes = [...new Set(r.drugs.map(i => drops[i].eye || R.e))];
    const one = i => { const m = drops[i].m;
      return `${m.cap !== "none" ? capWord(m.cap, lang) + " " : ""}${m.short}${m.brand ? " (" + m.brand + ")" : ""}${eyes.length > 1 ? " · " + t[drops[i].eye || R.e] : ""}`; };
    const summary = `💧 ${r.drugs.map(one).join(" → ")}${eyes.length === 1 ? " · " + t[eyes[0]] : ""}`;
    const lines = r.drugs.map((i,n) => { const d = drops[i], m = d.m;
      return `${r.drugs.length > 1 ? (n+1) + ". " : ""}${m.cap !== "none" ? capWord(m.cap, lang) + " · " : ""}${m.name}${m.brand ? " (" + m.brand + ")" : ""} · ${t.cls[m.cls]} · ${t[d.eye || R.e]}${m.shake ? " · ↻ " + t.shake : ""}`; });
    if (r.drugs.length > 1) lines.push("", t.order);
    lines.push("", t.capWarn);
    if (url) lines.push("", t.openApp, url);
    const infinite = open && r.start + r.count - 1 === last;
    const d0 = addDays(start, r.start);
    L.push("BEGIN:VEVENT", `UID:dw-${id}-${k}@dropwise`, `DTSTAMP:${stamp}`, `DTSTART:${icsDT(d0,r.t)}`, `DTEND:${icsDT(d0,r.t+5)}`);
    if (infinite) L.push("RRULE:FREQ=DAILY"); else if (r.count > 1) L.push(`RRULE:FREQ=DAILY;COUNT=${r.count}`);
    L.push(`SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(lines.join("\n"))}`);
    if (url) L.push(`URL:${url}`);
    L.push("BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${icsEscape(summary)}`,"TRIGGER:PT0M","END:VALARM","END:VEVENT");
  });
  (R.a || []).forEach((a,k) => {
    const d = parse(a.date);
    L.push("BEGIN:VEVENT", `UID:dw-${id}-appt${k}@dropwise`, `DTSTAMP:${stamp}`);
    if (a.time){ const [h,m] = a.time.split(":").map(Number); L.push(`DTSTART:${icsDT(d,h*60+m)}`, `DTEND:${icsDT(d,h*60+m+30)}`); }
    else L.push(`DTSTART;VALUE=DATE:${a.date.replace(/-/g,"")}`, `DTEND;VALUE=DATE:${iso(addDays(d,1)).replace(/-/g,"")}`);
    L.push(`SUMMARY:${icsEscape("👁 " + t.apptEvent)}`, "BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${icsEscape(t.apptEvent)}`,"TRIGGER:-P1D","END:VALARM","END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return L.map(icsFold).join("\r\n") + "\r\n";
}

/* ---------- Chart note (English, for the EMR / discharge summary) ---------- */
function chartNote(R){
  const eyeAbbr = e => ({R:"OD", L:"OS", B:"OU"})[e] || "";
  const surg = R.s === "custom" ? (R.sn || "Eye surgery") : (SURGERIES.find(([k]) => k === R.s) || [,""])[1];
  const langName = (LANGS.find(([k]) => k === R.l) || [,"English"])[1].split("·").pop().trim();
  const info = isInfo(R);
  const lines = info ? [`Dropwise glaucoma drop sheet given (${langName}), issued ${R.iss}.`, `Glaucoma drops ${eyeAbbr(shownEye(R))}, starting ${R.st}.`, "Drops:"]
    : [`Dropwise post-op drop sheet given (${langName}), issued ${R.iss}.`, `${surg} ${eyeAbbr(R.e)}, surgery ${R.sd}. Drops start ${R.st}.`, "Drops:"];
  R.d.forEach(d => { const m = meta(d);
    const taper = info ? d.phases.map(p => ABBR[p.f]).join(" → ") : d.phases.map(p => `${ABBR[p.f]} ${+p.n ? "×" + p.n + "d" : "until told"}`).join(" → ");
    lines.push(`- ${m.name}${m.brand ? " (" + m.brand + ")" : ""} ${eyeAbbr(d.eye || R.e)}: ${taper}${d.off ? ` (starts day ${d.off + 1})` : ""}`); });
  if ((R.u || []).length){ lines.push("Usual drops:");
    R.u.forEach(u => lines.push(`- ${u.name || "Unnamed"}: ${u.act === "stop" ? "STOP OU" : "continue " + eyeAbbr(u.act) + " " + ABBR[u.f]}`)); }
  const appts = (R.a || []).filter(a => a.date);
  if (appts.length) lines.push(`Follow-up: ${appts.map(a => a.date + (a.time ? " " + a.time : "")).join("; ")}.`);
  if (R.code) lines.push(`Dropwise code: ${prettyCode(R.code)}`);
  if (R.clinic) lines.splice(1, 0, `Clinic: ${R.clinic}.`);
  return lines.join("\n");
}

/* ---------- Progress: how many dose times on day i were marked done ---------- */
function dayProgress(R, i, done){
  const dk = iso(addDays(parse(R.st), i)), slots = dayPlan(R, i).slots;
  return {total:slots.length, done:slots.filter(s => done[`${dk}|${s.t}`]).length};
}

/* ---------- Shared renderers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const L = (lang,bi,fn) => { const a = fn(T[lang]); if (lang === "en" || !bi) return esc(a); return `${esc(a)}<span class="en" lang="en" dir="ltr">${esc(fn(T.en))}</span>`; };
/* Shape = type of drop (readable in black and white); fill = cap colour */
const SHAPES = {
  antibiotic:'<circle cx="10" cy="10" r="7.6"/>', steroid:'<rect x="3" y="3" width="14" height="14" rx="2"/>',
  nsaid:'<polygon points="10,1.6 18.4,10 10,18.4 1.6,10"/>', cyclo:'<polygon points="10,2 18.6,17.6 1.4,17.6"/>',
  combo:'<polygon points="10,1.5 17.6,5.8 17.6,14.2 10,18.5 2.4,14.2 2.4,5.8"/>', lube:'<circle cx="10" cy="10" r="7.6" stroke-dasharray="3 2"/>',
  usual:'<polygon points="10,1.6 18.4,7.8 15.2,17.8 4.8,17.8 1.6,7.8"/>',
  pga:'<polygon points="10,1.6 18.4,7.8 15.2,17.8 4.8,17.8 1.6,7.8"/>', bb:'<rect x="5" y="1.6" width="10" height="16.8" rx="5"/>',
  aa:'<polygon points="10,18.4 18.6,2.6 1.4,2.6"/>', cai:'<path d="M7 1.8h6v5.2h5.2v6H13v5.2H7V13H1.8V7H7z"/>',
  miotic:'<rect x="1.6" y="5" width="16.8" height="10" rx="5"/>', rock:'<polygon points="6.5,2 13.5,2 18,6.5 18,13.5 13.5,18 6.5,18 2,13.5 2,6.5"/>',
  gcombo:'<polygon points="10,1.5 17.6,5.8 17.6,14.2 10,18.5 2.4,14.2 2.4,5.8"/>', other:'<polygon points="6.5,2 13.5,2 18,6.5 18,13.5 13.5,18 6.5,18 2,13.5 2,6.5"/>'
};
const mark = (cls, cap, size = 18) => `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><g fill="${cap === "none" ? "var(--paper)" : `var(--cap-${cap})`}" stroke="var(--ink)" stroke-width="1.5">${SHAPES[cls] || SHAPES.other}</g></svg>`;
const dropMark = (d, size) => mark(d.m.cls, d.m.cap, size);
const CIRCLED = ["①","②","③","④","⑤","⑥"];
function drugLabel(R, d, lang, bi, full){
  const t = T[lang], m = d.m, mixed = mixedEyes(R);
  const badges = (m.shake ? `<span class="badge">↻ ${esc(t.shake)}</span>` : "") + (m.form === "oint" ? `<span class="badge">${esc(t.oint)}</span>` : "") + (m.form === "gel" ? `<span class="badge">${esc(t.gel)}</span>` : "")
    + (mixed && d.eye ? `<span class="badge eye">${esc(t[d.eye])}</span>` : "");
  const title = full ? `${esc(m.name)}${m.brand ? ` <span class="brand">(${esc(m.brand)})</span>` : ""}` : esc(m.short);
  return `<div class="drug-name">${dropMark(d)}<span dir="ltr">${title}</span>${badges}</div>`
    + (full ? `<div class="drug-cls">${L(lang,bi,x => `${x.cls[m.cls]} · ${x.what[m.cls]}`)}</div>` : "");
}
const ICONS = {
  dawn:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4"/></svg>',
  day:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  dusk:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 11V8M9.5 5.5 12 8l2.5-2.5"/></svg>',
  night:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/></svg>'
};
const dayIcon = m => { const h = m / 60; return h < 11 ? ICONS.dawn : h < 15.5 ? ICONS.day : h < 19.5 ? ICONS.dusk : ICONS.night; };

/* Pictograms for the six how-to steps (wash, shake, pull lid, one drop, close eye and press the inner corner, wait 5 min) */
const PICTO = [
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14h22a8 8 0 0 1 8 8v4"/><path d="M18 8h10M23 8v6"/><path d="M37 26h6"/><path d="M40 33c-2 3-3 5-3 6.5a3 3 0 0 0 6 0c0-1.5-1-3.5-3-6.5Z"/><path d="M14 58V46c0-3 2-5 5-5h2V35a2.5 2.5 0 0 1 5 0v6h2v-4a2.5 2.5 0 0 1 5 0v4h1a5 5 0 0 1 5 5v12"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M26 16h12l-1 6h-10Z"/><path d="M25 22h14v32a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z"/><path d="M29 10h6v6h-6z"/><path d="M14 22c-3 4-3 12 0 16M8 18c-5 7-5 17 0 24M50 22c3 4 3 12 0 16M56 18c5 7 5 17 0 24"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 28c8-10 18-14 26-14s18 4 26 14"/><path d="M6 28c8 8 18 11 26 11s18-3 26-11"/><circle cx="32" cy="27" r="7"/><path d="M14 40c6 6 12 8 18 8s12-2 18-8"/><path d="M32 48v10M27 53l5 5 5-5"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M28 4h8v6h-8z"/><path d="M26 10h12v10l-3 6h-6l-3-6Z"/><path d="M32 30c-2.5 3.5-3.5 5.5-3.5 7a3.5 3.5 0 0 0 7 0c0-1.5-1-3.5-3.5-7Z"/><path d="M6 50c8-8 18-11 26-11s18 3 26 11"/><path d="M6 50c8 6 18 8 26 8s18-2 26-8"/><circle cx="32" cy="50" r="5"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6c5 9 6 24 1 36"/><path d="M20 27c7 8 14 11 21 11s13-3 19-11"/><path d="M27 34l-2 5M35 37l-1 6M43 37l1 6M51 34l3 5"/><path d="M8 63l5-22c1-5 7-6 9-1l-4 23"/><circle cx="18" cy="30" r="2.4" fill="currentColor"/><circle cx="50" cy="13" r="8"/><path d="M50 8v5l3 2"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="30" cy="34" r="22"/><path d="M30 18v16l10 6"/><path d="M24 6h12"/><text x="49" y="62" font-size="17" font-weight="700" fill="currentColor" stroke="none" font-family="sans-serif">5</text></svg>'
];

function rangeLabel(lang, start, sg){
  const a = shortDate(lang, addDays(start, sg.a));
  return sg.b === Infinity ? `${a} →` : `${a} – ${shortDate(lang, addDays(start, sg.b - 1))}`;
}
function glanceHTML(R, lang, bi, todayIdx){
  const start = parse(R.st), t = T[lang], segs = segments(R), drops = allDrops(R);
  const cols = drops.map((_,k) => k).filter(k => segs.some(s => s.per[k] !== null));
  const head = cols.map(k => `<th scope="col">${drugLabel(R, drops[k], lang, false, false)}</th>`).join("");
  const rows = segs.map(sg => {
    const now = todayIdx != null && todayIdx >= sg.a && todayIdx < sg.b;
    const cells = cols.map(k => { const f = sg.per[k], d = drops[k];
      if (!f) return `<td><span class="cell-none">—</span></td>`;
      if (/^\d+$/.test(f)) return `<td><span class="dots" role="img" aria-label="${esc(freqStr(lang,f))}">${dropMark(d,17).repeat(+f)}</span></td>`;
      return `<td><span class="cell-note">${dropMark(d,15)} ${esc(freqStr(lang,f))}</span></td>`; }).join("");
    return `<tr${now ? ' class="now"' : ""}><td class="range"><span class="no-wrap">${esc(shortDate(lang, addDays(start, sg.a)))}</span> <span class="no-wrap">${sg.b === Infinity ? "→" : "– " + esc(shortDate(lang, addDays(start, sg.b - 1)))}</span><small>${esc(sg.b === Infinity ? t.untilTold : t.dur(sg.b - sg.a))}</small></td>${cells}</tr>`;
  }).join("");
  return `<div class="tbl-wrap"><table class="glance"><thead><tr><th scope="col">${L(lang,bi,x=>x.colDates)}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="key">${L(lang,bi,x=>x.shapeKey)}</p>`;
}
function legendHTML(R, lang, bi){
  /* One entry per distinct mark; which eye is shown by the per-eye tables */
  const seen = new Set(), flat = {...R, u:[], d:R.d.map(d => ({...d, eye:R.e}))};
  const items = allDrops(flat).filter(d => !d.usual).filter(d => { const k = d.m.name + d.m.cls + d.m.cap; if (seen.has(k)) return false; seen.add(k); return true; });
  return `<div class="legend">${items.map(d => `<div>${bottleHTML(flat, d, lang, bi, {full:true, purpose:true, eye:false})}</div>`).join("")}</div>`;
}
/* Split the regimen by eye when drops differ between eyes: [{eye, R'}]; a "both eyes" drop appears in each */
function byEye(R){
  if (!mixedEyes(R)) return [{eye:null, R}];
  const used = new Set(allDrops(R).map(d => d.eye || R.e));
  const eyes = ["R","L"].filter(e => used.has(e) || used.has("B"));
  return eyes.map(e => ({eye:e, R:{...R, d:R.d.filter(d => (d.eye || R.e) === e || d.eye === "B"), u:(R.u || []).filter(u => u.act === e || u.act === "B")}}))
    .filter(x => allDrops(x.R).length);
}
function scheduleHTML(R, lang, bi){
  return byEye(R).map(({eye, R:r}) => (eye ? `<h4 class="eye-head"><span class="badge eye">${esc(T[lang][eye])}</span>${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(T.en[eye])}</span>` : ""}</h4>` : "")
    + whenHTML({...r, d:r.d.map(d => ({...d, eye:R.e})), u:(r.u || []).map(u => ({...u, act:R.e})), e:R.e}, lang, bi)).join("");
}
function whenHTML(R, lang, bi){
  /* One compact table: rows = taper stages, columns = clock times, cells = the drops due, in the order they go in */
  const start = parse(R.st), segs = segments(R), plans = segs.map(sg => dayPlan(R, sg.a));
  const times = [...new Set(plans.flatMap(p => p.slots.map(s => s.t)))].sort((a,b) => a-b);
  const ordered = plans.some(p => p.slots.some(s => s.drugs.length > 1));
  const head = times.map(t => `<th scope="col">${dayIcon(t)}<span class="tnum">${esc(fmtTime(lang,t))}</span></th>`).join("");
  const rows = segs.map((sg,i) => {
    const plan = plans[i], drops = plan.drops;
    const cells = times.map(t => { const s = plan.slots.find(x => x.t === t);
      return `<td>${s ? `<span class="seq">${s.drugs.map(k => dropMark(drops[k], 17)).join('<i class="arrow" aria-hidden="true"></i>')}</span>` : ""}</td>`; }).join("");
    const prn = plan.prn.length ? `<small class="prn">${plan.prn.map(k => dropMark(drops[k], 13)).join("")} ${esc(freqStr(lang,"prn"))}</small>` : "";
    return `<tr><td class="range">${esc(rangeLabel(lang, start, sg))}${prn}</td>${cells}</tr>`;
  }).join("");
  return (ordered ? `<p class="order-note">${L(lang,bi,x=>x.order)}</p>` : "")
    + `<div class="tbl-wrap"><table class="when-tbl"><thead><tr><th scope="col">${L(lang,bi,x=>x.colDates)}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function usualHTML(R, lang, bi){
  if (!(R.u || []).length) return "";
  const act = {B:"keepB", R:"keepR", L:"keepL", stop:"stopAll"};
  return `<ul class="usual">${R.u.map(u => `<li class="${u.act === "stop" ? "stop" : ""}">${mark("usual", u.cap)}<span class="u-name" dir="ltr">${esc(u.name || "—")}</span>
    <span class="u-act">${L(lang,bi,x => x[act[u.act]] + (u.act !== "stop" ? " · " + (/^\d+$/.test(u.f) ? x.fq.n(+u.f) : x.fq[u.f]) : ""))}</span></li>`).join("")}</ul>`;
}
function apptHTML(R, lang){
  const a = (R.a || []).filter(x => x.date); if (!a.length) return "";
  return `<ul class="appts">${a.map(x => `<li><b>${esc(fullDate(lang, parse(x.date)))}</b>${x.time ? ` · <span class="tnum">${esc(fmtTime(lang, (+x.time.slice(0,2))*60 + (+x.time.slice(3))))}</span>` : ""}</li>`).join("")}</ul>`;
}
function howSteps(R, lang){
  const shake = allDrops(R).some(d => d.m.shake);
  return [0,1,2,3,4,5].filter(i => shake || i !== 1).map(i => ({icon:PICTO[i], text:T[lang].how[i], en:T.en.how[i]}));
}
function howHTML(R, lang, bi){
  return `<ol class="how-grid">${howSteps(R, lang).map(s => `<li><span class="picto" aria-hidden="true">${s.icon}</span><span>${esc(s.text)}${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(s.en)}</span>` : ""}</span></li>`).join("")}</ol>`;
}
function listHTML(arr, en, bi, lang){
  return arr.map((s,i) => `<li>${esc(s)}${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(en[i])}</span>` : ""}</li>`).join("");
}
function warnings(R, lang){
  if (R.s === "glaucoma") return [[...T[lang].warnG], [...T.en.warnG]];
  const w = [...T[lang].warn], we = [...T.en.warn];
  if (R.s === "ppv"){ w.splice(3,0,T[lang].ppvWarn); we.splice(3,0,T.en.ppvWarn); }
  return [w, we];
}

/* ---------- Bottle label: cap colour in words, generic and brand name, badges ---------- */
function bottleHTML(R, d, lang, bi, o = {}){
  const t = T[lang], m = d.m, size = o.size || 26;
  const head = m.cap !== "none" ? capWord(m.cap, lang) : m.short;
  const headEn = m.cap !== "none" ? capWord(m.cap, "en") : m.short;
  const name = `${esc(o.full ? m.name : m.short)}${m.brand ? ` <span class="brand">(${esc(m.brand)})</span>` : ""}`;
  const badges = (m.shake ? `<span class="badge">↻ ${esc(t.shake)}</span>` : "") + (m.form === "oint" ? `<span class="badge">${esc(t.oint)}</span>` : "") + (m.form === "gel" ? `<span class="badge">${esc(t.gel)}</span>` : "")
    + (o.eye && (d.eye || R.e) ? `<span class="badge eye">${esc(t[d.eye || R.e])}</span>` : "");
  const enCap = bi && lang !== "en" && m.cap !== "none" ? `<span class="en-in" lang="en" dir="ltr">${esc(headEn)}</span>` : "";
  if (o.compact) return `<div class="bottle">${mark(m.cls, m.cap, size)}<div class="b-text">
    <div class="b-cap">${esc(head)} ${enCap}</div>
    <div class="b-name">${m.cap !== "none" ? `<span dir="ltr">${name}</span> ` : ""}${badges}</div>${o.extra || ""}</div></div>`;
  return `<div class="bottle">${mark(m.cls, m.cap, size)}<div class="b-text">
    <div class="b-cap">${esc(head)} ${enCap}</div>
    ${m.cap !== "none" || o.full ? `<div class="b-name" dir="ltr">${name}</div>` : ""}
    ${badges ? `<div class="b-badges">${badges}</div>` : ""}
    ${o.purpose ? `<div class="b-what">${L(lang,bi,x => `${x.cls[m.cls]} · ${x.what[m.cls]}`)}</div>` : ""}
    ${o.extra || ""}</div></div>`;
}

/* ---------- Pill cards (AHRQ pill-card layout): one card per taper stage; rows = bottles, columns = time of day ---------- */
function slotHeadHTML(lang, bi){
  return SLOTS.map(([m, k]) => `<th scope="col">${dayIcon(m)}<span class="s-name">${esc(T[lang].slot[k])}</span>${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(T.en.slot[k])}</span>` : ""}<span class="s-time">${esc(fmtTime(lang, m))}</span></th>`).join("");
}
function pillCardsHTML(R, lang, bi, todayIdx){
  const t = T[lang], start = parse(R.st), info = isInfo(R), eyeBadge = info && mixedEyes(R);
  let ordered = false;
  const cardsFor = r => segments(r).map(sg => {
    const drops = allDrops(r), plan = dayPlan(r, sg.a);
    const rank = k => FORM_RANK[drops[k].m.form] ?? 0;
    const rows = drops.map((_,k) => k).filter(k => sg.per[k]).sort((a,b) => rank(a) - rank(b) || a - b);
    const shared = plan.slots.some(s => s.drugs.length > 1); if (shared) ordered = true;
    const now = !info && todayIdx != null && todayIdx >= sg.a && todayIdx < sg.b;
    const body = rows.map((k, n) => {
      const d = drops[k], f = sg.per[k], end = isOngoing(d) ? Infinity : finiteEnd(d);
      const extra = info ? "" : end !== Infinity && sg.b === end ? `<div class="b-last">${esc(t.lastDay(shortDate(lang, addDays(start, end - 1))))}</div>`
        : (end === Infinity && sg.b === Infinity ? `<div class="b-last">${esc(t.untilTold)}</div>` : "");
      const cells = fitsSlots(f)
        ? SLOTS.map(([m]) => `<td>${TIMES[f].includes(m) ? `<span class="dose" role="img" aria-label="${esc(t.slot[SLOT_OF[m]])}">${mark(d.m.cls, d.m.cap, 24)}</span>` : ""}</td>`).join("")
        : `<td colspan="4" class="span">${mark(d.m.cls, d.m.cap, 18)} ${esc(freqStr(lang, f))}</td>`;
      return `<tr><td class="pc-name">${shared && rows.length > 1 ? `<b class="num">${CIRCLED[n] || n + 1}</b>` : ""}${bottleHTML(r, d, lang, bi, {size:22, extra, compact:true, eye:eyeBadge})}</td>${cells}</tr>`;
    }).join("");
    const head = info ? `<span>${L(lang,bi,x => x.everyDay)}</span>`
      : `<span class="tnum">${esc(rangeLabel(lang, start, sg))}</span>
      <small>${esc(sg.b === Infinity ? t.untilTold : t.dur(sg.b - sg.a))}</small>${now ? `<span class="badge today">${esc(t.today)}</span>` : ""}`;
    return `<section class="pcard${now ? " now" : ""}"><header>${head}</header>
      <table class="pc"><thead><tr><th scope="col"></th>${slotHeadHTML(lang, bi)}</tr></thead><tbody>${body}</tbody></table></section>`;
  }).join("");
  /* Glaucoma: one "every day" card with an eye badge on each bottle. After surgery: one set of cards per eye. */
  const parts = info ? `<div class="pcards one">${cardsFor(R)}</div>` : byEye(R).map(({eye, R:r}) => (eye ? `<h4 class="eye-head"><span class="badge eye">${esc(t[eye])}</span>${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(T.en[eye])}</span>` : ""}</h4>` : "")
    + `<div class="pcards">${cardsFor({...r, d:r.d.map(d => ({...d, eye:R.e})), u:(r.u || []).map(u => ({...u, act:R.e})), e:R.e})}</div>`).join("");
  return (ordered ? `<p class="order-note">${L(lang,bi,x=>x.order)}</p>` : "") + parts + `<p class="key">${L(lang,bi,x=>x.markKey)} <b>${L(lang,bi,x=>x.capWarn)}</b></p>`;
}

/* ---------- Glaucoma information cards: each bottle, how often, which eye, and its possible side effects ---------- */
const sideEffects = (m, lang) => { const se = T[lang].se || {}; return [...new Set((m.comps || [m.cls]).map(c => se[c]).filter(Boolean))]; };
const both = (lang, bi, fn) => esc(fn(lang)) + (bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(fn("en"))}</span>` : "");
const CLOCK = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
/* List punctuation per script: 、 for Chinese and Japanese, ، for Arabic */
const SEP = {"zh-Hans":"、","zh-Hant":"、",ja:"、",ar:"، "}, COLON = {"zh-Hans":"：","zh-Hant":"：",ja:"："};
function whenWords(f, lang){
  const t = T[lang], base = freqStr(lang, f);
  return /^\d+$/.test(f) && fitsSlots(f) ? `${base}${COLON[lang] || ": "}${TIMES[f].map(m => t.slot[SLOT_OF[m]]).join(SEP[lang] || ", ")}` : base;
}
/* A table rather than cards: one row per bottle (name, eye, how often | possible side effects) keeps the sheet to one page */
function infoHTML(R, lang, bi, o = {}){
  const t = T[lang], drops = allDrops({...R, u:[]});
  const rows = drops.map(d => {
    const m = d.m, f = (d.phases[d.phases.length - 1] || {f:"1"}).f, se = sideEffects(m, lang);
    const badges = `<span class="badge eye">${esc(t[d.eye || R.e])}</span>` + (m.shake ? `<span class="badge">↻ ${esc(t.shake)}</span>` : "")
      + (m.form === "gel" ? `<span class="badge">${esc(t.gel)}</span>` : "") + (m.form === "oint" ? `<span class="badge">${esc(t.oint)}</span>` : "");
    /* Single glaucoma drops all read "Glaucoma drop", so the type is only shown for combinations and other drops */
    const cls = ["pga","bb","aa","cai","miotic","rock"].includes(m.cls) ? "" : `<div class="info-cls">${L(lang, bi, x => x.cls[m.cls])}</div>`;
    /* When to use each drop is in the "every day" card just above; o.when adds it here too (the phone page) */
    return `<tr><td class="info-drop"><div class="info-name">${mark(m.cls, m.cap, 22)}<div><span dir="ltr"><b>${esc(m.name)}</b>${m.brand ? ` <span class="brand">(${esc(m.brand)})</span>` : ""}</span>
      <div class="b-badges">${badges}</div>${cls}${o.when ? `<div class="info-when">${CLOCK}<span>${both(lang, bi, l => whenWords(f, l))}</span></div>` : ""}</div></div></td>
      <td class="info-se"><b class="se-lbl">${L(lang, bi, x => x.sideT)}</b>${se.length ? both(lang, bi, l => sideEffects(m, l).join(" ")) : "—"}</td></tr>`;
  }).join("");
  return `<table class="info-tbl"><thead><tr><th scope="col"><span class="sr-only">${L(lang, bi, x => x.gInfoT)}</span></th><th scope="col">${L(lang, bi, x => x.sideT)}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* Spoken text for one dose time: time, then each bottle in order with cap colour, generic, brand and eye */
function speakDose(R, plan, s, lang){
  const t = T[lang], name = slotName(lang, s.t);
  const parts = s.drugs.map(k => { const d = plan.drops[k], m = d.m;
    return [m.cap !== "none" ? capWord(m.cap, lang) : "", m.short, m.brand, t[d.eye || R.e], m.shake ? t.shake : ""].filter(Boolean).join(", "); });
  return `${name ? name + ", " : ""}${fmtTime(lang, s.t).replace(/\.$/, "")}. ${parts.join(". ")}.${s.drugs.length > 1 ? " " + t.order : ""}`;
}

return {LIB,CAPS,CLASSES,FORMS,FREQS,TIMES,PRESETS,SURGERIES,BASIS,LANGS,LOCALE,VOICE,T,
  prettyCode,iso,parse,addDays,dayDiff,fmtTime,fmtDate,shortDate,fullDate,freqStr,hashCode,
  surgName,surgLabel,dayProgress,GLAUCOMA_CLS,isGlaucomaDrug,isInfo,shownEye,infoHTML,sideEffects,whenWords,meta,allDrops,phaseOn,horizon,hasOngoing,isOngoing,dayPlan,segments,mixedEyes,encode,decode,buildICS,chartNote,
  SLOTS,SLOT_OF,fitsSlots,capWord,slotName,bottleHTML,pillCardsHTML,speakDose,esc,L,mark,dropMark,drugLabel,dayIcon,CIRCLED,glanceHTML,legendHTML,whenHTML,scheduleHTML,byEye,usualHTML,apptHTML,howSteps,howHTML,listHTML,warnings};
})();
if (typeof module !== "undefined") module.exports = DW;
