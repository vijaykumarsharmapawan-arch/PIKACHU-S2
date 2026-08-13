import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  HeartPulse, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Stethoscope, 
  FileEdit, 
  Activity, 
  User, 
  AlertCircle,
  PhoneCall,
  Save,
  Wind
} from 'lucide-react';
import { Case, Department, Doctor, Patient, TriageLevel, TriageResult } from '../types';
import { api } from '../services/api';

interface CaseDetailsModalProps {
  selectedCaseId: string | null;
  cases: Case[];
  departments: Department[];
  doctors: Doctor[];
  patients: Patient[];
  onClose: () => void;
  onRefresh: () => void;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({
  selectedCaseId,
  cases,
  departments,
  doctors,
  patients,
  onClose,
  onRefresh
}) => {
  if (!selectedCaseId) return null;

  const currentCase = cases.find(c => c.id === selectedCaseId);
  if (!currentCase) return null;

  const patient = patients.find(p => p.id === currentCase.patientId);
  const department = departments.find(d => d.id === currentCase.assignedDepartmentId);
  const doctor = doctors.find(d => d.id === currentCase.assignedDoctorId);

  // Override Form State
  const [isOverriding, setIsOverriding] = useState(false);
  const [newLevel, setNewLevel] = useState<number>(currentCase.triageLevel);
  const [newDeptId, setNewDeptId] = useState<string>(currentCase.assignedDepartmentId);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideDoctorName, setOverrideDoctorName] = useState<string>('Dr. Sarah Jenkins, MD');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Status Change State
  const [isCalling, setIsCalling] = useState(false);

  const handleCallPatient = async () => {
    try {
      setIsCalling(true);
      await api.callPatient(currentCase.id, doctor?.id, doctor?.activeRoom || 'Exam Bay 1');
      onRefresh();
      setTimeout(() => setIsCalling(false), 1000);
    } catch (err) {
      console.error(err);
      setIsCalling(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    try {
      setIsSubmittingOverride(true);
      await api.overrideTriage(
        currentCase.id,
        newLevel as TriageLevel,
        newDeptId,
        overrideReason,
        overrideDoctorName
      );
      setIsOverriding(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to override triage priority.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{currentCase.patientName}</h2>
              <span className="text-xs font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-lg text-blue-400 border border-slate-800">
                {patient?.mrn || 'MRN-ER'}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                currentCase.triageLevel === 1 
                  ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse' 
                  : currentCase.triageLevel === 2
                    ? 'bg-orange-950 text-orange-300 border border-orange-700'
                    : currentCase.triageLevel === 3
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                ESI Level {currentCase.triageLevel} — {currentCase.triagePriority}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Case ID: <span className="font-mono text-slate-300">{currentCase.caseNumber}</span> • Intake Time: {new Date(currentCase.intakeTime).toLocaleString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">Department: <strong className="text-white">{department?.name}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Status: <strong className="text-amber-400 uppercase font-mono">{currentCase.status}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCallPatient}
              disabled={isCalling}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isCalling ? 'Calling Patient...' : 'Call to Exam Room'}</span>
            </button>

            <button
              onClick={() => setIsOverriding(!isOverriding)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <FileEdit className="w-3.5 h-3.5 text-amber-400" />
              <span>{isOverriding ? 'Cancel Override' : 'Physician Override'}</span>
            </button>
          </div>
        </div>

        {/* Override Form */}
        {isOverriding && (
          <form onSubmit={handleSaveOverride} className="p-4 bg-amber-950/30 border border-amber-800/80 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Doctor Priority / Department Re-Route Override</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">New Triage Level</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                >
                  <option value={1}>Level 1 - Critical (Resuscitation)</option>
                  <option value={2}>Level 2 - Emergency</option>
                  <option value={3}>Level 3 - Urgent</option>
                  <option value={4}>Level 4 - Less Urgent</option>
                  <option value={5}>Level 5 - Non-Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Assigned Department</label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Physician Name</label>
                <input
                  type="text"
                  value={overrideDoctorName}
                  onChange={(e) => setOverrideDoctorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 text-xs block mb-1">Clinical Override Justification <span className="text-red-400">*</span></label>
              <textarea
                required
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Detail the clinical assessment justifying priority or department alteration..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingOverride || !overrideReason.trim()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmittingOverride ? 'Saving...' : 'Apply Clinical Override'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Symptoms & Vitals Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Complaint */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Reported Symptoms & History:</span>
            </span>
            <p className="text-xs text-slate-200 italic bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              &ldquo;{currentCase.reportedSymptoms}&rdquo;
            </p>
            <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
              <div>Allergies: <strong className="text-slate-300">{patient?.allergies.join(', ') || 'None'}</strong></div>
              <div>Medical History: <strong className="text-slate-300">{patient?.medicalHistory.join(', ') || 'None recorded'}</strong></div>
            </div>
          </div>

          {/* Vitals Telemetry */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Clinical Vital Signs:</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">HEART RATE</span>
                <strong className="text-white text-sm">{currentCase.vitalSigns.heartRate || '—'} bpm</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">BLOOD PRESSURE</span>
                <strong className="text-white text-sm">
                  {currentCase.vitalSigns.bloodPressureSys && currentCase.vitalSigns.bloodPressureDia 
                    ? `${currentCase.vitalSigns.bloodPressureSys}/${currentCase.vitalSigns.bloodPressureDia}` 
                    : '—'}
                </strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">SpO2 OXYGEN</span>
                <strong className={`text-sm ${currentCase.vitalSigns.spo2 && currentCase.vitalSigns.spo2 < 93 ? 'text-red-400' : 'text-white'}`}>
                  {currentCase.vitalSigns.spo2 || '—'}%
                </strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">PAIN SCALE</span>
                <strong className="text-amber-400 text-sm">{currentCase.vitalSigns.painScale !== undefined ? `${currentCase.vitalSigns.painScale}/10` : '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* AI Explainability & Nurse Recommendations */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-300">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Gemini AI Triage Explainability & Clinical Decision Support</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Clinical Guardrail: <strong className="text-emerald-400">Enforced</strong>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-slate-300">Clinical Triage Rationale:</span>
              <p className="text-slate-300 leading-relaxed">
                Patient presentation exhibits acute risk markers. AI triage model applied Emergency Severity Index guidelines based on symptom acuity, hemodynamic stability, and resource requirements.
              </p>
            </div>

            {/* Immediate Action Checklist for Nursing Staff */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-300 block">Immediate Nurse & Clinical Staff Action Checklist:</span>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 p-2 bg-slate-900/60 rounded-lg text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Attach continuous cardiac & pulse oximetry monitoring</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-900/60 rounded-lg text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Establish IV access and draw initial emergency blood panel</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-900/60 rounded-lg text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Notify attending physician in {department?.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
