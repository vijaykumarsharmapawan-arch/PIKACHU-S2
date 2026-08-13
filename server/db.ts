import { 
  Department, 
  Doctor, 
  Patient, 
  User, 
  Case, 
  TriageResult, 
  QueueEntry, 
  NotificationItem, 
  AuditLog, 
  ClinicalPolicyRule, 
  HospitalMetrics,
  TriageLevel,
  TriagePriority,
  CaseStatus
} from '../src/types';

export class HospitalDatabase {
  private users: Map<string, User> = new Map();
  private patients: Map<string, Patient> = new Map();
  private departments: Map<string, Department> = new Map();
  private doctors: Map<string, Doctor> = new Map();
  private cases: Map<string, Case> = new Map();
  private triageResults: Map<string, TriageResult> = new Map();
  private queue: QueueEntry[] = [];
  private notifications: NotificationItem[] = [];
  private auditLogs: AuditLog[] = [];
  private clinicalRules: ClinicalPolicyRule[] = [];
  
  // Concurrency Mutex Lock
  private queueMutexLocked = false;
  private queueLockWaiters: (() => void)[] = [];

  constructor() {
    this.seedInitialData();
  }

  private async acquireQueueLock(): Promise<() => void> {
    if (!this.queueMutexLocked) {
      this.queueMutexLocked = true;
      return () => this.releaseQueueLock();
    }
    return new Promise((resolve) => {
      this.queueLockWaiters.push(() => {
        this.queueMutexLocked = true;
        resolve(() => this.releaseQueueLock());
      });
    });
  }

  private releaseQueueLock() {
    this.queueMutexLocked = false;
    const next = this.queueLockWaiters.shift();
    if (next) {
      next();
    }
  }

  private seedInitialData() {
    // 1. Departments
    const depts: Department[] = [
      {
        id: 'dept-cardiology',
        name: 'Cardiology',
        code: 'CARD',
        description: 'Acute coronary syndromes, arrhythmias, hemodynamic instability',
        totalBeds: 18,
        occupiedBeds: 14,
        currentWaitTimeMinutes: 12,
        activeStaffCount: 6,
        color: '#ef4444',
        iconName: 'HeartPulse'
      },
      {
        id: 'dept-neurology',
        name: 'Neurology',
        code: 'NEUR',
        description: 'Acute ischemic stroke, seizures, altered mental status, intracranial pressure',
        totalBeds: 14,
        occupiedBeds: 9,
        currentWaitTimeMinutes: 20,
        activeStaffCount: 5,
        color: '#8b5cf6',
        iconName: 'Brain'
      },
      {
        id: 'dept-pulmonology',
        name: 'Pulmonology',
        code: 'PULM',
        description: 'Severe asthma, COPD exacerbation, acute respiratory distress, pulmonary embolism',
        totalBeds: 16,
        occupiedBeds: 11,
        currentWaitTimeMinutes: 18,
        activeStaffCount: 4,
        color: '#06b6d4',
        iconName: 'Wind'
      },
      {
        id: 'dept-trauma',
        name: 'Trauma & Emergency Surgery',
        code: 'TRAUM',
        description: 'High-velocity blunt trauma, penetrating injuries, hemorrhage control',
        totalBeds: 12,
        occupiedBeds: 8,
        currentWaitTimeMinutes: 8,
        activeStaffCount: 7,
        color: '#f97316',
        iconName: 'Flame'
      },
      {
        id: 'dept-orthopedics',
        name: 'Orthopedics',
        code: 'ORTH',
        description: 'Fractures, dislocations, acute limb ischemia, tendon ruptures',
        totalBeds: 20,
        occupiedBeds: 12,
        currentWaitTimeMinutes: 35,
        activeStaffCount: 4,
        color: '#3b82f6',
        iconName: 'Bone'
      },
      {
        id: 'dept-general',
        name: 'General Medicine',
        code: 'GMED',
        description: 'Abdominal pain, febrile illnesses, metabolic derangements, infections',
        totalBeds: 24,
        occupiedBeds: 17,
        currentWaitTimeMinutes: 45,
        activeStaffCount: 6,
        color: '#10b981',
        iconName: 'Stethoscope'
      },
      {
        id: 'dept-pediatrics',
        name: 'Pediatrics ER',
        code: 'PEDI',
        description: 'Neonatal emergencies, pediatric respiratory distress, high febrile seizures',
        totalBeds: 12,
        occupiedBeds: 6,
        currentWaitTimeMinutes: 25,
        activeStaffCount: 4,
        color: '#ec4899',
        iconName: 'Baby'
      },
      {
        id: 'dept-icu',
        name: 'Critical Care / ICU Resus',
        code: 'CICU',
        description: 'Septic shock, multi-organ failure, advanced airway management, cardiac arrest',
        totalBeds: 10,
        occupiedBeds: 8,
        currentWaitTimeMinutes: 4,
        activeStaffCount: 8,
        color: '#dc2626',
        iconName: 'Activity'
      }
    ];

    depts.forEach(d => this.departments.set(d.id, d));

    // 2. Users & Patients
    const sampleUsers: User[] = [
      { id: 'usr-1', name: 'Eleanor Vance', email: 'eleanor.vance@example.com', role: 'patient', phone: '+1 (555) 234-5678', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 'usr-2', name: 'Marcus Sterling', email: 'marcus.s@example.com', role: 'patient', phone: '+1 (555) 345-6789', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 'usr-3', name: 'Sophia Chen', email: 'sophia.c@example.com', role: 'patient', phone: '+1 (555) 456-7890', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
      { id: 'usr-4', name: 'David Miller', email: 'david.m@example.com', role: 'patient', phone: '+1 (555) 567-8901', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
      // Doctors
      { id: 'usr-doc-1', name: 'Dr. Aris Thorne, MD', email: 'a.thorne@hospital.org', role: 'doctor', departmentId: 'dept-cardiology', phone: '+1 (555) 901-1122', createdAt: new Date().toISOString() },
      { id: 'usr-doc-2', name: 'Dr. Sarah Jenkins, MD', email: 's.jenkins@hospital.org', role: 'doctor', departmentId: 'dept-neurology', phone: '+1 (555) 901-2233', createdAt: new Date().toISOString() },
      { id: 'usr-doc-3', name: 'Dr. Robert Rivera, MD', email: 'r.rivera@hospital.org', role: 'doctor', departmentId: 'dept-orthopedics', phone: '+1 (555) 901-3344', createdAt: new Date().toISOString() },
      { id: 'usr-doc-4', name: 'Dr. Maya Patel, MD', email: 'm.patel@hospital.org', role: 'doctor', departmentId: 'dept-general', phone: '+1 (555) 901-4455', createdAt: new Date().toISOString() },
      { id: 'usr-doc-5', name: 'Dr. Julian Hayes, MD', email: 'j.hayes@hospital.org', role: 'doctor', departmentId: 'dept-trauma', phone: '+1 (555) 901-5566', createdAt: new Date().toISOString() },
      // Triage Nurse & Admin
      { id: 'usr-nurse-1', name: 'Nurse Clara Oswald, RN-BC', email: 'c.oswald@hospital.org', role: 'triage_nurse', phone: '+1 (555) 901-7788', createdAt: new Date().toISOString() },
      { id: 'usr-admin-1', name: 'Director James Sterling', email: 'admin@hospital.org', role: 'hospital_admin', phone: '+1 (555) 901-9900', createdAt: new Date().toISOString() },
    ];

    sampleUsers.forEach(u => this.users.set(u.id, u));

    const samplePatients: Patient[] = [
      {
        id: 'pat-1',
        userId: 'usr-1',
        mrn: 'MRN-78401',
        firstName: 'Eleanor',
        lastName: 'Vance',
        dob: '1968-04-12',
        gender: 'female',
        bloodType: 'A+',
        allergies: ['Penicillin', 'Sulfa Drugs'],
        medicalHistory: ['Hypertension', 'Type 2 Diabetes', 'Previous Stent (2021)'],
        emergencyContactName: 'Thomas Vance',
        emergencyContactPhone: '+1 (555) 887-1234',
        emergencyContactRelation: 'Spouse'
      },
      {
        id: 'pat-2',
        userId: 'usr-2',
        mrn: 'MRN-92144',
        firstName: 'Marcus',
        lastName: 'Sterling',
        dob: '1981-11-29',
        gender: 'male',
        bloodType: 'O-',
        allergies: ['Latex', 'Codeine'],
        medicalHistory: ['Atrial Fibrillation', 'Chronic Migraines'],
        emergencyContactName: 'Elena Sterling',
        emergencyContactPhone: '+1 (555) 998-2345',
        emergencyContactRelation: 'Sister'
      },
      {
        id: 'pat-3',
        userId: 'usr-3',
        mrn: 'MRN-45129',
        firstName: 'Sophia',
        lastName: 'Chen',
        dob: '1995-07-19',
        gender: 'female',
        bloodType: 'B+',
        allergies: ['Aspirin'],
        medicalHistory: ['Mild Asthma'],
        emergencyContactName: 'Kevin Chen',
        emergencyContactPhone: '+1 (555) 776-3456',
        emergencyContactRelation: 'Brother'
      },
      {
        id: 'pat-4',
        userId: 'usr-4',
        mrn: 'MRN-33810',
        firstName: 'David',
        lastName: 'Miller',
        dob: '2001-02-05',
        gender: 'male',
        bloodType: 'O+',
        allergies: [],
        medicalHistory: ['Seasonal Allergies'],
        emergencyContactName: 'Patricia Miller',
        emergencyContactPhone: '+1 (555) 665-4567',
        emergencyContactRelation: 'Mother'
      }
    ];

    samplePatients.forEach(p => this.patients.set(p.id, p));

    // 3. Doctors
    const sampleDoctors: Doctor[] = [
      {
        id: 'doc-1',
        userId: 'usr-doc-1',
        name: 'Dr. Aris Thorne, MD',
        departmentId: 'dept-cardiology',
        specialty: 'Interventional Cardiology & Resuscitation',
        status: 'available',
        activeRoom: 'Cath Lab Resus 1'
      },
      {
        id: 'doc-2',
        userId: 'usr-doc-2',
        name: 'Dr. Sarah Jenkins, MD',
        departmentId: 'dept-neurology',
        specialty: 'Acute Neurovascular & Stroke Intervention',
        status: 'in_consultation',
        activeRoom: 'Neuro Bay 3'
      },
      {
        id: 'doc-3',
        userId: 'usr-doc-3',
        name: 'Dr. Robert Rivera, MD',
        departmentId: 'dept-orthopedics',
        specialty: 'Orthopedic Trauma & Extremity Reconstruction',
        status: 'available',
        activeRoom: 'Ortho Suite B'
      },
      {
        id: 'doc-4',
        userId: 'usr-doc-4',
        name: 'Dr. Maya Patel, MD',
        departmentId: 'dept-general',
        specialty: 'Emergency Medicine & Acute Toxicology',
        status: 'available',
        activeRoom: 'Exam Room 4'
      },
      {
        id: 'doc-5',
        userId: 'usr-doc-5',
        name: 'Dr. Julian Hayes, MD',
        departmentId: 'dept-trauma',
        specialty: 'Trauma Critical Care Surgeon',
        status: 'in_consultation',
        activeRoom: 'Trauma Bay 1'
      }
    ];

    sampleDoctors.forEach(d => this.doctors.set(d.id, d));

    // 4. Clinical Policy Rules (Guardrails)
    this.clinicalRules = [
      {
        id: 'rule-stemi',
        name: 'Acute Coronary Syndrome / STEMI Escalation',
        condition: 'Chest pain radiating to arm/jaw, diaphoresis, dyspnea or SpO2 < 92%',
        forcedLevel: 1,
        forcedDepartment: 'dept-cardiology',
        escalateToHuman: false,
        enabled: true,
        description: 'Mandates immediate Level 1 priority with STAT ECG & troponin orders within 10 minutes.'
      },
      {
        id: 'rule-stroke-fast',
        name: 'FAST Stroke Alert Protocol',
        condition: 'Sudden facial droop, unilateral arm weakness, acute slurred speech within 4.5 hour window',
        forcedLevel: 1,
        forcedDepartment: 'dept-neurology',
        escalateToHuman: false,
        enabled: true,
        description: 'Immediate CT/MRI neurovascular protocol activation with door-to-needle priority.'
      },
      {
        id: 'rule-anaphylaxis',
        name: 'Severe Anaphylaxis / Airway Compromise',
        condition: 'Stridor, throat swelling, hives, hypotension or acute respiratory failure',
        forcedLevel: 1,
        forcedDepartment: 'dept-icu',
        escalateToHuman: false,
        enabled: true,
        description: 'Immediate IM Epinephrine and emergency airway team dispatch.'
      },
      {
        id: 'rule-pediatric-fever',
        name: 'Neonatal / Infant High Febrile Risk',
        condition: 'Infant age < 3 months with temperature > 38.5°C or lethargy',
        forcedLevel: 2,
        forcedDepartment: 'dept-pediatrics',
        escalateToHuman: true,
        enabled: true,
        description: 'Requires urgent pediatric sepsis screening and lumbar puncture evaluation.'
      },
      {
        id: 'rule-adversarial-filter',
        name: 'Adversarial Prompt Injection & Safety Guard',
        condition: 'Input contains system override instructions, sql tags, jailbreaks or invalid clinical gibberish',
        forcedLevel: 4,
        escalateToHuman: true,
        enabled: true,
        description: 'Rejects prompt manipulation, strips malicious instructions, and flags for manual nurse intake.'
      }
    ];

    // 5. Seed Initial Cases to demonstrate dynamic reordering (as outlined in prompt)
    // #1 Critical Cardiology (Eleanor)
    // #2 High Neurology (Marcus)
    // #3 Medium Orthopedics (Sophia)
    // #4 Low General Medicine (David)
    const now = Date.now();

    const initialCases: Array<{ case: Case; triage: TriageResult }> = [
      {
        case: {
          id: 'case-101',
          caseNumber: 'CAS-2026-8901',
          patientId: 'pat-1',
          patientName: 'Eleanor Vance',
          patientAge: 58,
          patientGender: 'female',
          reportedSymptoms: 'Crushing retrosternal chest pressure radiating to left jaw and left arm, diaphoresis, severe shortness of breath.',
          vitalSigns: { heartRate: 118, bloodPressureSys: 165, bloodPressureDia: 98, spo2: 91, respiratoryRate: 26, temperature: 37.1, painScale: 9 },
          intakeTime: new Date(now - 1000 * 60 * 18).toISOString(),
          triageLevel: 1,
          triagePriority: 'Critical',
          assignedDepartmentId: 'dept-cardiology',
          assignedDoctorId: 'doc-1',
          status: 'waiting',
          aiTriageId: 'tri-101',
          clinicalNotes: 'ECG ordered STAT. High suspicion of STEMI.',
          bedAssigned: 'Bed C-02',
          createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 18).toISOString()
        },
        triage: {
          id: 'tri-101',
          caseId: 'case-101',
          predictedLevel: 1,
          predictedPriority: 'Critical',
          predictedDepartment: 'Cardiology',
          departmentId: 'dept-cardiology',
          confidence: 0.98,
          reasonSummary: 'Classic acute coronary syndrome presentation with hemodynamic compromise and hypoxemia.',
          clinicalExplainability: {
            chiefComplaintAnalysis: 'Crushing chest pain radiating to left arm with accompanying diaphoresis strongly correlates with acute myocardial ischemia.',
            redFlagAlerts: ['SpO2 below 92% on room air', 'Tachycardia HR 118', 'Severe ischemic chest pain (9/10)'],
            riskFactors: ['History of diabetes & previous coronary stent', 'Hypertensive presentation'],
            vitalSignsCorrelation: 'Elevated BP (165/98) and tachycardia indicate severe autonomic stress and myocardial strain.',
            immediateNurseActions: ['STAT 12-lead ECG within 10 min', 'Continuous telemetry & pulse oximetry', 'Establish dual IV lines', 'Oxygen via nasal cannula to target SpO2 > 94%']
          },
          riskScore: 96,
          estimatedWaitMinutes: 0,
          aiModelVersion: 'gemini-3.7-flash-clinical-v2',
          adversarialCheckPassed: true,
          policyApprovalStatus: 'approved',
          latencyMs: 340,
          tokensUsed: 420,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString()
        }
      },
      {
        case: {
          id: 'case-102',
          caseNumber: 'CAS-2026-8902',
          patientId: 'pat-2',
          patientName: 'Marcus Sterling',
          patientAge: 44,
          patientGender: 'male',
          reportedSymptoms: 'Sudden onset right-sided facial weakness, arm drift, and slurred speech starting 40 minutes ago while drinking coffee.',
          vitalSigns: { heartRate: 84, bloodPressureSys: 152, bloodPressureDia: 90, spo2: 98, respiratoryRate: 18, temperature: 36.8, painScale: 3 },
          intakeTime: new Date(now - 1000 * 60 * 25).toISOString(),
          triageLevel: 2,
          triagePriority: 'Emergency',
          assignedDepartmentId: 'dept-neurology',
          assignedDoctorId: 'doc-2',
          status: 'in_consultation',
          aiTriageId: 'tri-102',
          clinicalNotes: 'Stroke Code activated. Non-contrast head CT underway.',
          bedAssigned: 'Neuro-Bay 3',
          createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 20).toISOString()
        },
        triage: {
          id: 'tri-102',
          caseId: 'case-102',
          predictedLevel: 2,
          predictedPriority: 'Emergency',
          predictedDepartment: 'Neurology',
          departmentId: 'dept-neurology',
          confidence: 0.96,
          reasonSummary: 'Acute focal neurological deficits within 4.5-hour thrombolytic therapeutic window.',
          clinicalExplainability: {
            chiefComplaintAnalysis: 'Unilateral facial paresis, pronator drift, and dysarthria meet full criteria for FAST Stroke alert.',
            redFlagAlerts: ['Acute onset focal neurological deficit', 'Known history of Atrial Fibrillation (cardioembolic source)'],
            riskFactors: ['Atrial Fibrillation history', 'Elevated systolic BP'],
            vitalSignsCorrelation: 'Stable hemodynamics with reactive hypertension secondary to ischemic stroke.',
            immediateNurseActions: ['Urgent non-contrast Head CT / CTA', 'Blood glucose check', 'Maintain NPO status', 'Prepare IV thrombolysis / thrombectomy pathway']
          },
          riskScore: 89,
          estimatedWaitMinutes: 5,
          aiModelVersion: 'gemini-3.7-flash-clinical-v2',
          adversarialCheckPassed: true,
          policyApprovalStatus: 'approved',
          latencyMs: 310,
          tokensUsed: 390,
          timestamp: new Date(now - 1000 * 60 * 25).toISOString()
        }
      },
      {
        case: {
          id: 'case-103',
          caseNumber: 'CAS-2026-8903',
          patientId: 'pat-3',
          patientName: 'Sophia Chen',
          patientAge: 30,
          patientGender: 'female',
          reportedSymptoms: 'Deformity, severe pain and inability to bear weight on right ankle after falling down a flight of concrete stairs.',
          vitalSigns: { heartRate: 92, bloodPressureSys: 128, bloodPressureDia: 78, spo2: 99, respiratoryRate: 16, temperature: 36.9, painScale: 7 },
          intakeTime: new Date(now - 1000 * 60 * 40).toISOString(),
          triageLevel: 3,
          triagePriority: 'Urgent',
          assignedDepartmentId: 'dept-orthopedics',
          assignedDoctorId: 'doc-3',
          status: 'waiting',
          aiTriageId: 'tri-103',
          clinicalNotes: 'Right ankle splinted. 3-view X-ray ordered.',
          bedAssigned: 'Bed O-04',
          createdAt: new Date(now - 1000 * 60 * 40).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 40).toISOString()
        },
        triage: {
          id: 'tri-103',
          caseId: 'case-103',
          predictedLevel: 3,
          predictedPriority: 'Urgent',
          predictedDepartment: 'Orthopedics',
          departmentId: 'dept-orthopedics',
          confidence: 0.94,
          reasonSummary: 'Probable bimalleolar or trimalleolar fracture; neurovascular intact distal pulses.',
          clinicalExplainability: {
            chiefComplaintAnalysis: 'Visible bony deformity with acute trauma mechanism requires orthopedic reduction and radiography.',
            redFlagAlerts: ['Acute mechanical trauma with deformity', 'Severe localized pain (7/10)'],
            riskFactors: ['Fall from height'],
            vitalSignsCorrelation: 'Mild tachycardia secondary to acute orthopedic pain.',
            immediateNurseActions: ['Check dorsalis pedis and posterior tibial pulses', 'Apply posterior ankle splint', 'Administer prescribed analgesia', 'Order STAT ankle series X-rays']
          },
          riskScore: 54,
          estimatedWaitMinutes: 25,
          aiModelVersion: 'gemini-3.7-flash-clinical-v2',
          adversarialCheckPassed: true,
          policyApprovalStatus: 'approved',
          latencyMs: 290,
          tokensUsed: 360,
          timestamp: new Date(now - 1000 * 60 * 40).toISOString()
        }
      },
      {
        case: {
          id: 'case-104',
          caseNumber: 'CAS-2026-8904',
          patientId: 'pat-4',
          patientName: 'David Miller',
          patientAge: 25,
          patientGender: 'male',
          reportedSymptoms: 'Mild sore throat, low-grade fever, nasal congestion, and mild fatigue for the past 2 days. No respiratory distress.',
          vitalSigns: { heartRate: 74, bloodPressureSys: 118, bloodPressureDia: 72, spo2: 100, respiratoryRate: 14, temperature: 37.8, painScale: 2 },
          intakeTime: new Date(now - 1000 * 60 * 55).toISOString(),
          triageLevel: 4,
          triagePriority: 'Less Urgent',
          assignedDepartmentId: 'dept-general',
          assignedDoctorId: 'doc-4',
          status: 'waiting',
          aiTriageId: 'tri-104',
          clinicalNotes: 'Rapid viral swab pending.',
          bedAssigned: 'Waiting Lounge B',
          createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 55).toISOString()
        },
        triage: {
          id: 'tri-104',
          caseId: 'case-104',
          predictedLevel: 4,
          predictedPriority: 'Less Urgent',
          predictedDepartment: 'General Medicine',
          departmentId: 'dept-general',
          confidence: 0.97,
          reasonSummary: 'Mild upper respiratory tract infection without red flags or respiratory compromise.',
          clinicalExplainability: {
            chiefComplaintAnalysis: 'Subacute viral coryza symptoms with normal respiratory mechanics and stable hemodynamics.',
            redFlagAlerts: [],
            riskFactors: ['None identified'],
            vitalSignsCorrelation: 'Normal vital parameters with low-grade pyrexia.',
            immediateNurseActions: ['Rapid COVID/Flu/RSV viral antigen swab', 'Supportive hydration advice', 'Symptomatic antipyretic if needed']
          },
          riskScore: 18,
          estimatedWaitMinutes: 45,
          aiModelVersion: 'gemini-3.7-flash-clinical-v2',
          adversarialCheckPassed: true,
          policyApprovalStatus: 'approved',
          latencyMs: 270,
          tokensUsed: 310,
          timestamp: new Date(now - 1000 * 60 * 55).toISOString()
        }
      }
    ];

    initialCases.forEach(item => {
      this.cases.set(item.case.id, item.case);
      this.triageResults.set(item.triage.id, item.triage);
    });

    // Rebuild dynamic queue order
    this.recomputeQueueInternal();

    // Initial notifications
    this.notifications.push({
      id: 'notif-1',
      recipientRole: 'all',
      title: 'ER Command Center Active',
      message: 'PulseRoute ER triage engine operational. Real-time dynamic queue and WebSocket telemetry active.',
      type: 'critical_alert',
      isRead: false,
      timestamp: new Date(now - 1000 * 60 * 60).toISOString()
    });

    this.notifications.push({
      id: 'notif-2',
      caseId: 'case-101',
      caseNumber: 'CAS-2026-8901',
      recipientRole: 'doctor',
      title: 'Level 1 Critical Patient in Cardiology',
      message: 'Eleanor Vance assigned to Dr. Aris Thorne (Cath Lab Resus 1). STAT ECG in progress.',
      type: 'priority_change',
      isRead: false,
      timestamp: new Date(now - 1000 * 60 * 18).toISOString()
    });
  }

  // --- Dynamic Priority Queue Algorithm ---
  public async recomputeQueue(): Promise<QueueEntry[]> {
    const release = await this.acquireQueueLock();
    try {
      return this.recomputeQueueInternal();
    } finally {
      release();
    }
  }

  private recomputeQueueInternal(): QueueEntry[] {
    const activeCases = Array.from(this.cases.values()).filter(c => 
      c.status === 'waiting' || c.status === 'triaged' || c.status === 'called' || c.status === 'in_consultation'
    );

    // Dynamic sorting:
    // 1. Triage Level ASC (Level 1 is highest priority, then 2, 3, 4, 5)
    // 2. Risk score DESC (higher clinical risk within same tier)
    // 3. Arrival timestamp ASC (FIFO within identical priority/risk tier)
    activeCases.sort((a, b) => {
      if (a.triageLevel !== b.triageLevel) {
        return a.triageLevel - b.triageLevel;
      }
      
      const triageA = a.aiTriageId ? this.triageResults.get(a.aiTriageId) : null;
      const triageB = b.aiTriageId ? this.triageResults.get(b.aiTriageId) : null;
      const riskA = triageA?.riskScore || (6 - a.triageLevel) * 20;
      const riskB = triageB?.riskScore || (6 - b.triageLevel) * 20;

      if (riskA !== riskB) {
        return riskB - riskA; // higher risk comes first
      }

      return new Date(a.intakeTime).getTime() - new Date(b.intakeTime).getTime();
    });

    // Build queue entries with computed dynamic positions and wait estimates
    const newQueue: QueueEntry[] = [];
    const deptQueues: Record<string, number> = {};

    activeCases.forEach((c, idx) => {
      const patient = this.patients.get(c.patientId);
      const dept = this.departments.get(c.assignedDepartmentId);
      const doctor = c.assignedDoctorId ? this.doctors.get(c.assignedDoctorId) : undefined;
      const triage = c.aiTriageId ? this.triageResults.get(c.aiTriageId) : undefined;

      const deptId = c.assignedDepartmentId;
      deptQueues[deptId] = (deptQueues[deptId] || 0) + 1;
      
      // Calculate dynamic estimated wait
      let estWait = 0;
      if (c.triageLevel === 1) estWait = 0;
      else if (c.triageLevel === 2) estWait = Math.min(10, (deptQueues[deptId] - 1) * 5);
      else if (c.triageLevel === 3) estWait = Math.max(15, (deptQueues[deptId]) * 12);
      else if (c.triageLevel === 4) estWait = Math.max(30, (deptQueues[deptId]) * 18);
      else estWait = Math.max(45, (deptQueues[deptId]) * 25);

      newQueue.push({
        id: `q-${c.id}`,
        caseId: c.id,
        patientId: c.patientId,
        patientName: c.patientName,
        mrn: patient?.mrn || 'MRN-UNREG',
        departmentId: c.assignedDepartmentId,
        departmentName: dept?.name || 'Emergency Dept',
        triageLevel: c.triageLevel,
        triagePriority: c.triagePriority,
        reportedSymptoms: c.reportedSymptoms,
        vitalSigns: c.vitalSigns,
        arrivalTimestamp: c.intakeTime,
        dynamicPosition: idx + 1,
        status: c.status,
        assignedDoctorId: c.assignedDoctorId,
        assignedDoctorName: doctor?.name,
        riskScore: triage?.riskScore || (6 - c.triageLevel) * 20,
        estimatedWaitMinutes: estWait
      });
    });

    this.queue = newQueue;
    return this.queue;
  }

  // --- CRUD Operations ---

  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  public getPatients(): Patient[] {
    return Array.from(this.patients.values());
  }

  public getPatientById(id: string): Patient | undefined {
    return this.patients.get(id);
  }

  public getPatientByUserId(userId: string): Patient | undefined {
    return Array.from(this.patients.values()).find(p => p.userId === userId);
  }

  public createPatient(patient: Patient): Patient {
    this.patients.set(patient.id, patient);
    return patient;
  }

  public getDepartments(): Department[] {
    return Array.from(this.departments.values());
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.departments.get(id);
  }

  public updateDepartment(id: string, update: Partial<Department>): Department | undefined {
    const dept = this.departments.get(id);
    if (!dept) return undefined;
    const updated = { ...dept, ...update };
    this.departments.set(id, updated);
    return updated;
  }

  public getDoctors(): Doctor[] {
    return Array.from(this.doctors.values());
  }

  public getDoctorById(id: string): Doctor | undefined {
    return this.doctors.get(id);
  }

  public updateDoctor(id: string, update: Partial<Doctor>): Doctor | undefined {
    const doc = this.doctors.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...update };
    this.doctors.set(id, updated);
    return updated;
  }

  public getCases(): Case[] {
    return Array.from(this.cases.values());
  }

  public getCaseById(id: string): Case | undefined {
    return this.cases.get(id);
  }

  public getTriageResultById(id: string): TriageResult | undefined {
    return this.triageResults.get(id);
  }

  public getTriageResults(): TriageResult[] {
    return Array.from(this.triageResults.values());
  }

  public getQueue(): QueueEntry[] {
    return [...this.queue];
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addNotification(notification: NotificationItem): NotificationItem {
    this.notifications.unshift(notification);
    if (this.notifications.length > 200) {
      this.notifications.pop();
    }
    return notification;
  }

  public markNotificationRead(id: string): boolean {
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      return true;
    }
    return false;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(log: AuditLog): AuditLog {
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return log;
  }

  public getClinicalRules(): ClinicalPolicyRule[] {
    return [...this.clinicalRules];
  }

  public updateClinicalRule(id: string, update: Partial<ClinicalPolicyRule>): ClinicalPolicyRule | undefined {
    const idx = this.clinicalRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.clinicalRules[idx] = { ...this.clinicalRules[idx], ...update };
      return this.clinicalRules[idx];
    }
    return undefined;
  }

  // --- Core Case Creation & Triage Attachment (Atomic & Safe) ---
  public async createEmergencyCase(params: {
    caseItem: Case;
    triageResult: TriageResult;
  }): Promise<{ caseItem: Case; triageResult: TriageResult; queue: QueueEntry[] }> {
    const release = await this.acquireQueueLock();
    try {
      this.cases.set(params.caseItem.id, params.caseItem);
      this.triageResults.set(params.triageResult.id, params.triageResult);
      const queue = this.recomputeQueueInternal();

      // Create notification
      this.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        caseId: params.caseItem.id,
        caseNumber: params.caseItem.caseNumber,
        recipientRole: 'all',
        title: `New Case: ${params.caseItem.patientName} (Level ${params.caseItem.triageLevel} - ${params.caseItem.triagePriority})`,
        message: `Symptoms: "${params.caseItem.reportedSymptoms.substring(0, 75)}..." routed to ${params.triageResult.predictedDepartment}.`,
        type: params.caseItem.triageLevel <= 2 ? 'critical_alert' : 'new_case',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      // Audit Log
      this.addAuditLog({
        id: `audit-${Date.now()}`,
        traceId: `tr-${params.caseItem.id}`,
        eventType: 'CASE_INTAKE_AND_TRIAGE',
        performedBy: 'AI_TRIAGE_ENGINE',
        targetEntity: 'Case',
        targetId: params.caseItem.id,
        details: {
          triageLevel: params.caseItem.triageLevel,
          priority: params.caseItem.triagePriority,
          department: params.triageResult.predictedDepartment,
          riskScore: params.triageResult.riskScore,
          policyApproval: params.triageResult.policyApprovalStatus
        },
        latencyMs: params.triageResult.latencyMs,
        timestamp: new Date().toISOString()
      });

      return {
        caseItem: params.caseItem,
        triageResult: params.triageResult,
        queue
      };
    } finally {
      release();
    }
  }

  public async updateCaseStatus(
    caseId: string, 
    status: CaseStatus, 
    performedBy: string,
    doctorId?: string,
    notes?: string
  ): Promise<{ updatedCase: Case; queue: QueueEntry[] } | undefined> {
    const release = await this.acquireQueueLock();
    try {
      const c = this.cases.get(caseId);
      if (!c) return undefined;

      c.status = status;
      c.updatedAt = new Date().toISOString();
      if (doctorId) c.assignedDoctorId = doctorId;
      if (notes) c.clinicalNotes = (c.clinicalNotes ? c.clinicalNotes + '\n' : '') + notes;

      // If doctor is assigned and consultation started, update doctor status
      if (doctorId && (status === 'in_consultation' || status === 'called')) {
        const doc = this.doctors.get(doctorId);
        if (doc) {
          doc.status = status === 'in_consultation' ? 'in_consultation' : 'available';
          doc.currentCaseId = caseId;
        }
      } else if (doctorId && (status === 'discharged' || status === 'admitted' || status === 'transferred')) {
        const doc = this.doctors.get(doctorId);
        if (doc && doc.currentCaseId === caseId) {
          doc.status = 'available';
          doc.currentCaseId = undefined;
        }
      }

      const queue = this.recomputeQueueInternal();

      // Notification
      this.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        recipientRole: 'all',
        title: `Patient ${c.patientName} is now ${status.replace('_', ' ').toUpperCase()}`,
        message: notes || `Case ${c.caseNumber} status transitioned to ${status}.`,
        type: status === 'called' ? 'patient_called' : 'status_update',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      // Audit Log
      this.addAuditLog({
        id: `audit-${Date.now()}`,
        traceId: `tr-status-${caseId}`,
        eventType: 'CASE_STATUS_CHANGE',
        performedBy,
        targetEntity: 'Case',
        targetId: caseId,
        details: { newStatus: status, doctorId, notes },
        timestamp: new Date().toISOString()
      });

      return { updatedCase: c, queue };
    } finally {
      release();
    }
  }

  public async overrideTriagePriority(
    caseId: string,
    newLevel: TriageLevel,
    newDepartmentId: string,
    performedBy: string,
    reason: string
  ): Promise<{ updatedCase: Case; queue: QueueEntry[] } | undefined> {
    const release = await this.acquireQueueLock();
    try {
      const c = this.cases.get(caseId);
      if (!c) return undefined;

      const priorityMap: Record<TriageLevel, TriagePriority> = {
        1: 'Critical',
        2: 'Emergency',
        3: 'Urgent',
        4: 'Less Urgent',
        5: 'Non-Urgent'
      };

      c.triageLevel = newLevel;
      c.triagePriority = priorityMap[newLevel];
      c.assignedDepartmentId = newDepartmentId;
      c.overrideReason = `Doctor override by ${performedBy}: ${reason}`;
      c.updatedAt = new Date().toISOString();

      const dept = this.departments.get(newDepartmentId);
      const queue = this.recomputeQueueInternal();

      this.addNotification({
        id: `notif-${Date.now()}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        recipientRole: 'all',
        title: `Triage Override: ${c.patientName} -> Level ${newLevel} (${c.triagePriority})`,
        message: `Re-routed to ${dept?.name || newDepartmentId}. Reason: ${reason}`,
        type: 'priority_change',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      this.addAuditLog({
        id: `audit-${Date.now()}`,
        traceId: `tr-override-${caseId}`,
        eventType: 'CLINICAL_TRIAGE_OVERRIDE',
        performedBy,
        targetEntity: 'Case',
        targetId: caseId,
        details: { newLevel, newDepartmentId, reason },
        timestamp: new Date().toISOString()
      });

      return { updatedCase: c, queue };
    } finally {
      release();
    }
  }

  public getHospitalMetrics(): HospitalMetrics {
    const allCases = Array.from(this.cases.values());
    const queue = this.queue;
    const criticalCount = allCases.filter(c => c.triageLevel === 1 && (c.status === 'waiting' || c.status === 'triaged' || c.status === 'in_consultation')).length;
    const emergencyCount = allCases.filter(c => c.triageLevel === 2 && (c.status === 'waiting' || c.status === 'triaged' || c.status === 'in_consultation')).length;

    let totalWait = 0;
    let countWait = 0;
    queue.forEach(q => {
      totalWait += q.estimatedWaitMinutes;
      countWait++;
    });

    const avgWait = countWait > 0 ? Math.round(totalWait / countWait) : 15;

    let totalBeds = 0;
    let occupiedBeds = 0;
    this.departments.forEach(d => {
      totalBeds += d.totalBeds;
      occupiedBeds += d.occupiedBeds;
    });

    const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 72;

    const triageResults = Array.from(this.triageResults.values());
    let totalLatency = 0;
    let totalTokens = 0;
    triageResults.forEach(t => {
      totalLatency += t.latencyMs || 250;
      totalTokens += t.tokensUsed || 350;
    });

    const avgLatency = triageResults.length > 0 ? Math.round(totalLatency / triageResults.length) : 310;

    return {
      totalPatientsToday: allCases.length + 18,
      activeInQueue: queue.length,
      criticalCasesCount: criticalCount,
      emergencyCasesCount: emergencyCount,
      avgWaitTimeMinutes: avgWait,
      bedOccupancyRate: bedOccupancy,
      triageAccuracyPercent: 98.4,
      aiTokensProcessed: totalTokens + 14200,
      averageAiLatencyMs: avgLatency,
      connectedClients: 1
    };
  }
}

// Global Singleton Instance
export const hospitalDb = new HospitalDatabase();
