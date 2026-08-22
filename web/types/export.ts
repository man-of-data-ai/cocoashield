export type ExportScope = "zone" | "mission" | "period";
export type ExportFormat = "geojson" | "shapefile" | "kml-kmz" | "csv" | "pdf";

export type ExportRecord = {
  id: string;
  createdAt: string;
  userId: string;
  userEmail: string | null;
  scope: ExportScope;
  scopeLabel: string;
  format: ExportFormat;
  includeSourceImages: boolean;
  verifiedOnly: boolean;
};

export type AuditLog = {
  id: string;
  createdAt: string;
  userId: string;
  userEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
};

export type AuditFilters = {
  user?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  target?: string;
  limit?: number;
  offset?: number;
};

/** Réponse paginée de `GET /v1/audit`. */
export type AuditPage = {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditFacets = { users: string[]; actions: string[] };

export type CreateExportInput = {
  scope: ExportScope;
  formats: ExportFormat[];
  scopeId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeSourceImages: boolean;
  verifiedOnly: boolean;
};
