import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

serve(handler);

function handler(req: Request): Response {
  return new Response("Hello, World!");
}
