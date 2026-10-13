// Importing the WS client applies the MOODLE_INSECURE_TLS dev opt-in for this route too.
import "@/lib/moodle/client";
import { NextResponse } from "next/server";
import { MOODLE_URL, assertConfigured } from "@/lib/moodle/config";
import { getToken } from "@/lib/session";

const MAX_MB = Number(process.env.MOODLE_MAX_UPLOAD_MB ?? 50);

interface MoodleUploadedFile {
  itemid: number;
  filename: string;
  filepath: string;
}

/**
 * Upload files into the user's Moodle draft area (webservice/upload.php).
 * Body: multipart form with one or more `file` fields and an optional
 * `itemid` (reuse an existing draft area to add files to it).
 * Returns `{ itemid, files }`; the itemid is then passed to e.g.
 * mod_assign_save_submission as `files_filemanager`.
 */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  assertConfigured();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No file" }, { status: 400 });
  const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
  if (tooBig) {
    return NextResponse.json({ error: `${tooBig.name} exceeds ${MAX_MB} MB` }, { status: 413 });
  }

  const itemid = String(form.get("itemid") ?? "0");
  if (!/^\d+$/.test(itemid)) return NextResponse.json({ error: "Bad itemid" }, { status: 400 });

  const upstreamForm = new FormData();
  upstreamForm.set("token", token);
  upstreamForm.set("filearea", "draft");
  upstreamForm.set("itemid", itemid);
  files.forEach((f, i) => upstreamForm.set(`file_${i + 1}`, f, f.name));

  let json: unknown;
  try {
    const res = await fetch(`${MOODLE_URL}/webservice/upload.php`, {
      method: "POST",
      body: upstreamForm,
      cache: "no-store",
    });
    json = await res.json();
  } catch {
    return NextResponse.json({ error: "Moodle upload failed" }, { status: 502 });
  }

  // Moodle reports errors as an object with `error`; success is an array of files.
  if (!Array.isArray(json)) {
    const err = json as { error?: string; message?: string };
    return NextResponse.json({ error: err.error ?? err.message ?? "Upload rejected" }, { status: 400 });
  }
  const uploaded = json as MoodleUploadedFile[];
  return NextResponse.json({
    itemid: uploaded[0]?.itemid ?? Number(itemid),
    files: uploaded.map((f) => ({ filename: f.filename, filepath: f.filepath })),
  });
}
