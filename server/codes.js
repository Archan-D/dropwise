/* Dropwise patient codes: shared helpers for the Cloudflare Pages Functions.
   A code is 8 characters from Crockford's base-32 alphabet (no I, L, O or U, so it's easy to read aloud),
   shown as XXXX-XXXX. About 1 trillion possible codes, so they can't realistically be guessed.
   Only the encoded drop plan is stored: never the patient's name. */
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LEN = 8;
export const TTL_SECONDS = 60 * 60 * 24 * 730;            // codes expire after 2 years
const PLAN_RE = /^3~[A-Za-z0-9~!._:%-]{5,2000}$/;           // same format as the link after "#r="

export function newCode(){
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => ALPHABET[b & 31]).join("");
}
/* Accept what people type: lower case, spaces, dashes, and the letters O / I / L for 0 / 1 */
export function normalizeCode(raw){
  const c = String(raw || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return c.length === CODE_LEN && [...c].every(ch => ALPHABET.includes(ch)) ? c : null;
}
export const validPlan = p => typeof p === "string" && PLAN_RE.test(p);
/* The code database: the KV namespace bound as PLANS. If it was bound under another name (plans, DB…), use that instead. */
const isKV = v => v && typeof v === "object" && typeof v.get === "function" && typeof v.put === "function" && typeof v.getWithMetadata === "function";
export const plansOf = env => (env && (env.PLANS || Object.values(env).find(isKV))) || null;
/* Names of everything bound to the project (never their contents), to help set-up */
export const bindingNames = env => Object.entries(env || {}).filter(([k, v]) => k !== "ASSETS" && v && typeof v === "object").map(([k]) => k);
export function json(body, status = 200){
  return new Response(JSON.stringify(body), {status, headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "x-robots-tag":"noindex"
  }});
}
