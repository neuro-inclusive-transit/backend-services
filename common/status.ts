/**
 * oak route handler for /liveliness
 */

import type { Context } from "oak/mod.ts";

export default (ctx: Context) => {
  ctx.response.body = "OK";
  ctx.response.status = 200;
};
