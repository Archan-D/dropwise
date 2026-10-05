/* GET /api/status  ->  {server:true, codes:true|false, bindings:[...]}
   Lets the builder explain why patient codes aren't working: no server part, or no code database connected.
   Only binding names are reported, never any stored data. */
import {json, plansOf, bindingNames} from "../../server/codes.js";

export async function onRequestGet({env}){
  return json({server:true, codes:!!plansOf(env), bindings:bindingNames(env)});
}
