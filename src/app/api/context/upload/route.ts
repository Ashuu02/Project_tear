import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "context-uploads";

function isPrintableRatio(text: string): number {
  if (!text.length) return 0;
  const printable = text.split("").filter((c) => {
    const code = c.charCodeAt(0);
    return (code >= 32 && code < 127) || code === 9 || code === 10 || code === 13;
  }).length;
  return printable / text.length;
}

function stripBinaryPdf(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const textBlocks: string[] = [];
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const stringRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let strMatch;
    while ((strMatch = stringRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
      textBlocks.push(decoded);
    }
  }
  if (textBlocks.length > 0) {
    return textBlocks.join(" ").replace(/\s+/g, " ").trim();
  }
  return raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 26214400, // 25MB
      allowedMimeTypes: [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const sessionId = (formData.get("sessionId") as string) || "unknown";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { extractedText: "", valid: false, message: "No file provided" },
        { status: 400 }
      );
    }

    const f = file as File;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const arrayBuffer = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Extract text ──────────────────────────────────────────────────────────
    let extractedText = "";
    if (ext === "txt") {
      extractedText = buffer.toString("utf-8");
    } else if (ext === "pdf") {
      extractedText = stripBinaryPdf(buffer);
    } else if (ext === "doc" || ext === "docx") {
      extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    } else {
      extractedText = buffer.toString("utf-8");
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    const printableRatio = isPrintableRatio(extractedText);
    if (extractedText.length < 50) {
      return NextResponse.json({
        extractedText: "", valid: false,
        message: "Extracted text is too short (less than 50 characters)",
      });
    }
    if (printableRatio < 0.7) {
      return NextResponse.json({
        extractedText: "", valid: false,
        message: "File appears to be binary or unreadable",
      });
    }

    const truncated = extractedText.length > 20000
      ? extractedText.slice(0, 20000) + "\n[Content truncated at 20,000 characters]"
      : extractedText;

    // ── Store in Supabase Storage ─────────────────────────────────────────────
    let storagePath = "";
    let storageUrl = "";

    try {
      await ensureBucket();

      const timestamp = Date.now();
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      storagePath = `${sessionId}/${timestamp}_${safeName}`;

      const contentTypeMap: Record<string, string> = {
        pdf: "application/pdf",
        txt: "text/plain",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: contentTypeMap[ext] ?? "application/octet-stream",
          upsert: false,
        });

      if (!uploadError) {
        // Generate a signed URL valid for 7 days
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        storageUrl = signed?.signedUrl ?? "";
      }
    } catch (storageErr) {
      console.error("[upload] Storage error (non-fatal):", storageErr);
    }

    // ── Save metadata to DB ───────────────────────────────────────────────────
    try {
      await supabaseAdmin.from("uploaded_files").insert({
        session_id: sessionId,
        file_name: f.name,
        file_size: f.size,
        file_type: ext,
        storage_path: storagePath,
        storage_url: storageUrl,
        extracted_text: truncated,
        valid: true,
      });
    } catch (dbErr) {
      console.error("[upload] DB insert error (non-fatal):", dbErr);
    }

    return NextResponse.json({
      extractedText: truncated,
      valid: true,
      storagePath,
      storageUrl,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { extractedText: "", valid: false, message: `Upload error: ${message}` },
      { status: 500 }
    );
  }
}
