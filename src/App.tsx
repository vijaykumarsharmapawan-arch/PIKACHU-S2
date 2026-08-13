import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientPortal } from './components/PatientPortal';
import { HospitalAdmin } from './components/HospitalAdmin';
import { AIEvaluationBenchmark } from './components/AIEvaluationBenchmark';
import { CaseDetailsModal } from './components/CaseDetailsModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { 
  Case, 
  QueueEntry, 
  Department, 
  Doctor, 
  Patient, 
  NotificationItem, 
  ClinicalPolicyRule, 
  HospitalMetrics,
  WebSocketMessage
} from './types';
import { api, HospitalState } from './services/api';
import { clinicalAudio } from './services/audio';

export const App: React.FC = () => {
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'doctor' | 'patient' | 'admin' | 'benchmark'>('doctor');

  // Application Data State
  const [cases, setCases] = useState<Case[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [clinicalRules, setClinicalRules] = useState<ClinicalPolicyRule[]>([]);
  const [metrics, setMetrics] = useState<HospitalMetrics>({
    totalPatientsToday: 24,
    activeInQueue: 4,
    avgWaitTimeMinutes: 18,
    criticalCasesCount: 1,
    bedOccupancyRate: 74,
    triageAccuracyPercent: 96.4,
    connectedClients: 1
  });

  // UI Control State
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string>('pat-101');
  const [toastAlert, setToastAlert] = useState<{ title: string; message: string; type: 'critical' | 'call' | 'info' } | null>(null);

  // Fetch Initial State
  const refreshHospitalState = async () => {
    try {
      const state = await api.fetchState();
      setCases(state.cases);
      setQueue(state.queue);
      setDepartments(state.departments);
      setDoctors(state.doctors);
      setPatients(state.patients);
      setNotifications(state.notifications);
      setClinicalRules(state.clinicalRules);
      setMetrics(state.metrics);
      if (state.patients.length > 0 && !activePatientId) {
        setActivePatientId(state.patients[0].id);
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshHospitalState();

    // Connect WebSocket
    api.connectWebSocket();

    // Subscribe to WS connection status
    const unsubStatus = api.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    // Subscribe to Real-Time WS Messages
    const unsubMsg = api.subscribe((msg: WebSocketMessage) => {
      switch (msg.type) {
        case 'INIT_STATE': {
          const payload = msg.payload as HospitalState;
          if (payload.cases) setCases(payload.cases);
          if (payload.queue) setQueue(payload.queue);
          if (payload.departments) setDepartments(payload.departments);
          if (payload.doctors) setDoctors(payload.doctors);
          if (payload.notifications) setNotifications(payload.notifications);
          if (payload.metrics) setMetrics(payload.metrics);
          break;
        }

        case 'CASE_CREATED': {
          const { caseItem, queueEntry } = msg.payload;
          setCases((prev) => [caseItem, ...prev.filter(c => c.id !== caseItem.id)]);
          setQueue((prev) => {
            const next = [queueEntry, ...prev.filter(q => q.id !== queueEntry.id)];
            return next.sort((a, b) => a.triageLevel - b.triageLevel);
          });

          if (caseItem.triageLevel <= 2) {
            setToastAlert({
              title: `🚨 STAT INTAKE: ${caseItem.patientName}`,
              message: `Level ${caseItem.triageLevel} (${caseItem.triagePriority}) assigned to ${queueEntry.departmentName}. Immediate physician required.`,
              type: 'critical'
            });
            setTimeout(() => setToastAlert(null), 7000);
          }
          break;
        }

        case 'QUEUE_UPDATED': {
          const { queue: updatedQueue } = msg.payload;
          setQueue(updatedQueue);
          break;
        }

        case 'TRIAGE_UPDATED': {
          const { caseId, triageLevel, triagePriority, departmentId } = msg.payload;
          setCases((prev) => prev.map(c => c.id === caseId ? { ...c, triageLevel, triagePriority, assignedDepartmentId: departmentId } : c));
          break;
        }

        case 'PATIENT_CALLED': {
          const { patientName, room, doctorName, departmentName } = msg.payload;
          setToastAlert({
            title: `🔔 PATIENT CALLED: ${patientName}`,
            message: `Please proceed to ${room} (${departmentName}) for consultation with ${doctorName}.`,
            type: 'call'
          });
          setTimeout(() => setToastAlert(null), 8000);
          break;
        }

        case 'STATUS_UPDATED': {
          const { caseId, status } = msg.payload;
          setCases((prev) => prev.map(c => c.id === caseId ? { ...c, status } : c));
          break;
        }

        case 'NOTIFICATION_PUSH': {
          const notification = msg.payload as NotificationItem;
          setNotifications((prev) => [notification, ...prev]);
          break;
        }

        case 'METRICS_UPDATED': {
          setMetrics(msg.payload);
          break;
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500 selection:text-white flex flex-col">
      {/* Toast Alert Banner */}
      {toastAlert && (
        <div className={`fixed top-20 right-4 z-50 max-w-md p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-bounce ${
          toastAlert.type === 'critical'
            ? 'bg-red-950/95 border-red-600 text-red-100 shadow-red-950'
            : toastAlert.type === 'call'
              ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950'
              : 'bg-blue-950/95 border-blue-600 text-blue-100 shadow-blue-950'
        }`}>
          <div className="flex items-start justify-between">
            <strong className="text-sm font-bold block">{toastAlert.title}</strong>
            <button onClick={() => setToastAlert(null)} className="text-xs text-slate-400 hover:text-white ml-2">✕</button>
          </div>
          <p className="text-xs mt-1 leading-relaxed">{toastAlert.message}</p>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        notifications={notifications}
        connectionStatus={connectionStatus}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
      />

      {/* Main Content Views */}
      <main className="flex-1 pb-16">
        {activeTab === 'doctor' && (
          <DoctorDashboard
            queue={queue}
            departments={departments}
            doctors={doctors}
            cases={cases}
            onSelectCase={(id) => setSelectedCaseId(id)}
            onOpenOverride={(id) => setSelectedCaseId(id)}
          />
        )}

        {activeTab === 'patient' && (
          <PatientPortal
            patients={patients}
            queue={queue}
            cases={cases}
            activePatientId={activePatientId}
            setActivePatientId={setActivePatientId}
            onSelectCase={(id) => setSelectedCaseId(id)}
          />
        )}

        {activeTab === 'admin' && (
          <HospitalAdmin
            departments={departments}
            doctors={doctors}
            clinicalRules={clinicalRules}
            metrics={metrics}
            onRefreshState={refreshHospitalState}
          />
        )}

        {activeTab === 'benchmark' && (
          <AIEvaluationBenchmark />
        )}
      </main>

      {/* Case Details / AI Explainability & Override Modal */}
      <CaseDetailsModal
        selectedCaseId={selectedCaseId}
        cases={cases}
        departments={departments}
        doctors={doctors}
        patients={patients}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={refreshHospitalState}
      />

      {/* Slide-Over Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onRefresh={refreshHospitalState}
      />
    </div>
  );
};

export default App;
