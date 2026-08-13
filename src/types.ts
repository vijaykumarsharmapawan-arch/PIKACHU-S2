export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export type TriagePriority = 'Critical' | 'Emergency' | 'Urgent' | 'Less Urgent' | 'Non-Urgent';

export type CaseStatus = 
  | 'waiting' 
  | 'triaged' 
  | 'called'
  | 'in_consultation' 
  | 'under_observation' 
  | 'admitted' 
  | 'discharged' 
  | 'transferred';

export type UserRole = 'patient' | 'doctor' | 'triage_nurse' | 'hospital_admin';

export type DoctorStatus = 'available' | 'in_consultation' | 'on_break' | 'off_duty';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  departmentId?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  allergies: string[];
  medicalHistory: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  totalBeds: number;
  occupiedBeds: number;
  currentWaitTimeMinutes: number;
  activeStaffCount: number;
  color: string;
  iconName: string;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  departmentId: string;
  specialty: string;
  status: DoctorStatus;
  activeRoom: string;
  currentCaseId?: string;
}

export interface VitalSigns {
  heartRate?: number; // bpm
  bloodPressureSys?: number; // mmHg
  bloodPressureDia?: number; // mmHg
  spo2?: number; // %
  respiratoryRate?: number; // bpm
  temperature?: number; // °C
  painScale?: number; // 0-10
}

export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  reportedSymptoms: string;
  symptomLanguage?: string;
  vitalSigns: VitalSigns;
  intakeTime: string;
  triageLevel: TriageLevel;
  triagePriority: TriagePriority;
  assignedDepartmentId: string;
  assignedDoctorId?: string;
  status: CaseStatus;
  aiTriageId?: string;
  clinicalNotes?: string;
  bedAssigned?: string;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriageResult {
  id: string;
  caseId: string;
  predictedLevel: TriageLevel;
  predictedPriority: TriagePriority;
  predictedDepartment: string;
  departmentId: string;
  confidence: number;
  reasonSummary: string;
  clinicalExplainability: {
    chiefComplaintAnalysis: string;
    redFlagAlerts: string[];
    riskFactors: string[];
    vitalSignsCorrelation: string;
    immediateNurseActions: string[];
  };
  riskScore: number; // 0 - 100
  estimatedWaitMinutes: number;
  aiModelVersion: string;
  adversarialCheckPassed: boolean;
  policyApprovalStatus: 'approved' | 'escalated_to_human' | 'flagged';
  policyViolationNotes?: string;
  latencyMs: number;
  tokensUsed?: number;
  timestamp: string;
}

export interface QueueEntry {
  id: string;
  caseId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  departmentId: string;
  departmentName: string;
  triageLevel: TriageLevel;
  triagePriority: TriagePriority;
  reportedSymptoms: string;
  vitalSigns: VitalSigns;
  arrivalTimestamp: string;
  dynamicPosition: number;
  status: CaseStatus;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  riskScore: number;
  estimatedWaitMinutes: number;
  callTimestamp?: string;
}

export interface NotificationItem {
  id: string;
  recipientUserId?: string;
  recipientRole?: UserRole | 'all';
  caseId?: string;
  caseNumber?: string;
  title: string;
  message: string;
  type: 'new_case' | 'priority_change' | 'dept_assigned' | 'patient_called' | 'status_update' | 'critical_alert' | 'sms_sent';
  isRead: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  traceId: string;
  eventType: string;
  performedBy: string;
  targetEntity: string;
  targetId: string;
  details: Record<string, unknown>;
  latencyMs?: number;
  timestamp: string;
}

export interface ClinicalPolicyRule {
  id: string;
  name: string;
  condition: string;
  forcedLevel?: TriageLevel;
  forcedDepartment?: string;
  escalateToHuman: boolean;
  enabled: boolean;
  description: string;
}

export interface BenchmarkMetrics {
  totalProcessed: number;
  successfulIntakes: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  queueConsistencyScore: number;
  adversarialResistanceRate: number;
  aiTriageAccuracy: number;
  activeSocketsCount: number;
}

export interface ClinicalEvaluationCase {
  id: string;
  category: 'Normal' | 'Ambiguous' | 'Rare' | 'Conflicting' | 'Adversarial' | 'High-Risk Emergency';
  symptomInput: string;
  patientAge: number;
  patientGender: string;
  vitals: VitalSigns;
  expectedLevel: TriageLevel;
  expectedDepartment: string;
  description: string;
  adversarialPayload?: boolean;
}

export type WebSocketMessage = 
  | { type: 'INIT_STATE'; payload: { cases: Case[]; queue: QueueEntry[]; departments: Department[]; doctors: Doctor[]; notifications: NotificationItem[]; metrics: HospitalMetrics } }
  | { type: 'CASE_CREATED'; payload: { caseItem: Case; queueEntry: QueueEntry; triageResult: TriageResult } }
  | { type: 'QUEUE_UPDATED'; payload: { queue: QueueEntry[] } }
  | { type: 'TRIAGE_UPDATED'; payload: { caseId: string; triageLevel: TriageLevel; triagePriority: TriagePriority; departmentId: string; reason?: string } }
  | { type: 'PATIENT_CALLED'; payload: { caseId: string; doctorName: string; room: string; departmentName: string; patientName: string } }
  | { type: 'STATUS_UPDATED'; payload: { caseId: string; status: CaseStatus; details?: string } }
  | { type: 'NOTIFICATION_PUSH'; payload: NotificationItem }
  | { type: 'METRICS_UPDATED'; payload: HospitalMetrics }
  | { type: 'SYSTEM_EVENT'; payload: { text: string; level: 'info' | 'warn' | 'error' } };

export interface HospitalMetrics {
  totalPatientsToday: number;
  activeInQueue: number;
  criticalCasesCount: number;
  emergencyCasesCount: number;
  avgWaitTimeMinutes: number;
  bedOccupancyRate: number;
  triageAccuracyPercent: number;
  aiTokensProcessed: number;
  averageAiLatencyMs: number;
  connectedClients: number;
}
