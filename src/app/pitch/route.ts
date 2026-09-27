import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

/** Raw HTML HackGT pitch deck — open /pitch, use ←/→, F fullscreen, N notes. */
export async function GET() {
  const html = await readFile(path.join(process.cwd(), "public/pitch/index.html"), "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
