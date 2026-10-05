#!/usr/bin/env node
/* Rebuild js/i18n.js from translations.csv.
   Usage (from the project folder):  node tools/csv-to-i18n.js
   Edit translations.csv in Excel, Google Sheets or Numbers, save as CSV (UTF-8), then run this. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const text = fs.readFileSync(path.join(root, "translations.csv"), "utf8").replace(/^﻿/, "");

function parseCSV(s){
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (q){ if (c === '"'){ if (s[i+1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ","){ row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r"){ if (c === "\r" && s[i+1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

const [head, ...rows] = parseCSV(text);
const langs = head.slice(2);                       // columns: key, context, en, zh-Hans, ...
const out = Object.fromEntries(langs.map(l => [l, {}]));
let missing = 0;
rows.forEach(r => {
  const key = r[0].trim(); if (!key) return;
  langs.forEach((l, i) => { const v = (r[i+2] || "").trim(); if (v) out[l][key] = v; else if (l !== "en" && !key.includes("#")) missing++; });
});
const js = "/* Generated from translations.csv by tools/csv-to-i18n.js. Edit the CSV, not this file. */\n"
  + "const I18N = " + JSON.stringify(out, null, 1) + ";\n"
  + 'if (typeof module !== "undefined") module.exports = I18N;\n';
fs.writeFileSync(path.join(root, "js", "i18n.js"), js);
console.log(`Wrote js/i18n.js: ${rows.length} keys × ${langs.length} languages` + (missing ? ` (${missing} empty cells fall back to English)` : ""));
