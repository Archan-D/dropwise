/* Dropwise core: drug library, presets, translations, scheduling maths, link encoding,
   calendar (.ics) export and the shared "at a glance" / "what and when" renderers.
   Used by both index.html (clinician builder) and patient.html (patient phone page). */
const DW = (() => {

/* ---------- Drug library (cap colours follow the AAO topical ocular cap colour code) ---------- */
const LIB = {
  moxi:{name:"Moxifloxacin 0.5%",cls:"antibiotic",cap:"tan"},
  tobra:{name:"Tobramycin 0.3%",cls:"antibiotic",cap:"tan"},
  pred:{name:"Prednisolone acetate 1%",cls:"steroid",cap:"pink",shake:true},
  dex:{name:"Dexamethasone 0.1%",cls:"steroid",cap:"pink"},
  fml:{name:"Fluorometholone 0.1%",cls:"steroid",cap:"pink",shake:true},
  ketor:{name:"Ketorolac 0.5%",cls:"nsaid",cap:"gray"},
  nepaf:{name:"Nepafenac 0.1%",cls:"nsaid",cap:"gray",shake:true},
  atro:{name:"Atropine 1%",cls:"cyclo",cap:"red"},
  cyclo:{name:"Cyclopentolate 1%",cls:"cyclo",cap:"red"},
  tears:{name:"Preservative-free artificial tears",cls:"lube",cap:"none"}
};
const FREQS = [["1","1×/day"],["2","2×/day"],["3","3×/day"],["4","4×/day"],["5","5×/day"],["6","6×/day"],["q2h","q2h while awake"],["q1h","q1h while awake"],["prn","As needed"]];

/* ---------- Presets: [drug, [[freq, days], ...]] ---------- */
const PRESETS = {
  cataract:[["moxi",[["4",7]]],["pred",[["4",7],["3",7],["2",7],["1",7]]],["ketor",[["4",28]]]],
  trab:[["moxi",[["4",14]]],["pred",[["q2h",7],["4",35],["3",7],["2",7],["1",7]]]],
  ppv:[["moxi",[["4",7]]],["pred",[["4",7],["3",7],["2",7],["1",7]]],["atro",[["1",7]]]],
  dmek:[["moxi",[["4",7]]],["pred",[["4",90],["3",30],["2",30],["1",215]]]],
  prk:[["moxi",[["4",7]]],["fml",[["4",7],["3",7],["2",7],["1",7]]],["tears",[["prn",30]]]],
  lasik:[["moxi",[["4",7]]],["pred",[["4",7]]],["tears",[["prn",30]]]]
};
const BASIS = {
  cataract:{txt:"Fluoroquinolone QID × 1 wk; prednisolone 1% QID tapered weekly 4/3/2/1; NSAID QID × 4 wk.",src:[["Control arm, NCT06681688","https://clinicaltrials.gov/study/NCT06681688"],["Standard-drops arm, PMC9325575","https://pmc.ncbi.nlm.nih.gov/articles/PMC9325575/"]]},
  trab:{txt:"Antibiotic QID; intensive steroid (q1–2h) for the first days, then 4–6×/day, reduced by one drop per week after ~6 wk (≈9 wk total).",src:[["Community Eye Health: care after glaucoma surgery","https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5100471/"],["SNAP trial regimen, PMC9784245","https://pmc.ncbi.nlm.nih.gov/articles/PMC9784245/"]]},
  ppv:{txt:"Antibiotic QID × 1 wk; prednisolone 1% 4/3/2/1 weekly; atropine 1% daily × 1 wk.",src:[["Mass Eye and Ear Dropless PPV Study, NCT05331664","https://clinicaltrials.gov/study/NCT05331664"],["Retina Specialist: post-op drop survey","https://www.retina-specialist.com/article/rethinking-routine-use-of-steroid-drops-after-surgery"]]},
  dmek:{txt:"Steroid QID months 1–3, TID month 4, BID month 5, daily months 6–12; many surgeons continue low-dose steroid long term. Antibiotic in week 1 is a common default.",src:[["AAO: low-dose steroids after DMEK","https://www.aao.org/editors-choice/very-weak-steroids-effective-after-dmek"],["Cornea surgeon survey, PMC13317915","https://pmc.ncbi.nlm.nih.gov/articles/PMC13317915/"]]},
  prk:{txt:"Fluoroquinolone QID until bandage lens removal (~1 wk); FML tapered from QID over 4 wk; preservative-free tears as needed.",src:[["Healio: PRK post-op regimens","https://www.healio.com/news/ophthalmology/20120331/at-issue-preferred-regimen-for-curing-haze-after-prk"],["Walter Reed PRK post-op instructions","https://walterreed.tricare.mil/Portals/126/PRK%20Postop%20Instructions.pdf"]]},
  lasik:{txt:"Antibiotic and steroid QID × 1 wk; artificial tears as needed.",src:[["UCLA Health: LASIK & PRK post-op instructions","https://www.uclahealth.org/medical-services/ophthalmology/laser-refractive-surgery/your-visit/postoperative-instructions"]]}
};

const LANGS = [["zh-Hans","中文（普通话）· Mandarin"],["zh-Hant","中文（粵語）· Cantonese"],["pa","ਪੰਜਾਬੀ · Punjabi"],["ar","العربية · Arabic"],["ko","한국어 · Korean"],["vi","Tiếng Việt · Vietnamese"],["ja","日本語 · Japanese"],["en","English"]];
const LOCALE = {en:"en-CA","zh-Hans":"zh-CN","zh-Hant":"zh-HK",pa:"pa-IN",ar:"ar-u-nu-latn",ko:"ko-KR",vi:"vi-VN",ja:"ja-JP"};
/* Speech voices. Cantonese must never fall back to a Mandarin voice, so it lists only Cantonese codes. */
const VOICE = {en:["en-CA","en-US","en-GB","en"],"zh-Hans":["zh-CN","cmn-CN","zh"],"zh-Hant":["zh-HK","yue-HK","yue"],pa:["pa-IN","pa"],ar:["ar-SA","ar-EG","ar"],ko:["ko-KR","ko"],vi:["vi-VN","vi"],ja:["ja-JP","ja"]};

/* ---------- Patient-facing text (AI draft: needs certified medical translator review) ---------- */
const T = {
en:{title:"Your eye drop schedule",patient:"Patient",surgery:"Surgery",surgeryDate:"Surgery date",startDate:"Start drops",clinic:"Clinic phone",
 R:"Right eye",L:"Left eye",
 surg:{cataract:"Cataract surgery",trab:"Trabeculectomy (glaucoma surgery)",ppv:"Vitrectomy (retina surgery)",dmek:"Corneal transplant (DMEK)",prk:"PRK laser vision correction",lasik:"LASIK laser vision correction"},
 cls:{antibiotic:"Antibiotic",steroid:"Steroid",nsaid:"Anti-inflammatory",cyclo:"Dilating drop",lube:"Artificial tears"},
 what:{antibiotic:"Prevents infection",steroid:"Reduces inflammation",nsaid:"Reduces swelling and pain",cyclo:"Relaxes the eye and eases pain",lube:"Soothes dryness"},
 colDates:"Dates",
 howT:"How to use your drops",
 how:["Wash your hands.","If the drop is milky, shake the bottle first (marked ↻).","Tilt your head back, look up, and gently pull down your lower eyelid.","Put in one drop. Do not let the bottle tip touch your eye or eyelashes.","Close your eye gently for 1 minute. Do not rub or squeeze.","Wait 5 minutes before putting in a different drop."],
 shake:"Shake well",
 warnT:"Call your eye doctor right away, or go to Emergency, if you have:",
 warn:["Pain that is getting worse","Vision that is getting worse","More redness, swelling, or yellow/green discharge","Nausea or vomiting with eye pain"],
 ppvWarn:"Flashes of light, many new floaters, or a shadow or curtain over your vision",
 tipsT:"Special instructions",
 tips:{cataract:["Wear the eye shield when you sleep for the first week.","Do not rub or press on your eye.","Avoid swimming and hot tubs for 2 weeks.","Reading, walking and watching TV are fine."],
  trab:["Wear the eye shield when you sleep.","Do not rub or press on your eye.","Avoid heavy lifting, bending over and hard exercise until your surgeon says it is OK.","Do not use your old glaucoma drops in the operated eye unless your surgeon tells you to."],
  ppv:["If you have a gas bubble, keep your head in the position your surgeon told you.","With a gas bubble, do not fly or travel to high altitudes. Tell any doctor who gives you anesthesia.","Wear the eye shield when you sleep.","Do not rub or press on your eye."],
  dmek:["In the first days, lie flat on your back, face up, as much as your surgeon told you.","Wear the eye shield when you sleep.","Your steroid drop is long-term. Never stop it without asking your surgeon.","Sudden redness, light sensitivity or blurry vision can mean graft rejection. Call the same day."],
  prk:["Do not take out the bandage contact lens. Your doctor will remove it.","If the lens falls out, do not put it back. Call the clinic.","Pain, tearing and light sensitivity are common for the first 3 days.","Wear sunglasses outdoors."],
  lasik:["Do not rub your eyes for at least 1 week.","Wear the eye shields when you sleep for the first week.","Avoid swimming and hot tubs for 2 weeks.","Use artificial tears often if your eyes feel dry."]},
 bring:"Bring this sheet and all your eye drops to every visit.",footQ:"Questions? Call",
 fq:{n:n=>n==1?"Once a day":`${n} times a day`,q2h:"Every 2 hours while awake",q1h:"Every hour while awake",prn:"As needed"}},

"zh-Hans":{title:"您的眼药水使用时间表",patient:"患者",surgery:"手术",surgeryDate:"手术日期",startDate:"开始用药",clinic:"诊所电话",
 R:"右眼",L:"左眼",
 surg:{cataract:"白内障手术",trab:"小梁切除术（青光眼手术）",ppv:"玻璃体切除术（视网膜手术）",dmek:"角膜移植（DMEK）",prk:"PRK激光视力矫正",lasik:"LASIK激光视力矫正"},
 cls:{antibiotic:"抗生素",steroid:"类固醇",nsaid:"消炎药",cyclo:"散瞳药",lube:"人工泪液"},
 what:{antibiotic:"预防感染",steroid:"减轻炎症",nsaid:"减轻肿胀和疼痛",cyclo:"放松眼睛，缓解疼痛",lube:"缓解眼干"},
 colDates:"日期",
 howT:"如何滴眼药水",
 how:["洗手。","如果药水是乳白色的，使用前先摇匀（标有 ↻）。","头向后仰，眼睛向上看，轻轻拉下下眼睑。","滴入一滴。不要让瓶口碰到眼睛或睫毛。","轻轻闭眼1分钟。不要揉眼或用力挤眼。","等5分钟后再滴另一种眼药水。"],
 shake:"使用前摇匀",
 warnT:"如出现以下情况，请立即联系眼科医生或去急诊：",
 warn:["疼痛越来越严重","视力越来越差","眼睛更红、更肿，或有黄色/绿色分泌物","眼痛并伴有恶心或呕吐"],
 ppvWarn:"看到闪光、突然出现很多飞蚊，或视野中有阴影或像帘子一样的遮挡",
 tipsT:"特别注意事项",
 tips:{cataract:["第一周睡觉时戴上眼罩。","不要揉眼睛或按压眼睛。","2周内避免游泳和泡热水浴。","可以阅读、散步和看电视。"],
  trab:["睡觉时戴上眼罩。","不要揉眼睛或按压眼睛。","在医生允许之前，避免提重物、弯腰和剧烈运动。","除非医生要求，否则手术眼不要再使用以前的青光眼药水。"],
  ppv:["如果眼内有气泡，请保持医生要求的头部姿势。","眼内有气泡时，不要坐飞机或去高海拔地区。如需麻醉，请告诉医生。","睡觉时戴上眼罩。","不要揉眼睛或按压眼睛。"],
  dmek:["术后头几天，按照医生的要求尽量平躺、脸朝上。","睡觉时戴上眼罩。","类固醇眼药水需要长期使用。未经医生同意，切勿停药。","如果突然眼红、怕光或视力模糊，可能是排斥反应。请当天联系医生。"],
  prk:["不要自己取出绷带隐形眼镜，医生会为您取出。","如果镜片掉出，不要再戴回去，请联系诊所。","前3天出现疼痛、流泪和怕光是常见的。","外出时戴太阳镜。"],
  lasik:["至少1周内不要揉眼睛。","第一周睡觉时戴上眼罩。","2周内避免游泳和泡热水浴。","如果眼睛干，经常使用人工泪液。"]},
 bring:"每次复诊时，请带上这张表和所有眼药水。",footQ:"有问题？请致电",
 fq:{n:n=>`每天${n}次`,q2h:"醒着时每2小时一次",q1h:"醒着时每小时一次",prn:"需要时使用"}},

"zh-Hant":{title:"你的眼藥水使用時間表",patient:"病人",surgery:"手術",surgeryDate:"手術日期",startDate:"開始用藥",clinic:"診所電話",
 R:"右眼",L:"左眼",
 surg:{cataract:"白內障手術",trab:"小樑切除術（青光眼手術）",ppv:"玻璃體切除術（視網膜手術）",dmek:"角膜移植（DMEK）",prk:"PRK激光矯視",lasik:"LASIK激光矯視"},
 cls:{antibiotic:"抗生素",steroid:"類固醇",nsaid:"消炎藥",cyclo:"放大瞳孔藥水",lube:"人工淚液"},
 what:{antibiotic:"預防感染",steroid:"減輕發炎",nsaid:"減輕腫脹和痛楚",cyclo:"放鬆眼睛，紓緩痛楚",lube:"紓緩眼乾"},
 colDates:"日期",
 howT:"如何滴眼藥水",
 how:["洗手。","如藥水呈奶白色，使用前先搖勻（標有 ↻）。","頭向後仰，眼向上望，輕輕拉下下眼瞼。","滴入一滴。切勿讓瓶口觸及眼睛或眼睫毛。","輕輕閉上眼睛1分鐘。不要揉眼或用力擠眼。","等候5分鐘後才滴另一種眼藥水。"],
 shake:"使用前搖勻",
 warnT:"如出現以下情況，請立即聯絡眼科醫生或前往急症室：",
 warn:["痛楚越來越嚴重","視力越來越差","眼睛更紅、更腫，或有黃色／綠色分泌物","眼痛並伴有噁心或嘔吐"],
 ppvWarn:"看見閃光、突然出現很多飛蚊，或視野中有陰影或像簾幕般的遮擋",
 tipsT:"特別注意事項",
 tips:{cataract:["首星期睡覺時戴上眼罩。","不要揉眼或按壓眼睛。","兩星期內避免游泳及浸熱水池。","可以閱讀、散步和看電視。"],
  trab:["睡覺時戴上眼罩。","不要揉眼或按壓眼睛。","在醫生批准前，避免提重物、彎腰和劇烈運動。","除非醫生指示，否則手術眼不要再用以前的青光眼藥水。"],
  ppv:["如眼內有氣泡，請保持醫生指示的頭部姿勢。","眼內有氣泡時，切勿乘搭飛機或前往高海拔地方。如需麻醉，請告知醫生。","睡覺時戴上眼罩。","不要揉眼或按壓眼睛。"],
  dmek:["術後首幾天，按醫生指示盡量平躺、面向上。","睡覺時戴上眼罩。","類固醇眼藥水需要長期使用。未經醫生同意，切勿停藥。","如突然眼紅、畏光或視力模糊，可能是排斥反應，請即日聯絡醫生。"],
  prk:["不要自行除下繃帶隱形眼鏡，醫生會替你除下。","如鏡片掉出，不要再戴回，請聯絡診所。","首3天出現痛楚、流淚和畏光屬常見情況。","外出時戴太陽眼鏡。"],
  lasik:["最少1星期內不要揉眼。","首星期睡覺時戴上眼罩。","兩星期內避免游泳及浸熱水池。","如眼睛乾澀，可經常使用人工淚液。"]},
 bring:"每次覆診時，請帶備此表及所有眼藥水。",footQ:"如有疑問，請致電",
 fq:{n:n=>`每日${n}次`,q2h:"清醒時每2小時一次",q1h:"清醒時每小時一次",prn:"有需要時使用"}},

pa:{title:"ਤੁਹਾਡੀਆਂ ਅੱਖਾਂ ਦੀਆਂ ਬੂੰਦਾਂ ਦੀ ਸਮਾਂ-ਸਾਰਣੀ",patient:"ਮਰੀਜ਼",surgery:"ਸਰਜਰੀ",surgeryDate:"ਸਰਜਰੀ ਦੀ ਤਾਰੀਖ",startDate:"ਬੂੰਦਾਂ ਸ਼ੁਰੂ ਕਰੋ",clinic:"ਕਲੀਨਿਕ ਦਾ ਫ਼ੋਨ",
 R:"ਸੱਜੀ ਅੱਖ",L:"ਖੱਬੀ ਅੱਖ",
 surg:{cataract:"ਮੋਤੀਆਬਿੰਦ ਦੀ ਸਰਜਰੀ",trab:"ਟ੍ਰੈਬੇਕੁਲੈਕਟੋਮੀ (ਕਾਲੇ ਮੋਤੀਏ ਦੀ ਸਰਜਰੀ)",ppv:"ਵਿਟਰੈਕਟੋਮੀ (ਰੈਟਿਨਾ ਦੀ ਸਰਜਰੀ)",dmek:"ਕੌਰਨੀਆ ਟ੍ਰਾਂਸਪਲਾਂਟ (DMEK)",prk:"PRK ਲੇਜ਼ਰ ਨਜ਼ਰ ਸੁਧਾਰ",lasik:"LASIK ਲੇਜ਼ਰ ਨਜ਼ਰ ਸੁਧਾਰ"},
 cls:{antibiotic:"ਐਂਟੀਬਾਇਓਟਿਕ",steroid:"ਸਟੀਰੌਇਡ",nsaid:"ਸੋਜ-ਰੋਧੀ ਦਵਾਈ",cyclo:"ਪੁਤਲੀ ਫੈਲਾਉਣ ਵਾਲੀ ਬੂੰਦ",lube:"ਨਕਲੀ ਹੰਝੂ"},
 what:{antibiotic:"ਇਨਫੈਕਸ਼ਨ ਤੋਂ ਬਚਾਉਂਦੀ ਹੈ",steroid:"ਸੋਜ ਘਟਾਉਂਦੀ ਹੈ",nsaid:"ਸੋਜ ਅਤੇ ਦਰਦ ਘਟਾਉਂਦੀ ਹੈ",cyclo:"ਅੱਖ ਨੂੰ ਆਰਾਮ ਦਿੰਦੀ ਹੈ ਅਤੇ ਦਰਦ ਘਟਾਉਂਦੀ ਹੈ",lube:"ਖੁਸ਼ਕੀ ਤੋਂ ਰਾਹਤ ਦਿੰਦੀ ਹੈ"},
 colDates:"ਤਾਰੀਖਾਂ",
 howT:"ਬੂੰਦਾਂ ਕਿਵੇਂ ਪਾਉਣੀਆਂ ਹਨ",
 how:["ਆਪਣੇ ਹੱਥ ਧੋਵੋ।","ਜੇ ਬੂੰਦ ਦੁੱਧ ਵਰਗੀ ਚਿੱਟੀ ਹੈ ਤਾਂ ਪਹਿਲਾਂ ਸ਼ੀਸ਼ੀ ਨੂੰ ਹਿਲਾਓ (↻ ਨਾਲ ਦਰਸਾਇਆ ਗਿਆ ਹੈ)।","ਸਿਰ ਪਿੱਛੇ ਝੁਕਾਓ, ਉੱਪਰ ਦੇਖੋ, ਅਤੇ ਹੇਠਲੀ ਪਲਕ ਨੂੰ ਹੌਲੀ ਜਿਹੀ ਹੇਠਾਂ ਖਿੱਚੋ।","ਇੱਕ ਬੂੰਦ ਪਾਓ। ਸ਼ੀਸ਼ੀ ਦੀ ਨੋਕ ਨੂੰ ਅੱਖ ਜਾਂ ਪਲਕਾਂ ਨਾਲ ਨਾ ਛੂਹਣ ਦਿਓ।","1 ਮਿੰਟ ਲਈ ਅੱਖ ਹੌਲੀ ਜਿਹੀ ਬੰਦ ਰੱਖੋ। ਅੱਖ ਨੂੰ ਨਾ ਮਲੋ ਅਤੇ ਨਾ ਹੀ ਜ਼ੋਰ ਨਾਲ ਘੁੱਟੋ।","ਦੂਜੀ ਬੂੰਦ ਪਾਉਣ ਤੋਂ ਪਹਿਲਾਂ 5 ਮਿੰਟ ਉਡੀਕ ਕਰੋ।"],
 shake:"ਚੰਗੀ ਤਰ੍ਹਾਂ ਹਿਲਾਓ",
 warnT:"ਜੇ ਤੁਹਾਨੂੰ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੁਝ ਹੋਵੇ ਤਾਂ ਤੁਰੰਤ ਆਪਣੇ ਅੱਖਾਂ ਦੇ ਡਾਕਟਰ ਨੂੰ ਫ਼ੋਨ ਕਰੋ ਜਾਂ ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਜਾਓ:",
 warn:["ਦਰਦ ਜੋ ਵਧ ਰਿਹਾ ਹੈ","ਨਜ਼ਰ ਜੋ ਖ਼ਰਾਬ ਹੋ ਰਹੀ ਹੈ","ਵਧੇਰੇ ਲਾਲੀ, ਸੋਜ, ਜਾਂ ਪੀਲਾ/ਹਰਾ ਪਾਣੀ ਨਿਕਲਣਾ","ਅੱਖ ਦੇ ਦਰਦ ਨਾਲ ਜੀ ਕੱਚਾ ਹੋਣਾ ਜਾਂ ਉਲਟੀ ਆਉਣਾ"],
 ppvWarn:"ਰੋਸ਼ਨੀ ਦੀਆਂ ਚਮਕਾਂ, ਬਹੁਤ ਸਾਰੇ ਨਵੇਂ ਤੈਰਦੇ ਧੱਬੇ, ਜਾਂ ਨਜ਼ਰ ਉੱਤੇ ਪਰਛਾਵਾਂ ਜਾਂ ਪਰਦਾ",
 tipsT:"ਖ਼ਾਸ ਹਦਾਇਤਾਂ",
 tips:{cataract:["ਪਹਿਲੇ ਹਫ਼ਤੇ ਸੌਣ ਵੇਲੇ ਅੱਖ ਦੀ ਢਾਲ (ਸ਼ੀਲਡ) ਪਾਓ।","ਅੱਖ ਨੂੰ ਨਾ ਮਲੋ ਅਤੇ ਨਾ ਦਬਾਓ।","2 ਹਫ਼ਤਿਆਂ ਲਈ ਤੈਰਾਕੀ ਅਤੇ ਹੌਟ ਟੱਬ ਤੋਂ ਬਚੋ।","ਪੜ੍ਹਨਾ, ਤੁਰਨਾ ਅਤੇ ਟੀਵੀ ਦੇਖਣਾ ਠੀਕ ਹੈ।"],
  trab:["ਸੌਣ ਵੇਲੇ ਅੱਖ ਦੀ ਢਾਲ (ਸ਼ੀਲਡ) ਪਾਓ।","ਅੱਖ ਨੂੰ ਨਾ ਮਲੋ ਅਤੇ ਨਾ ਦਬਾਓ।","ਜਦੋਂ ਤੱਕ ਸਰਜਨ ਇਜਾਜ਼ਤ ਨਾ ਦੇਵੇ, ਭਾਰੀ ਚੀਜ਼ਾਂ ਚੁੱਕਣ, ਝੁਕਣ ਅਤੇ ਸਖ਼ਤ ਕਸਰਤ ਤੋਂ ਬਚੋ।","ਜਦੋਂ ਤੱਕ ਸਰਜਨ ਨਾ ਕਹੇ, ਅਪਰੇਸ਼ਨ ਵਾਲੀ ਅੱਖ ਵਿੱਚ ਆਪਣੀਆਂ ਪੁਰਾਣੀਆਂ ਗਲੌਕੋਮਾ ਦੀਆਂ ਬੂੰਦਾਂ ਨਾ ਪਾਓ।"],
  ppv:["ਜੇ ਅੱਖ ਵਿੱਚ ਗੈਸ ਦਾ ਬੁਲਬੁਲਾ ਹੈ, ਤਾਂ ਸਿਰ ਨੂੰ ਉਸੇ ਸਥਿਤੀ ਵਿੱਚ ਰੱਖੋ ਜੋ ਸਰਜਨ ਨੇ ਦੱਸੀ ਹੈ।","ਗੈਸ ਦੇ ਬੁਲਬੁਲੇ ਨਾਲ ਹਵਾਈ ਜਹਾਜ਼ ਵਿੱਚ ਸਫ਼ਰ ਨਾ ਕਰੋ ਅਤੇ ਉੱਚੀਆਂ ਥਾਵਾਂ 'ਤੇ ਨਾ ਜਾਓ। ਬੇਹੋਸ਼ੀ ਦੇਣ ਵਾਲੇ ਕਿਸੇ ਵੀ ਡਾਕਟਰ ਨੂੰ ਦੱਸੋ।","ਸੌਣ ਵੇਲੇ ਅੱਖ ਦੀ ਢਾਲ (ਸ਼ੀਲਡ) ਪਾਓ।","ਅੱਖ ਨੂੰ ਨਾ ਮਲੋ ਅਤੇ ਨਾ ਦਬਾਓ।"],
  dmek:["ਪਹਿਲੇ ਦਿਨਾਂ ਵਿੱਚ, ਸਰਜਨ ਦੇ ਦੱਸੇ ਅਨੁਸਾਰ ਪਿੱਠ ਦੇ ਭਾਰ ਸਿੱਧੇ ਲੇਟੋ, ਮੂੰਹ ਉੱਪਰ ਵੱਲ।","ਸੌਣ ਵੇਲੇ ਅੱਖ ਦੀ ਢਾਲ (ਸ਼ੀਲਡ) ਪਾਓ।","ਸਟੀਰੌਇਡ ਬੂੰਦ ਲੰਬੇ ਸਮੇਂ ਲਈ ਹੈ। ਸਰਜਨ ਨੂੰ ਪੁੱਛੇ ਬਿਨਾਂ ਇਸਨੂੰ ਕਦੇ ਬੰਦ ਨਾ ਕਰੋ।","ਅਚਾਨਕ ਲਾਲੀ, ਰੋਸ਼ਨੀ ਤੋਂ ਚੁਭਣ ਜਾਂ ਧੁੰਦਲੀ ਨਜ਼ਰ ਦਾ ਮਤਲਬ ਗ੍ਰਾਫਟ ਰੱਦ ਹੋਣਾ ਹੋ ਸਕਦਾ ਹੈ। ਉਸੇ ਦਿਨ ਫ਼ੋਨ ਕਰੋ।"],
  prk:["ਪੱਟੀ ਵਾਲਾ ਕਾਂਟੈਕਟ ਲੈਂਜ਼ ਨਾ ਕੱਢੋ। ਤੁਹਾਡਾ ਡਾਕਟਰ ਇਸਨੂੰ ਕੱਢੇਗਾ।","ਜੇ ਲੈਂਜ਼ ਡਿੱਗ ਜਾਵੇ, ਤਾਂ ਇਸਨੂੰ ਵਾਪਸ ਨਾ ਪਾਓ। ਕਲੀਨਿਕ ਨੂੰ ਫ਼ੋਨ ਕਰੋ।","ਪਹਿਲੇ 3 ਦਿਨ ਦਰਦ, ਪਾਣੀ ਵਗਣਾ ਅਤੇ ਰੋਸ਼ਨੀ ਤੋਂ ਚੁਭਣ ਆਮ ਹੈ।","ਬਾਹਰ ਜਾਣ ਵੇਲੇ ਧੁੱਪ ਵਾਲੀਆਂ ਐਨਕਾਂ ਪਾਓ।"],
  lasik:["ਘੱਟੋ-ਘੱਟ 1 ਹਫ਼ਤੇ ਲਈ ਅੱਖਾਂ ਨਾ ਮਲੋ।","ਪਹਿਲੇ ਹਫ਼ਤੇ ਸੌਣ ਵੇਲੇ ਅੱਖਾਂ ਦੀਆਂ ਢਾਲਾਂ (ਸ਼ੀਲਡ) ਪਾਓ।","2 ਹਫ਼ਤਿਆਂ ਲਈ ਤੈਰਾਕੀ ਅਤੇ ਹੌਟ ਟੱਬ ਤੋਂ ਬਚੋ।","ਜੇ ਅੱਖਾਂ ਖੁਸ਼ਕ ਮਹਿਸੂਸ ਹੋਣ ਤਾਂ ਅਕਸਰ ਨਕਲੀ ਹੰਝੂ ਵਰਤੋ।"]},
 bring:"ਹਰ ਮੁਲਾਕਾਤ 'ਤੇ ਇਹ ਸ਼ੀਟ ਅਤੇ ਆਪਣੀਆਂ ਸਾਰੀਆਂ ਅੱਖਾਂ ਦੀਆਂ ਬੂੰਦਾਂ ਨਾਲ ਲਿਆਓ।",footQ:"ਕੋਈ ਸਵਾਲ? ਫ਼ੋਨ ਕਰੋ",
 fq:{n:n=>`ਦਿਨ ਵਿੱਚ ${n} ਵਾਰ`,q2h:"ਜਾਗਦੇ ਸਮੇਂ ਹਰ 2 ਘੰਟੇ ਬਾਅਦ",q1h:"ਜਾਗਦੇ ਸਮੇਂ ਹਰ ਘੰਟੇ",prn:"ਲੋੜ ਪੈਣ 'ਤੇ"}},

ar:{title:"جدول قطرات العين الخاص بك",patient:"المريض",surgery:"العملية",surgeryDate:"تاريخ العملية",startDate:"بدء القطرات",clinic:"هاتف العيادة",
 R:"العين اليمنى",L:"العين اليسرى",
 surg:{cataract:"عملية الماء الأبيض (الساد)",trab:"عملية استئصال التربيق (جراحة الجلوكوما)",ppv:"عملية استئصال الزجاجية (جراحة الشبكية)",dmek:"زراعة القرنية (DMEK)",prk:"تصحيح النظر بالليزر PRK",lasik:"تصحيح النظر بالليزر LASIK"},
 cls:{antibiotic:"مضاد حيوي",steroid:"ستيرويد (كورتيزون)",nsaid:"مضاد التهاب",cyclo:"قطرة موسّعة للحدقة",lube:"دموع اصطناعية"},
 what:{antibiotic:"يمنع العدوى",steroid:"يخفف الالتهاب",nsaid:"يخفف التورم والألم",cyclo:"يريح العين ويخفف الألم",lube:"يخفف الجفاف"},
 colDates:"التواريخ",
 howT:"كيفية استخدام القطرات",
 how:["اغسل يديك.","إذا كانت القطرة بيضاء كالحليب، فرُجّ الزجاجة أولاً (مُشار إليها بالعلامة ↻).","أمِل رأسك إلى الخلف، وانظر إلى الأعلى، واسحب الجفن السفلي برفق إلى الأسفل.","ضع قطرة واحدة. لا تدع طرف الزجاجة يلمس عينك أو رموشك.","أغمض عينك برفق لمدة دقيقة واحدة. لا تفرك عينك ولا تضغط عليها.","انتظر 5 دقائق قبل وضع قطرة مختلفة."],
 shake:"رُجّ جيداً",
 warnT:"اتصل بطبيب العيون فوراً، أو اذهب إلى الطوارئ، إذا كان لديك:",
 warn:["ألم يزداد سوءاً","نظر يزداد سوءاً","احمرار أو تورم أكثر، أو إفرازات صفراء/خضراء","غثيان أو تقيؤ مع ألم في العين"],
 ppvWarn:"ومضات ضوئية، أو ظهور الكثير من العوائم الجديدة، أو ظل أو ستارة تغطي الرؤية",
 tipsT:"تعليمات خاصة",
 tips:{cataract:["ضع واقي العين عند النوم خلال الأسبوع الأول.","لا تفرك عينك ولا تضغط عليها.","تجنّب السباحة وأحواض المياه الساخنة لمدة أسبوعين.","القراءة والمشي ومشاهدة التلفاز لا بأس بها."],
  trab:["ضع واقي العين عند النوم.","لا تفرك عينك ولا تضغط عليها.","تجنّب رفع الأشياء الثقيلة والانحناء والتمارين الشاقة حتى يسمح لك الجرّاح.","لا تستخدم قطرات الجلوكوما القديمة في العين التي أُجريت لها العملية إلا إذا طلب منك الجرّاح ذلك."],
  ppv:["إذا كانت هناك فقاعة غاز في العين، فحافظ على وضعية الرأس التي أخبرك بها الجرّاح.","مع وجود فقاعة غاز، لا تسافر بالطائرة ولا تذهب إلى المرتفعات. أخبر أي طبيب يعطيك التخدير.","ضع واقي العين عند النوم.","لا تفرك عينك ولا تضغط عليها."],
  dmek:["في الأيام الأولى، استلقِ على ظهرك ووجهك إلى الأعلى بقدر ما أخبرك الجرّاح.","ضع واقي العين عند النوم.","قطرة الستيرويد للاستخدام طويل الأمد. لا توقفها أبداً دون استشارة الجرّاح.","الاحمرار المفاجئ أو الحساسية للضوء أو تشوّش الرؤية قد يعني رفض القرنية المزروعة. اتصل في نفس اليوم."],
  prk:["لا تُخرج العدسة اللاصقة العلاجية. سيزيلها طبيبك.","إذا سقطت العدسة، فلا تُعِدها إلى عينك. اتصل بالعيادة.","الألم والدموع والحساسية للضوء أمور شائعة في الأيام الثلاثة الأولى.","ارتدِ نظارة شمسية في الخارج."],
  lasik:["لا تفرك عينيك لمدة أسبوع على الأقل.","ضع واقيات العين عند النوم خلال الأسبوع الأول.","تجنّب السباحة وأحواض المياه الساخنة لمدة أسبوعين.","استخدم الدموع الاصطناعية كثيراً إذا شعرت بجفاف عينيك."]},
 bring:"أحضر هذه الورقة وجميع قطرات العين معك في كل زيارة.",footQ:"لديك أسئلة؟ اتصل على",
 fq:{n:n=>n==1?"مرة واحدة في اليوم":n==2?"مرتان في اليوم":`${n} مرات في اليوم`,q2h:"كل ساعتين أثناء الاستيقاظ",q1h:"كل ساعة أثناء الاستيقاظ",prn:"عند الحاجة"}},

ko:{title:"안약 사용 일정표",patient:"환자",surgery:"수술",surgeryDate:"수술 날짜",startDate:"안약 시작일",clinic:"병원 전화번호",
 R:"오른쪽 눈",L:"왼쪽 눈",
 surg:{cataract:"백내장 수술",trab:"섬유주절제술(녹내장 수술)",ppv:"유리체절제술(망막 수술)",dmek:"각막 이식(DMEK)",prk:"PRK 레이저 시력교정술",lasik:"라식(LASIK) 레이저 시력교정술"},
 cls:{antibiotic:"항생제",steroid:"스테로이드",nsaid:"소염제",cyclo:"산동제(동공 확장 안약)",lube:"인공눈물"},
 what:{antibiotic:"감염을 예방합니다",steroid:"염증을 줄입니다",nsaid:"붓기와 통증을 줄입니다",cyclo:"눈을 편하게 하고 통증을 줄입니다",lube:"건조함을 완화합니다"},
 colDates:"날짜",
 howT:"안약 넣는 방법",
 how:["손을 씻으세요.","안약이 우유처럼 뿌옇다면 먼저 병을 흔드세요(↻ 표시).","고개를 뒤로 젖히고 위를 보면서 아래 눈꺼풀을 살짝 당기세요.","한 방울 넣으세요. 병 끝이 눈이나 속눈썹에 닿지 않게 하세요.","1분 동안 눈을 살며시 감으세요. 비비거나 세게 감지 마세요.","다른 안약을 넣기 전에 5분 기다리세요."],
 shake:"잘 흔드세요",
 warnT:"다음 증상이 있으면 즉시 안과 의사에게 연락하거나 응급실에 가세요:",
 warn:["점점 심해지는 통증","점점 나빠지는 시력","더 심해지는 충혈, 붓기 또는 노란색/초록색 분비물","눈 통증과 함께 메스꺼움이나 구토"],
 ppvWarn:"번쩍이는 빛, 갑자기 많아진 날파리증(비문증), 또는 시야를 가리는 그림자나 커튼",
 tipsT:"특별 주의사항",
 tips:{cataract:["첫 1주일 동안 잘 때 눈 보호대를 착용하세요.","눈을 비비거나 누르지 마세요.","2주 동안 수영과 온탕을 피하세요.","독서, 산책, TV 시청은 괜찮습니다."],
  trab:["잘 때 눈 보호대를 착용하세요.","눈을 비비거나 누르지 마세요.","의사가 허락할 때까지 무거운 물건 들기, 허리 숙이기, 격한 운동을 피하세요.","의사의 지시가 없으면 수술한 눈에 예전 녹내장 안약을 넣지 마세요."],
  ppv:["눈 안에 가스가 있다면 의사가 알려준 머리 자세를 유지하세요.","가스가 있는 동안에는 비행기를 타거나 높은 곳에 가지 마세요. 마취를 하는 의사에게 꼭 알리세요.","잘 때 눈 보호대를 착용하세요.","눈을 비비거나 누르지 마세요."],
  dmek:["처음 며칠 동안 의사가 알려준 만큼 얼굴을 위로 향하고 똑바로 누워 계세요.","잘 때 눈 보호대를 착용하세요.","스테로이드 안약은 장기간 사용합니다. 의사와 상의 없이 절대 중단하지 마세요.","갑작스러운 충혈, 눈부심 또는 흐린 시력은 이식 거부 반응일 수 있습니다. 당일에 연락하세요."],
  prk:["치료용 콘택트렌즈를 빼지 마세요. 의사가 빼 드립니다.","렌즈가 빠지면 다시 넣지 말고 병원에 연락하세요.","처음 3일 동안 통증, 눈물, 눈부심은 흔합니다.","외출할 때 선글라스를 쓰세요."],
  lasik:["최소 1주일 동안 눈을 비비지 마세요.","첫 1주일 동안 잘 때 눈 보호대를 착용하세요.","2주 동안 수영과 온탕을 피하세요.","눈이 건조하면 인공눈물을 자주 넣으세요."]},
 bring:"병원에 올 때마다 이 종이와 모든 안약을 가져오세요.",footQ:"문의 전화",
 fq:{n:n=>`하루 ${n}번`,q2h:"깨어 있는 동안 2시간마다",q1h:"깨어 있는 동안 1시간마다",prn:"필요할 때"}},

vi:{title:"Lịch nhỏ thuốc mắt của bạn",patient:"Bệnh nhân",surgery:"Phẫu thuật",surgeryDate:"Ngày phẫu thuật",startDate:"Bắt đầu nhỏ thuốc",clinic:"Điện thoại phòng khám",
 R:"Mắt phải",L:"Mắt trái",
 surg:{cataract:"Phẫu thuật đục thủy tinh thể",trab:"Phẫu thuật cắt bè (phẫu thuật tăng nhãn áp)",ppv:"Phẫu thuật cắt dịch kính (phẫu thuật võng mạc)",dmek:"Ghép giác mạc (DMEK)",prk:"Phẫu thuật laser PRK",lasik:"Phẫu thuật laser LASIK"},
 cls:{antibiotic:"Kháng sinh",steroid:"Steroid (corticoid)",nsaid:"Thuốc kháng viêm",cyclo:"Thuốc giãn đồng tử",lube:"Nước mắt nhân tạo"},
 what:{antibiotic:"Ngừa nhiễm trùng",steroid:"Giảm viêm",nsaid:"Giảm sưng và đau",cyclo:"Giúp mắt thư giãn, giảm đau",lube:"Giảm khô mắt"},
 colDates:"Ngày",
 howT:"Cách nhỏ thuốc mắt",
 how:["Rửa tay.","Nếu thuốc có màu trắng đục như sữa, hãy lắc lọ trước (đánh dấu ↻).","Ngửa đầu ra sau, nhìn lên trên và nhẹ nhàng kéo mí mắt dưới xuống.","Nhỏ một giọt. Không để đầu lọ chạm vào mắt hoặc lông mi.","Nhắm mắt nhẹ nhàng trong 1 phút. Không dụi hoặc nhắm chặt mắt.","Chờ 5 phút trước khi nhỏ loại thuốc khác."],
 shake:"Lắc đều",
 warnT:"Hãy gọi ngay cho bác sĩ mắt, hoặc đến phòng cấp cứu, nếu bạn bị:",
 warn:["Đau ngày càng nặng hơn","Thị lực ngày càng kém đi","Mắt đỏ hơn, sưng hơn, hoặc có ghèn vàng/xanh","Buồn nôn hoặc nôn kèm đau mắt"],
 ppvWarn:"Thấy chớp sáng, xuất hiện nhiều đốm đen trôi mới, hoặc có bóng mờ hay màn che trước mắt",
 tipsT:"Hướng dẫn đặc biệt",
 tips:{cataract:["Đeo tấm che mắt khi ngủ trong tuần đầu tiên.","Không dụi hoặc ấn vào mắt.","Tránh bơi lội và bồn nước nóng trong 2 tuần.","Có thể đọc sách, đi bộ và xem TV."],
  trab:["Đeo tấm che mắt khi ngủ.","Không dụi hoặc ấn vào mắt.","Tránh nâng vật nặng, cúi người và tập thể dục gắng sức cho đến khi bác sĩ cho phép.","Không dùng thuốc nhỏ tăng nhãn áp cũ cho mắt đã mổ, trừ khi bác sĩ yêu cầu."],
  ppv:["Nếu có bóng khí trong mắt, hãy giữ tư thế đầu theo hướng dẫn của bác sĩ.","Khi có bóng khí, không đi máy bay hoặc lên vùng núi cao. Hãy báo cho bất kỳ bác sĩ nào gây mê cho bạn.","Đeo tấm che mắt khi ngủ.","Không dụi hoặc ấn vào mắt."],
  dmek:["Trong những ngày đầu, nằm ngửa, mặt hướng lên trên, theo đúng hướng dẫn của bác sĩ.","Đeo tấm che mắt khi ngủ.","Thuốc steroid cần dùng lâu dài. Không bao giờ tự ngưng thuốc mà không hỏi bác sĩ.","Mắt đỏ đột ngột, sợ ánh sáng hoặc nhìn mờ có thể là dấu hiệu thải ghép. Hãy gọi ngay trong ngày."],
  prk:["Không tự tháo kính áp tròng băng. Bác sĩ sẽ tháo cho bạn.","Nếu kính bị rơi ra, không đeo lại. Hãy gọi phòng khám.","Đau, chảy nước mắt và sợ ánh sáng thường gặp trong 3 ngày đầu.","Đeo kính râm khi ra ngoài."],
  lasik:["Không dụi mắt trong ít nhất 1 tuần.","Đeo tấm che mắt khi ngủ trong tuần đầu tiên.","Tránh bơi lội và bồn nước nóng trong 2 tuần.","Nhỏ nước mắt nhân tạo thường xuyên nếu mắt bị khô."]},
 bring:"Mang theo tờ giấy này và tất cả các lọ thuốc nhỏ mắt mỗi lần tái khám.",footQ:"Có thắc mắc? Gọi",
 fq:{n:n=>`Ngày ${n} lần`,q2h:"Mỗi 2 giờ khi thức",q1h:"Mỗi giờ khi thức",prn:"Khi cần"}},

ja:{title:"目薬の使用スケジュール",patient:"患者名",surgery:"手術",surgeryDate:"手術日",startDate:"点眼開始日",clinic:"病院の電話番号",
 R:"右目",L:"左目",
 surg:{cataract:"白内障手術",trab:"線維柱帯切除術（緑内障手術）",ppv:"硝子体手術（網膜の手術）",dmek:"角膜移植（DMEK）",prk:"PRKレーザー視力矯正",lasik:"LASIKレーザー視力矯正"},
 cls:{antibiotic:"抗菌薬",steroid:"ステロイド",nsaid:"抗炎症薬",cyclo:"散瞳薬（瞳を広げる目薬）",lube:"人工涙液"},
 what:{antibiotic:"感染を防ぎます",steroid:"炎症を抑えます",nsaid:"腫れと痛みを抑えます",cyclo:"目を休ませ、痛みを和らげます",lube:"乾燥を和らげます"},
 colDates:"期間",
 howT:"目薬のさし方",
 how:["手を洗います。","目薬が白く濁っている場合は、先に容器をよく振ります（↻ の印）。","頭を後ろに傾けて上を見て、下まぶたを軽く引き下げます。","1滴さします。容器の先が目やまつげに触れないようにしてください。","1分間やさしく目を閉じます。こすったり、強くつぶったりしないでください。","別の目薬をさす前に5分間あけてください。"],
 shake:"よく振る",
 warnT:"次の症状がある場合は、すぐに眼科に連絡するか救急外来を受診してください：",
 warn:["痛みがだんだん強くなる","見え方がだんだん悪くなる","充血や腫れがひどくなる、または黄色・緑色の目やにが出る","目の痛みとともに吐き気や嘔吐がある"],
 ppvWarn:"光が走って見える、新しい浮遊物（飛蚊症）が急に増えた、または視野に影やカーテンがかかったように見える",
 tipsT:"特別な注意事項",
 tips:{cataract:["最初の1週間は、寝るときに保護用の眼帯をつけてください。","目をこすったり押したりしないでください。","2週間は水泳や温泉を避けてください。","読書、散歩、テレビは問題ありません。"],
  trab:["寝るときに保護用の眼帯をつけてください。","目をこすったり押したりしないでください。","医師の許可が出るまで、重い物を持つこと、前かがみになること、激しい運動は避けてください。","医師の指示がない限り、手術した目に以前の緑内障の目薬をささないでください。"],
  ppv:["目の中にガスが入っている場合は、医師に指示された頭の姿勢を保ってください。","ガスが残っている間は、飛行機に乗ったり高地に行ったりしないでください。麻酔を受ける際は必ず医師に伝えてください。","寝るときに保護用の眼帯をつけてください。","目をこすったり押したりしないでください。"],
  dmek:["最初の数日間は、医師の指示どおりに仰向けに寝て、顔を上に向けてください。","寝るときに保護用の眼帯をつけてください。","ステロイドの目薬は長期間使います。医師に相談せずに絶対にやめないでください。","急な充血、まぶしさ、かすみ目は拒絶反応の可能性があります。その日のうちに連絡してください。"],
  prk:["保護用コンタクトレンズを外さないでください。医師が外します。","レンズが外れた場合は、戻さずに病院に連絡してください。","最初の3日間は、痛み、涙、まぶしさがよく見られます。","外出時はサングラスをかけてください。"],
  lasik:["少なくとも1週間は目をこすらないでください。","最初の1週間は、寝るときに保護用の眼帯をつけてください。","2週間は水泳や温泉を避けてください。","目が乾くときは、人工涙液をこまめに使ってください。"]},
 bring:"受診のたびに、この用紙とすべての目薬を持ってきてください。",footQ:"ご質問は",
 fq:{n:n=>`1日${n}回`,q2h:"起きている間、2時間ごと",q1h:"起きている間、1時間ごと",prn:"必要なときに"}}
};

/* New strings for the redesigned sheet and the patient phone page */
const T2 = {
en:{dur:n=>n==1?"1 day":`${n} days`,glance:"Your drops at a glance",whenT:"What to use and when",dotKey:"Each dot = one drop, one time",qrT:"Scan with your phone camera for reminders and spoken instructions",
 today:"Today",dayOf:(n,m)=>`Day ${n} of ${m}`,notStarted:d=>`Your drops start on ${d}`,finished:"You have finished all your drops. Keep your next appointment.",
 next:"Next drops",done:"Mark as done",taken:"Done",remind:"Add reminders to my calendar",remindHelp:"Your phone will ask to add the events. A reminder rings at each drop time.",
 listen:"Listen to instructions",stop:"Stop",noVoice:"Spoken instructions are not available in this language on this phone yet.",
 install:"Tip: add this page to your home screen so it opens like an app.",invalid:"This link is incomplete. Please ask your clinic for a new QR code.",
 callClinic:"Call the clinic",allToday:"Today's drops"},
"zh-Hans":{dur:n=>`${n}天`,glance:"眼药水一览",whenT:"什么时间用哪种眼药水",dotKey:"每个圆点 = 滴一次",qrT:"用手机相机扫描，获取用药提醒和语音说明",
 today:"今天",dayOf:(n,m)=>`第${n}天，共${m}天`,notStarted:d=>`您从${d}开始用药`,finished:"您已完成所有眼药水的使用。请按时复诊。",
 next:"下一次用药",done:"标记为已完成",taken:"已完成",remind:"把提醒添加到我的日历",remindHelp:"手机会询问是否添加这些日程。每到用药时间都会提醒您。",
 listen:"收听使用说明",stop:"停止",noVoice:"这部手机暂时无法用这种语言朗读说明。",
 install:"提示：把此页面添加到主屏幕，就可以像应用一样打开。",invalid:"此链接不完整。请向诊所索取新的二维码。",
 callClinic:"致电诊所",allToday:"今天的眼药水"},
"zh-Hant":{dur:n=>`${n}日`,glance:"眼藥水一覽",whenT:"甚麼時間用哪種眼藥水",dotKey:"每個圓點 = 滴一次",qrT:"用手機相機掃描，取得用藥提示及語音說明",
 today:"今日",dayOf:(n,m)=>`第${n}日，共${m}日`,notStarted:d=>`你由${d}開始用藥`,finished:"你已完成所有眼藥水療程。請按時覆診。",
 next:"下一次用藥",done:"標記為已完成",taken:"已完成",remind:"把提示加入我的日曆",remindHelp:"手機會詢問是否加入這些日程。每到用藥時間都會提示你。",
 listen:"收聽使用說明",stop:"停止",noVoice:"這部手機暫時未能以此語言朗讀說明。",
 install:"提示：把此頁加到主畫面，就可以像應用程式一樣開啟。",invalid:"此連結不完整。請向診所索取新的二維碼。",
 callClinic:"致電診所",allToday:"今日的眼藥水"},
pa:{dur:n=>`${n} ਦਿਨ`,glance:"ਤੁਹਾਡੀਆਂ ਬੂੰਦਾਂ ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ",whenT:"ਕਿਹੜੀ ਬੂੰਦ ਕਦੋਂ ਪਾਉਣੀ ਹੈ",dotKey:"ਹਰ ਬਿੰਦੀ = ਇੱਕ ਵਾਰ ਇੱਕ ਬੂੰਦ",qrT:"ਯਾਦ-ਦਹਾਨੀਆਂ ਅਤੇ ਬੋਲ ਕੇ ਸੁਣਾਈਆਂ ਹਦਾਇਤਾਂ ਲਈ ਆਪਣੇ ਫ਼ੋਨ ਦੇ ਕੈਮਰੇ ਨਾਲ ਸਕੈਨ ਕਰੋ",
 today:"ਅੱਜ",dayOf:(n,m)=>`ਦਿਨ ${n} (ਕੁੱਲ ${m} ਵਿੱਚੋਂ)`,notStarted:d=>`ਤੁਹਾਡੀਆਂ ਬੂੰਦਾਂ ${d} ਨੂੰ ਸ਼ੁਰੂ ਹੋਣਗੀਆਂ`,finished:"ਤੁਸੀਂ ਆਪਣੀਆਂ ਸਾਰੀਆਂ ਬੂੰਦਾਂ ਪੂਰੀਆਂ ਕਰ ਲਈਆਂ ਹਨ। ਆਪਣੀ ਅਗਲੀ ਮੁਲਾਕਾਤ 'ਤੇ ਜ਼ਰੂਰ ਜਾਓ।",
 next:"ਅਗਲੀਆਂ ਬੂੰਦਾਂ",done:"ਹੋ ਗਿਆ ਵਜੋਂ ਨਿਸ਼ਾਨ ਲਗਾਓ",taken:"ਹੋ ਗਿਆ",remind:"ਮੇਰੇ ਕੈਲੰਡਰ ਵਿੱਚ ਯਾਦ-ਦਹਾਨੀਆਂ ਸ਼ਾਮਲ ਕਰੋ",remindHelp:"ਤੁਹਾਡਾ ਫ਼ੋਨ ਇਹ ਸਮਾਗਮ ਸ਼ਾਮਲ ਕਰਨ ਲਈ ਪੁੱਛੇਗਾ। ਹਰ ਬੂੰਦ ਦੇ ਸਮੇਂ ਯਾਦ-ਦਹਾਨੀ ਵੱਜੇਗੀ।",
 listen:"ਹਦਾਇਤਾਂ ਸੁਣੋ",stop:"ਰੋਕੋ",noVoice:"ਇਸ ਫ਼ੋਨ 'ਤੇ ਅਜੇ ਇਸ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲ ਕੇ ਹਦਾਇਤਾਂ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।",
 install:"ਸੁਝਾਅ: ਇਸ ਪੰਨੇ ਨੂੰ ਆਪਣੀ ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਸ਼ਾਮਲ ਕਰੋ ਤਾਂ ਜੋ ਇਹ ਐਪ ਵਾਂਗ ਖੁੱਲ੍ਹੇ।",invalid:"ਇਹ ਲਿੰਕ ਅਧੂਰਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਕਲੀਨਿਕ ਤੋਂ ਨਵਾਂ QR ਕੋਡ ਮੰਗੋ।",
 callClinic:"ਕਲੀਨਿਕ ਨੂੰ ਫ਼ੋਨ ਕਰੋ",allToday:"ਅੱਜ ਦੀਆਂ ਬੂੰਦਾਂ"},
ar:{dur:n=>n==1?"يوم واحد":n==2?"يومان":n<=10?`${n} أيام`:`${n} يوماً`,glance:"لمحة سريعة عن قطراتك",whenT:"ماذا تستخدم ومتى",dotKey:"كل نقطة = قطرة واحدة مرة واحدة",qrT:"امسح الرمز بكاميرا هاتفك للحصول على التذكيرات والتعليمات الصوتية",
 today:"اليوم",dayOf:(n,m)=>`اليوم ${n} من ${m}`,notStarted:d=>`تبدأ قطراتك في ${d}`,finished:"لقد أنهيت جميع قطراتك. التزم بموعدك القادم.",
 next:"القطرات التالية",done:"تحديد كمنجز",taken:"تم",remind:"أضف التذكيرات إلى تقويمي",remindHelp:"سيطلب هاتفك إضافة المواعيد. سيرن التذكير في وقت كل قطرة.",
 listen:"استمع إلى التعليمات",stop:"إيقاف",noVoice:"التعليمات الصوتية غير متوفرة بهذه اللغة على هذا الهاتف حالياً.",
 install:"نصيحة: أضف هذه الصفحة إلى الشاشة الرئيسية لتفتح مثل التطبيق.",invalid:"هذا الرابط غير مكتمل. يرجى طلب رمز QR جديد من عيادتك.",
 callClinic:"اتصل بالعيادة",allToday:"قطرات اليوم"},
ko:{dur:n=>`${n}일간`,glance:"안약 한눈에 보기",whenT:"언제 어떤 안약을 넣나요",dotKey:"점 하나 = 한 번에 한 방울",qrT:"휴대폰 카메라로 스캔하면 알림과 음성 안내를 받을 수 있습니다",
 today:"오늘",dayOf:(n,m)=>`${m}일 중 ${n}일째`,notStarted:d=>`안약은 ${d}에 시작합니다`,finished:"모든 안약 사용을 마쳤습니다. 다음 진료 예약을 꼭 지키세요.",
 next:"다음 안약",done:"완료로 표시",taken:"완료",remind:"내 캘린더에 알림 추가",remindHelp:"휴대폰에서 일정 추가 여부를 묻습니다. 안약 시간마다 알림이 울립니다.",
 listen:"사용 방법 듣기",stop:"중지",noVoice:"이 휴대폰에서는 아직 이 언어로 음성 안내를 들을 수 없습니다.",
 install:"팁: 이 페이지를 홈 화면에 추가하면 앱처럼 열 수 있습니다.",invalid:"이 링크는 완전하지 않습니다. 병원에 새 QR 코드를 요청하세요.",
 callClinic:"병원에 전화하기",allToday:"오늘의 안약"},
vi:{dur:n=>`${n} ngày`,glance:"Tóm tắt các loại thuốc nhỏ",whenT:"Dùng thuốc nào, vào lúc nào",dotKey:"Mỗi chấm = nhỏ một giọt, một lần",qrT:"Quét bằng camera điện thoại để nhận lời nhắc và nghe hướng dẫn",
 today:"Hôm nay",dayOf:(n,m)=>`Ngày ${n} / ${m}`,notStarted:d=>`Bạn bắt đầu nhỏ thuốc vào ${d}`,finished:"Bạn đã dùng xong tất cả thuốc nhỏ mắt. Hãy đến tái khám đúng hẹn.",
 next:"Lần nhỏ thuốc tiếp theo",done:"Đánh dấu đã xong",taken:"Đã xong",remind:"Thêm lời nhắc vào lịch của tôi",remindHelp:"Điện thoại sẽ hỏi bạn có muốn thêm các sự kiện không. Lời nhắc sẽ reo vào mỗi giờ nhỏ thuốc.",
 listen:"Nghe hướng dẫn",stop:"Dừng",noVoice:"Điện thoại này chưa hỗ trợ đọc hướng dẫn bằng ngôn ngữ này.",
 install:"Mẹo: thêm trang này vào màn hình chính để mở như một ứng dụng.",invalid:"Liên kết này không đầy đủ. Vui lòng xin phòng khám mã QR mới.",
 callClinic:"Gọi phòng khám",allToday:"Thuốc nhỏ hôm nay"},
ja:{dur:n=>`${n}日間`,glance:"目薬のひと目でわかる表",whenT:"いつ、どの目薬を使うか",dotKey:"点1つ = 1回1滴",qrT:"スマートフォンのカメラで読み取ると、リマインダーと音声での説明が使えます",
 today:"今日",dayOf:(n,m)=>`${m}日中${n}日目`,notStarted:d=>`点眼は${d}から始まります`,finished:"すべての目薬が終わりました。次回の受診予約を守ってください。",
 next:"次の点眼",done:"完了にする",taken:"完了",remind:"カレンダーにリマインダーを追加",remindHelp:"スマートフォンに予定の追加を確認する画面が出ます。点眼の時刻ごとに通知が鳴ります。",
 listen:"説明を聞く",stop:"停止",noVoice:"このスマートフォンでは、この言語の音声説明はまだ使えません。",
 install:"ヒント：このページをホーム画面に追加すると、アプリのように開けます。",invalid:"このリンクは不完全です。病院で新しいQRコードをもらってください。",
 callClinic:"病院に電話する",allToday:"今日の目薬"}
};
for (const k in T2) Object.assign(T[k], T2[k]);

/* ---------- Dates & times ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const dayDiff = (a,b) => Math.round((parse(iso(b)) - parse(iso(a))) / 864e5);
const toMin = t => { const [h,m] = String(t||"08:00").split(":").map(Number); return h*60+(m||0); };
const fmtTime = (lang,m) => new Intl.DateTimeFormat(LOCALE[lang],{hour:"numeric",minute:"2-digit"}).format(new Date(2026,0,1,Math.floor(m/60)%24,m%60));
const fmtDate = (lang,d,opt) => new Intl.DateTimeFormat(LOCALE[lang],opt||{weekday:"short",month:"short",day:"numeric"}).format(d);
const fullDate = (lang,d) => fmtDate(lang,d,{year:"numeric",month:"long",day:"numeric"});
const freqStr = (lang,f) => { const q = T[lang].fq; return /^\d+$/.test(f) ? q.n(+f) : q[f]; };

/* ---------- Scheduling ----------
   A regimen R = {s:surgery, e:"R"|"L", st:"YYYY-MM-DD" (first drop day), sd:surgery date, l:lang, w:wake, b:bed, p:clinic phone,
                  d:[{drug, phases:[{f, n}]}]} */
function doseTimes(R, f){
  let w = toMin(R.w), b = toMin(R.b); if (b <= w) b += 1440;
  if (f === "prn") return [];
  if (f === "q2h" || f === "q1h"){ const step = f === "q2h" ? 120 : 60, out = []; for (let t = w; t <= b; t += step) out.push(t); return out; }
  const n = +f; if (n <= 1) return [w];
  return Array.from({length:n}, (_,i) => Math.round((w + i*(b-w)/(n-1))/30)*30);
}
const drugDays = drop => drop.phases.reduce((a,p) => a + Math.max(0,+p.n||0), 0);
const totalDays = R => Math.max(0, ...R.d.map(drugDays));
function phaseOn(drop, i){ let c = 0; for (const p of drop.phases){ const n = Math.max(0,+p.n||0); if (i < c+n) return p; c += n; } return null; }

/* All doses on day index i: [{t:minutes, drugs:[drugIndex]}] plus as-needed drug indices */
function dayPlan(R, i){
  const map = new Map(), prn = [];
  R.d.forEach((d,k) => { const p = phaseOn(d,i); if (!p) return;
    if (p.f === "prn") { prn.push(k); return; }
    doseTimes(R,p.f).forEach(t => { if (!map.has(t)) map.set(t,[]); map.get(t).push(k); }); });
  return {slots:[...map.entries()].sort((a,b)=>a[0]-b[0]).map(([t,drugs])=>({t,drugs})), prn};
}

/* Split the course into stretches where no drop changes: the rows of the staircase */
function segments(R){
  const cuts = new Set([0]); const total = totalDays(R);
  R.d.forEach(d => { let c = 0; d.phases.forEach(p => { c += Math.max(0,+p.n||0); cuts.add(c); }); });
  const pts = [...cuts].filter(x => x <= total).sort((a,b)=>a-b);
  const out = [];
  for (let i = 0; i < pts.length-1; i++){
    const a = pts[i], b = pts[i+1]; if (b <= a) continue;
    const per = R.d.map(d => { const p = phaseOn(d,a); return p ? p.f : null; });
    const prev = out[out.length-1];
    if (prev && prev.per.join() === per.join()) prev.b = b; else out.push({a,b,per});
  }
  return out;
}

/* ---------- Link encoding (the regimen travels in the URL fragment; it never reaches a server) ---------- */
function encode(R){
  const o = {v:1,s:R.s,e:R.e,st:R.st,sd:R.sd,l:R.l,w:R.w,b:R.b,p:R.p||"",d:R.d.map(x => [x.drug, x.phases.map(p => [p.f, +p.n])])};
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  let bin = ""; bytes.forEach(c => bin += String.fromCharCode(c));
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decode(str){
  try{
    const b64 = str.replace(/-/g,"+").replace(/_/g,"/"); const bin = atob(b64);
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (o.v !== 1 || !PRESETS[o.s] || !Array.isArray(o.d)) return null;
    const d = o.d.filter(x => LIB[x[0]]).map(([drug,ph]) => ({drug, phases: ph.map(([f,n]) => ({f:String(f), n:Math.max(1,Math.min(730,+n||1))}))}));
    return {s:o.s,e:o.e==="L"?"L":"R",st:o.st,sd:o.sd||o.st,l:T[o.l]?o.l:"en",w:o.w||"08:00",b:o.b||"22:00",p:String(o.p||"").slice(0,40),d};
  } catch(e){ return null; }
}

/* ---------- Calendar export (.ics): one repeating event per dose time, with an alarm ---------- */
function icsEscape(s){ return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n"); }
function icsFold(line){
  const enc = new TextEncoder(); let out = "", cur = "", bytes = 0;
  for (const ch of line){ const n = enc.encode(ch).length;
    if (bytes + n > 73){ out += cur + "\r\n "; cur = ""; bytes = 1; }
    cur += ch; bytes += n; }
  return out + cur;
}
const icsStamp = (d,m) => { const x = addDays(d, Math.floor(m/1440)); const mm = m % 1440;
  return `${iso(x).replace(/-/g,"")}T${String(Math.floor(mm/60)).padStart(2,"0")}${String(mm%60).padStart(2,"0")}00`; };
function buildICS(R, lang){
  const t = T[lang], start = parse(R.st), total = totalDays(R);
  const runs = [], open = new Map();
  for (let i = 0; i < total; i++){
    dayPlan(R,i).slots.forEach(s => {
      const key = `${s.t}|${s.drugs.join(",")}`, run = open.get(key);
      if (run && run.start + run.count === i) run.count++;
      else { const r = {t:s.t, drugs:s.drugs, start:i, count:1}; runs.push(r); open.set(key,r); }
    });
  }
  const now = new Date(), stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,"0")}${String(now.getUTCDate()).padStart(2,"0")}T000000Z`;
  const uid = Math.random().toString(36).slice(2,10);
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dropwise//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${icsEscape("Dropwise · "+t[R.e])}`];
  runs.forEach((r,k) => {
    const names = r.drugs.map(i => LIB[R.d[i].drug].name);
    const summary = `💧 ${t[R.e]} · ${names.join(", ")}`;
    const kinds = r.drugs.map(i => `${t.cls[LIB[R.d[i].drug].cls]}: ${LIB[R.d[i].drug].name}${LIB[R.d[i].drug].shake ? " (↻ "+t.shake+")" : ""}`);
    const desc = [...kinds, "", r.drugs.length > 1 ? t.how[5] : t.how[3]].join("\n");
    const d0 = addDays(start, r.start);
    lines.push("BEGIN:VEVENT", `UID:dw-${uid}-${k}@dropwise`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(d0,r.t)}`, `DTEND:${icsStamp(d0,r.t+5)}`);
    if (r.count > 1) lines.push(`RRULE:FREQ=DAILY;COUNT=${r.count}`);
    lines.push(`SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(desc)}`,
      "BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${icsEscape(summary)}`,"TRIGGER:PT0M","END:VALARM","END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/* ---------- Shared renderers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* L(lang, bi, fn): the patient-language string, with the English line underneath when bilingual is on */
const L = (lang,bi,fn) => { const a = fn(T[lang]); if (lang === "en" || !bi) return esc(a); return `${esc(a)}<span class="en" lang="en" dir="ltr">${esc(fn(T.en))}</span>`; };
const capDot = cap => `<span class="cap cap-${cap}" aria-hidden="true"></span>`;
function drugLabel(R, k, lang, bi, withClass){
  const m = LIB[R.d[k].drug], t = T[lang];
  return `<div class="drug-name">${capDot(m.cap)}<span dir="ltr">${esc(m.name)}</span>${m.shake ? `<span class="shake" title="${esc(t.shake)}">↻ ${esc(t.shake)}</span>` : ""}</div>`
    + (withClass ? `<div class="drug-cls">${L(lang,bi,x => `${x.cls[m.cls]} · ${x.what[m.cls]}`)}</div>` : "");
}
const ICONS = {
  dawn:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4"/></svg>',
  day:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  dusk:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 11V8M9.5 5.5 12 8l2.5-2.5"/></svg>',
  night:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/></svg>'
};
const dayIcon = m => { const h = (m % 1440) / 60; return h < 11 ? ICONS.dawn : h < 15.5 ? ICONS.day : h < 19.5 ? ICONS.dusk : ICONS.night; };

function glanceHTML(R, lang, bi, todayIdx){
  const start = parse(R.st), t = T[lang];
  const head = R.d.map((_,k) => `<th scope="col">${drugLabel(R,k,lang,false,false)}</th>`).join("");
  const rows = segments(R).map(sg => {
    const now = todayIdx != null && todayIdx >= sg.a && todayIdx < sg.b;
    const cells = sg.per.map((f,k) => {
      const cap = LIB[R.d[k].drug].cap;
      if (!f) return `<td><span class="cell-none" aria-label="—">—</span></td>`;
      if (/^\d+$/.test(f)) return `<td><span class="dots" role="img" aria-label="${esc(freqStr(lang,f))}">${`<span class="dot cap-${cap}"></span>`.repeat(+f)}</span></td>`;
      return `<td><span class="cell-note">${esc(freqStr(lang,f))}</span></td>`;
    }).join("");
    return `<tr${now ? ' class="now"' : ""}><td class="range">${esc(fmtDate(lang,addDays(start,sg.a),{month:"short",day:"numeric"}))} – ${esc(fmtDate(lang,addDays(start,sg.b-1),{month:"short",day:"numeric"}))}<small>${esc(t.dur(sg.b-sg.a))}</small></td>${cells}</tr>`;
  }).join("");
  return `<div class="tbl-wrap"><table class="glance"><thead><tr><th scope="col">${L(lang,bi,x=>x.colDates)}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="dot-key"><span class="dot cap-none"></span>${L(lang,bi,x=>x.dotKey)}</div>`;
}

function whenHTML(R, lang, bi){
  const start = parse(R.st);
  return `<div class="when">` + segments(R).map(sg => {
    const plan = dayPlan(R, sg.a);
    const slots = plan.slots.map(s => `<div class="slot">${dayIcon(s.t)}<time>${esc(fmtTime(lang,s.t))}</time>
      <div class="chips">${s.drugs.map(k => `<span class="chip">${capDot(LIB[R.d[k].drug].cap)}<span dir="ltr">${esc(LIB[R.d[k].drug].name.replace(/ \d.*$/,""))}</span></span>`).join("")}</div></div>`).join("");
    const prn = plan.prn.length ? `<div class="prn-line">${esc(freqStr(lang,"prn"))}: <span dir="ltr">${plan.prn.map(k => esc(LIB[R.d[k].drug].name)).join(", ")}</span></div>` : "";
    return `<section class="when-block"><h4>${esc(fmtDate(lang,addDays(start,sg.a),{month:"short",day:"numeric"}))} – ${esc(fmtDate(lang,addDays(start,sg.b-1),{month:"short",day:"numeric"}))}</h4>${slots}${prn}</section>`;
  }).join("") + `</div>`;
}

function listHTML(arr, en, bi, lang){
  return arr.map((s,i) => `<li>${esc(s)}${bi && lang !== "en" ? `<span class="en" lang="en" dir="ltr">${esc(en[i])}</span>` : ""}</li>`).join("");
}
function warnings(R, lang){
  const w = [...T[lang].warn], we = [...T.en.warn];
  if (R.s === "ppv"){ w.splice(3,0,T[lang].ppvWarn); we.splice(3,0,T.en.ppvWarn); }
  return [w, we];
}
function howSteps(R, lang){
  const shake = R.d.some(d => LIB[d.drug].shake);
  const f = a => shake ? a : a.filter((_,i) => i !== 1);
  return [f(T[lang].how), f(T.en.how)];
}

return {LIB,FREQS,PRESETS,BASIS,LANGS,LOCALE,VOICE,T,iso,parse,addDays,dayDiff,toMin,fmtTime,fmtDate,fullDate,freqStr,
  doseTimes,totalDays,phaseOn,dayPlan,segments,encode,decode,buildICS,esc,L,capDot,drugLabel,dayIcon,glanceHTML,whenHTML,listHTML,warnings,howSteps};
})();
