import { NextResponse } from "next/server";

/** Used to list the numbered "NN_...md" source-extract files in /public and match the Nth
 *  file (01_, 02_, ...) to the Nth business process — but that matched by position across
 *  ALL projects, so every project's business processes showed the same handful of reference
 *  docs from one past engagement. Stubbed to return no files until reference docs are
 *  associated per-project instead of globally by index. */
export async function GET() {
  return NextResponse.json({ files: [] });
}
