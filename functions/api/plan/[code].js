/* GET /api/plan/K7M4-QX9P  ->  {code:"K7M4QX9P", plan:"3~..."}
   Looks up a patient code. Returns 404 if the code doesn't exist or has expired. */
import {normalizeCode, json, plansOf} from "../../../server/codes.js";

export async function onRequestGet({params, env}){
  const db = plansOf(env);
  if (!db) return json({error:"Patient codes aren't set up on this server yet."}, 503);
  const code = normalizeCode(params.code);
  if (!code) return json({error:"That code isn't the right length. Codes have 8 letters and numbers."}, 400);
  const plan = await db.get(code);
  if (plan === null) return json({error:"No plan found for that code. Check it and try again."}, 404);
  return json({code, plan});
}
