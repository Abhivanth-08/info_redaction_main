// src/lib/api.ts

// ⚠️ In Vite, env vars must be prefixed with VITE_
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export type RedactResponse = {
  session_id: string;
  message: string;
  files: Record<string, string>; // keys: redacted, log, optionally overlay
  log_summary: unknown;
};

export async function redactDocument(params: {
  file: File;
  text_redaction_mode: string;
  visual_redaction_mode: string;
  create_overlay_pdf: boolean;
}): Promise<RedactResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("text_redaction_mode", params.text_redaction_mode);
  formData.append("visual_redaction_mode", params.visual_redaction_mode);
  formData.append("create_overlay_pdf", String(params.create_overlay_pdf));

  const res = await fetch(`${API_BASE_URL}/redact/`, {
    method: "POST",
    body: formData,
    cache: "no-store", // 👈 prevent 304 caching issues
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Redaction request failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON but got ${contentType}. Body: ${text.slice(0, 200)}`
    );
  }

  return (await res.json()) as RedactResponse;
}

export async function downloadServerFile(
  sessionId: string,
  fileKey: string,
  downloadName?: string
): Promise<void> {
  const url = `${API_BASE_URL}/download/${encodeURIComponent(
    sessionId
  )}/${encodeURIComponent(fileKey)}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Download failed: ${res.status}`);
  }

  const blob = await res.blob();

  // If a custom name is provided, use it; otherwise attempt to extract from header; fallback to fileKey
  let filename = downloadName || fileKey;
  if (!downloadName) {
    const disposition =
      res.headers.get("content-disposition") ||
      res.headers.get("Content-Disposition");
    if (disposition) {
      const match =
        /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(disposition);
      const value = decodeURIComponent(match?.[1] || match?.[2] || "");
      if (value) filename = value;
    }
  }

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export async function getFileBlobUrl(
  sessionId: string,
  fileKey: string
): Promise<string> {
  const url = `${API_BASE_URL}/download/${encodeURIComponent(
    sessionId
  )}/${encodeURIComponent(fileKey)}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Fetch failed: ${res.status}`);
  }

  const blob = await res.blob();
  // Coerce the MIME to application/pdf for reliable iframe embedding
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  return URL.createObjectURL(pdfBlob);
}

// export const API_BASE_URL = import.meta.env.BACKEND_URL ;

// export type RedactResponse = {
//   session_id: string;
//   message: string;
//   files: Record<string, string>; // keys: redacted, log, optionally overlay
//   log_summary: unknown;
// };

// export async function redactDocument(params: {
//   file: File;
//   text_redaction_mode: string;
//   visual_redaction_mode: string;
//   create_overlay_pdf: boolean;
// }): Promise<RedactResponse> {
//   const formData = new FormData();
//   formData.append("file", params.file);
//   formData.append("text_redaction_mode", params.text_redaction_mode);
//   formData.append("visual_redaction_mode", params.visual_redaction_mode);
//   // Booleans should be sent as strings for Form parsing
//   formData.append("create_overlay_pdf", String(params.create_overlay_pdf));

//   const res = await fetch(`${API_BASE_URL}/redact/`, {
//     method: "POST",
//     body: formData,
//   });

//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(text || `Redaction request failed: ${res.status}`);
//   }
//   return (await res.json()) as RedactResponse;
// }

// export async function downloadServerFile(
//   sessionId: string,
//   fileKey: string,
//   downloadName?: string
// ): Promise<void> {
//   const url = `${API_BASE_URL}/download/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`;
//   const res = await fetch(url);
//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(text || `Download failed: ${res.status}`);
//   }
//   const blob = await res.blob();

//   // If a custom name is provided, use it; otherwise attempt to extract from header; fallback to fileKey
//   let filename = downloadName || fileKey;
//   if (!downloadName) {
//     const disposition = res.headers.get("content-disposition") || res.headers.get("Content-Disposition");
//     if (disposition) {
//       const match = /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(disposition);
//       const value = decodeURIComponent(match?.[1] || match?.[2] || "");
//       if (value) filename = value;
//     }
//   }

//   const a = document.createElement("a");
//   a.href = URL.createObjectURL(blob);
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
//   URL.revokeObjectURL(a.href);
// }

// export async function getFileBlobUrl(
//   sessionId: string,
//   fileKey: string
// ): Promise<string> {
//   const url = `${API_BASE_URL}/download/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`;
//   const res = await fetch(url);
//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(text || `Fetch failed: ${res.status}`);
//   }
//   const blob = await res.blob();
//   // Coerce the MIME to application/pdf for reliable iframe embedding
//   const pdfBlob = new Blob([blob], { type: 'application/pdf' });
//   return URL.createObjectURL(pdfBlob);
// }
