import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

/** Lists the numbered "NN_...md" source-extract files in /public, sorted ascending — the Nth
 *  file (01_, 02_, ...) is the reference document for the Nth business process. Not under /api
 *  since that prefix is rewritten to the backend service (see next.config.ts). */
export async function GET() {
  const publicDir = path.join(process.cwd(), "public");
  const entries = await readdir(publicDir);
  const files = entries
    .filter(f => /^\d{2}_.*\.md$/.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return NextResponse.json({ files });
}
