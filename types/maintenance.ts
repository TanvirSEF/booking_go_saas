export type DatabaseHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface CollectionHealthStat {
  name: string;
  documentCount: number;
}

export interface IndexHealthStat {
  collection: string;
  indexCount: number;
  indexes: string[];
}

export interface DatabaseHealthReport {
  status: DatabaseHealthStatus;
  pingMs: number;
  databaseName: string;
  collections: CollectionHealthStat[];
  indexes: IndexHealthStat[];
  timestamp: Date;
}

export interface OrphanItemCount {
  entity: string;
  count: number;
  description: string;
  sampleIds?: string[];
}

export interface OrphanAuditReport {
  totalOrphans: number;
  breakdown: OrphanItemCount[];
  timestamp: Date;
}

export type VacuumScope =
  | 'all'
  | 'orphans'
  | 'stale_logs'
  | 'stale_webhooks'
  | 'read_notifications';

export interface VacuumRetentionConfig {
  loginLogsDays?: number;
  webhooksDays?: number;
  notificationsDays?: number;
}

export interface VacuumOptions {
  dryRun?: boolean;
  scope?: VacuumScope;
  businessId?: string;
  retention?: VacuumRetentionConfig;
}

export interface VacuumExecutionResult {
  dryRun: boolean;
  durationMs: number;
  scanned: number;
  purged: number;
  breakdown: Record<string, number>;
  errors: string[];
  timestamp: Date;
}
