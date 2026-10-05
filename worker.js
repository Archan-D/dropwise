/* Dropwise on Cloudflare Workers: the site's files are served as static assets (see wrangler.jsonc), and only
   /api/… addresses run this script. It uses the same patient-code functions as Cloudflare Pages (functions/api/). */
import {onRequestPost as createPlan} from "./functions/api/plan.js";
import {onRequestGet as findPlan} from "./functions/api/plan/[code].js";
import {onRequestGet as status} from "./functions/api/status.js";
import {json} from "./server/codes.js";

export default {
  async fetch(request, env){
    const url = new URL(request.url), method = request.method;
    if (url.pathname === "/api/status" && method === "GET") return status({request, env});
    if (url.pathname === "/api/plan" && method === "POST") return createPlan({request, env});
    const m = url.pathname.match(/^\/api\/plan\/([^/]+)$/);
    if (m && method === "GET") return findPlan({request, env, params:{code:decodeURIComponent(m[1])}});
    if (url.pathname.startsWith("/api/")) return json({error:"Not found."}, 404);
    return env.ASSETS.fetch(request);
  }
};
