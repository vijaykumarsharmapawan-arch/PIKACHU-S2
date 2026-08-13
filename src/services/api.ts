import { 
  Case, 
  QueueEntry, 
  Department, 
  Doctor, 
  Patient, 
  NotificationItem, 
  ClinicalPolicyRule, 
  HospitalMetrics,
  TriageLevel, 
  TriagePriority, 
  CaseStatus, 
  WebSocketMessage,
  VitalSigns
} from '../types';
import { clinicalAudio } from './audio';

export interface HospitalState {
  cases: Case[];
  queue: QueueEntry[];
  departments: Department[];
  doctors: Doctor[];
  patients: Patient[];
  notifications: NotificationItem[];
  clinicalRules: ClinicalPolicyRule[];
  metrics: HospitalMetrics;
}

export class HospitalApiClient {
  private ws: WebSocket | null = null;
  private listeners: Set<(msg: WebSocketMessage) => void> = new Set();
  private connectionStatusListeners: Set<(status: 'connected' | 'disconnected' | 'connecting') => void> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  public connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  // --- REST API Methods ---

  public async fetchState(): Promise<HospitalState> {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('Failed to fetch hospital state');
    return res.json();
  }

  public async submitIntake(payload: {
    patientId?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    gender?: string;
    bloodType?: string;
    allergies?: string[];
    medicalHistory?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    symptoms: string;
    symptomLanguage?: string;
    vitalSigns?: VitalSigns;
  }) {
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Submission failed' }));
      throw new Error(err.error || 'Failed to process intake');
    }
    return res.json();
  }

  public async callPatient(caseId: string, doctorId?: string, room?: string) {
    const res = await fetch('/api/case/call-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, doctorId, room })
    });
    if (!res.ok) throw new Error('Failed to call patient');
    return res.json();
  }

  public async updateCaseStatus(caseId: string, status: CaseStatus, doctorId?: string, notes?: string) {
    const res = await fetch('/api/case/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, status, doctorId, notes })
    });
    if (!res.ok) throw new Error('Failed to update case status');
    return res.json();
  }

  public async overrideTriage(caseId: string, newLevel: TriageLevel, newDepartmentId: string, reason: string, performedBy?: string) {
    const res = await fetch('/api/case/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, newLevel, newDepartmentId, reason, performedBy })
    });
    if (!res.ok) throw new Error('Failed to override triage');
    return res.json();
  }

  public async createPatient(payload: Partial<Patient>) {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create patient');
    return res.json();
  }

  public async toggleClinicalRule(ruleId: string, enabled: boolean) {
    const res = await fetch(`/api/clinical-rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to update rule');
    return res.json();
  }

  public async markNotificationRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    return res.json();
  }

  public async fetchAuditLogs() {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }

  public async runClinicalEvaluation() {
    const res = await fetch('/api/evaluation/run-suite', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to execute clinical evaluation');
    return res.json();
  }

  public async runConcurrencyBenchmark(batchSize = 20) {
    const res = await fetch('/api/benchmark/concurrency-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize })
    });
    if (!res.ok) throw new Error('Failed to run benchmark');
    return res.json();
  }

  // --- WebSocket Connection & Real-Time Sync ---

  public connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setConnectionStatus('connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Trigger audio cues based on real-time event type
          if (message.type === 'PATIENT_CALLED') {
            clinicalAudio.playPatientCallChime();
          } else if (message.type === 'CASE_CREATED' && message.payload.caseItem.triageLevel <= 2) {
            clinicalAudio.playCriticalAlertChime();
          } else if (message.type === 'NOTIFICATION_PUSH' || message.type === 'STATUS_UPDATED') {
            clinicalAudio.playNotificationBlip();
          }

          this.listeners.forEach((listener) => listener(message));
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.setConnectionStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setConnectionStatus('disconnected');
      };
    } catch {
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connectWebSocket();
      }, 3000);
    }
  }

  private setConnectionStatus(status: 'connected' | 'disconnected' | 'connecting') {
    this.connectionStatus = status;
    this.connectionStatusListeners.forEach(listener => listener(status));
  }

  public subscribe(listener: (msg: WebSocketMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeStatus(listener: (status: 'connected' | 'disconnected' | 'connecting') => void): () => void {
    this.connectionStatusListeners.add(listener);
    listener(this.connectionStatus);
    return () => this.connectionStatusListeners.delete(listener);
  }
}

export const api = new HospitalApiClient();
