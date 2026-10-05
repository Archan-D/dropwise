#!/usr/bin/env node
/* Tests for the patient-code server functions, using an in-memory stand-in for Cloudflare KV.
   Run from the project folder:  node tests/test-api.mjs */
import {onRequestPost} from "../functions/api/plan.js";
import {onRequestGet} from "../functions/api/plan/[code].js";
import {onRequestGet as status} from "../functions/api/status.js";
import {normalizeCode} from "../server/codes.js";

let pass = 0, fail = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log("  ✓ " + name); } catch(e){ fail++; console.log("  ✗ " + name + "\n      " + e.message); } };
const ok = (c, msg) => { if (!c) throw new Error(msg || "assertion failed"); };
const store = new Map();
const env = {PLANS:{get:async k => store.has(k) ? store.get(k) : null, put:async (k, v, o) => { store.set(k, v); env.ttl = o && o.expirationTtl; }}};
const post = (body, e = env) => onRequestPost({request:new Request("https://x/api/plan", {method:"POST", body:JSON.stringify(body), headers:{"content-type":"application/json"}}), env:e});
const get = (code, e = env) => onRequestGet({params:{code}, env:e});
const PLAN = "3~0R~1wk~1~0~0~604-555-0100~0.R.0..3:7!4.R.0..3:7_2:7_1:7_0:7!b.R.0..3:s~~";

console.log("Patient codes");
await test("create a code, then look it up as typed (lower case, dash)", async () => {
  const r = await post({plan:PLAN}), j = await r.json();
  ok(r.status === 200 && /^[0-9A-HJKMNP-TV-Z]{8}$/.test(j.code), JSON.stringify(j));
  const g = await get(j.code.slice(0,4).toLowerCase() + "-" + j.code.slice(4).toLowerCase()), gj = await g.json();
  ok(g.status === 200 && gj.plan === PLAN, "lookup");
  ok(env.ttl === 730 * 86400, "expires after 2 years");
  ok(g.headers.get("cache-control") === "no-store", "no caching");
});
await test("unknown and malformed codes are rejected", async () => {
  ok((await get("ZZZZZZZZ")).status === 404); ok((await get("abc")).status === 400);
});
await test("only Dropwise plans can be stored", async () => {
  ok((await post({plan:"<script>alert(1)</script>"})).status === 400);
  ok((await post({plan:"3~" + "a".repeat(3000)})).status === 400);
  ok((await post({})).status === 400);
});
await test("clear message when the database isn't set up", async () => {
  ok((await post({plan:PLAN}, {})).status === 503); ok((await get("ZZZZZZZZ", {})).status === 503);
});
await test("status tells the builder whether the code database is connected", async () => {
  const a = await (await status({env})).json(), b = await (await status({env:{ASSETS:{fetch(){}}}})).json();
  ok(a.server && a.codes && a.bindings.includes("PLANS"), JSON.stringify(a));
  ok(b.server && !b.codes && b.bindings.length === 0, JSON.stringify(b));
});
await test("a database bound under another name (e.g. plans) still works", async () => {
  const m = new Map(), kv = {get:async k => m.has(k) ? m.get(k) : null, put:async (k, v) => { m.set(k, v); }, getWithMetadata:async () => ({}), list:async () => ({keys:[]})};
  const e = {plans:kv}, r = await post({plan:PLAN}, e), j = await r.json();
  ok(r.status === 200 && j.code, JSON.stringify(j)); ok((await get(j.code, e)).status === 200, "lookup");
  ok((await (await status({env:e})).json()).codes, "status");
});
await test("typed O / I / L are read as 0 / 1", () => { ok(normalizeCode("o1il-abcd") === "0111ABCD"); });
await test("codes don't repeat (2,000 created)", async () => {
  const seen = new Set(); for (let i = 0; i < 2000; i++) seen.add((await (await post({plan:PLAN})).json()).code);
  ok(seen.size === 2000);
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
