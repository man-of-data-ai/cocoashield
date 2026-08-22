import { ApiError, apiRequest } from "@/lib/api-client";
import type { AuditFacets, AuditFilters, AuditLog, CreateExportInput, ExportRecord } from "@/types/export";

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

export const exportService = {
  list(): Promise<ExportRecord[]> {
    return apiRequest<ExportRecord[]>("/v1/exports");
  },

  listAudit(filters: AuditFilters = {}): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return apiRequest<AuditLog[]>(`/v1/audit${query ? `?${query}` : ""}`);
  },

  listAuditFacets(): Promise<AuditFacets> {
    return apiRequest<AuditFacets>("/v1/audit/facets");
  },

  async generate(input: CreateExportInput): Promise<void> {
    const response = await fetch("/v1/exports/generate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      let message = `Erreur inattendue (${response.status}).`;
      try {
        const payload = (await response.json()) as { message?: string | string[] };
        if (Array.isArray(payload.message)) message = payload.message.join(" ");
        else if (payload.message) message = payload.message;
      } catch {
      }
      throw new ApiError(message, response.status);
    }
    const blob = await response.blob();
    const filename =
      filenameFromDisposition(response.headers.get("Content-Disposition")) ??
      "cocoashield-export";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
