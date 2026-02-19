import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;

/**
 * Parse resume PDF: extract text, send to Supabase Edge Function (OpenAI).
 * Edge Function holds OPENAI_API_KEY secret.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext !== "pdf") {
      return NextResponse.json({ detail: "File must be a PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text || text.length < 50) {
      return NextResponse.json(
        { detail: "Could not extract meaningful text from PDF. Ensure it is a resume or profile document." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { detail: "Server not configured for resume parsing" },
        { status: 500 }
      );
    }

    const edgeUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/parse-resume`;
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { detail: data.error || data.detail || `Parse failed (${res.status})` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
