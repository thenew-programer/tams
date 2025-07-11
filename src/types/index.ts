export interface Anomaly {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  service: string;
  responsiblePerson: string;
  status: 'new' | 'in_progress' | 'treated' | 'closed';
  originSource: string;
  createdAt: Date;
  updatedAt: Date;
  
  // AI Predictions (combined and scaled to /5)
  fiabiliteIntegriteScore: number; // Combined Fiabilité + Intégrité score /5
  disponibiliteScore: number; // /5
  processSafetyScore: number; // /5
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // User overrides
  userFiabiliteIntegriteScore?: number; // /5
  userDisponibiliteScore?: number; // /5
  userProcessSafetyScore?: number; // /5
  userCriticalityLevel?: 'low' | 'medium' | 'high' | 'critical';
  useUserScores?: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  
  // Optional fields
  estimatedHours?: number;
  priority?: number;
  attachments?: Attachment[];
  comments?: Comment[];
  maintenanceWindowId?: string;
  actionPlan?: ActionPlan;
  hasActionPlan?: boolean;
  
  // Archive fields
  archivedAt?: Date;
  archivedBy?: string;
  archiveReason?: string;
}

export interface MaintenanceWindow {
  id: string;
  type: 'force' | 'minor' | 'major';
  durationDays: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  assignedAnomalies?: Anomaly[];
  autoCreated?: boolean;
  sourceAnomalyId?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  text: string;
  type: 'note' | 'rex' | 'update';
  createdAt: Date;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface DashboardMetrics {
  totalAnomalies: number;
  openAnomalies: number;
  criticalAnomalies: number;
  averageResolutionTime: number;
  treatmentRate: number;
  safetyIncidents: number;
  maintenanceWindowUtilization: number;
  costImpact: number;
}

export interface ActionItem {
  id: string;
  action: string;
  responsable: string;
  pdrsDisponible: string;
  ressourcesInternes: string;
  ressourcesExternes: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'reporte';
  dureeHeures: number;
  dureeJours: number;
  dateDebut?: Date;
  dateFin?: Date;
}

export interface ActionPlan {
  id: string;
  anomalyId: string;
  needsOutage: boolean;
  outageType?: 'force' | 'minor' | 'major';
  outageDuration?: number;
  plannedDate?: Date;
  actions: ActionItem[];
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedCost: number;
  priority: 1 | 2 | 3 | 4 | 5;
  comments: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  completionPercentage: number;
}