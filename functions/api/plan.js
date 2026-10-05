/* POST /api/plan  {plan:"3~..."}  ->  {code:"K7M4QX9P"}
   Saves a drop plan and returns a new patient code. Needs a KV namespace bound as PLANS (see README). */
import {newCode, validPlan, json, TTL_SECONDS} from "../../server/codes.js";

export async function onRequestPost({request, env}){
  if (!env.PLANS) return json({error:"Patient codes aren't set up on this server yet."}, 503);
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 4096) return json({error:"That plan is too large."}, 413);
  let body;
  try { body = await request.json(); } catch(e){ return json({error:"That request wasn't valid."}, 400); }
  if (!validPlan(body && body.plan)) return json({error:"That isn't a Dropwise plan."}, 400);
  for (let i = 0; i < 5; i++){
    const code = newCode();
    if (await env.PLANS.get(code) === null){
      await env.PLANS.put(code, body.plan, {expirationTtl:TTL_SECONDS});
      return json({code});
    }
  }
  return json({error:"Couldn't make a code. Try again."}, 500);
}
