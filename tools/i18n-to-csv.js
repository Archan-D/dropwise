#!/usr/bin/env node
/* Export js/i18n.js to translations.csv (one row per line of text, one column per language, English beside each).
   Usage (from the project folder):  node tools/i18n-to-csv.js */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const I18N = require(path.join(root, "js", "i18n.js"));
const langs = ["en", ...Object.keys(I18N).filter(l => l !== "en")];
const CONTEXT = [
  ["title","Sheet title"],["surg.","Surgery name"],["cls.","Type of drop (short label)"],["what.","What the drop does"],
  ["how.","How-to step"],["warn","Warning sign (call doctor / emergency)"],["tips.","Precaution after this surgery"],["se.","Possible side effects of this type of drop"],
  ["fq.","How often (#1 = once, #2 = twice, #few = 3–10, #other = any other number; keep {n})"],
  ["dur","Number of days (keep {n})"],["dayOf","Day counter (keep {n} and {m})"],["dayN","Day counter (keep {n})"],
  ["notStarted","Start date message (keep {n})"],["keep","Instruction for the patient's usual drops"],["stopAll","Instruction for the patient's usual drops"]
];
const ctx = k => (CONTEXT.find(([p]) => k.startsWith(p)) || [,""])[1];
const esc = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const keys = [...new Set(langs.flatMap(l => Object.keys(I18N[l])))];
const lines = [["key","context",...langs].join(",")];
keys.forEach(k => lines.push([k, ctx(k), ...langs.map(l => I18N[l][k] || "")].map(esc).join(",")));
fs.writeFileSync(path.join(root, "translations.csv"), "﻿" + lines.join("\r\n") + "\r\n");
console.log(`Wrote translations.csv: ${keys.length} rows`);
