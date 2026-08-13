import React, { useState } from 'react';
import { 
  User, 
  Send, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  HeartPulse, 
  ShieldAlert, 
  CheckCircle2, 
  Phone, 
  Languages, 
  Activity, 
  Zap, 
  Stethoscope, 
  ChevronRight,
  Flame,
  Wind,
  PhoneCall,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, QueueEntry, Case, VitalSigns } from '../types';
import { api } from '../services/api';

interface PatientPortalProps {
  patients: Patient[];
  queue: QueueEntry[];
  cases: Case[];
  activePatientId: string;
  setActivePatientId: (id: string) => void;
  onSelectCase: (caseId: string) => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  patients,
  queue,
  cases,
  activePatientId,
  setActivePatientId,
  onSelectCase
}) => {
  const currentPatient = patients.find(p => p.id === activePatientId) || patients[0];

  // Intake Form State
  const [symptoms, setSymptoms] = useState('');
  const [language, setLanguage] = useState('en');
  const [heartRate, setHeartRate] = useState<string>('');
  const [bpSys, setBpSys] = useState<string>('');
  const [bpDia, setBpDia] = useState<string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [temp, setTemp] = useState<string>('');
  const [painScale, setPainScale] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // New Patient Form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDob, setNewDob] = useState('1992-08-14');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other'>('male');
  const [newBloodType, setNewBloodType] = useState('O+');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newAllergies, setNewAllergies] = useState('');
  const [newHistory, setNewHistory] = useState('');

  // Find active case/queue entry for this patient
  const activeQueueEntry = queue.find(q => q.patientId === currentPatient?.id);
  const activeCase = cases.find(c => c.patientId === currentPatient?.id && c.status !== 'discharged');

  // Emergency Presets
  const presets = [
    {
      title: '🚨 Severe Chest Pain',
      text: 'I have severe crushing chest pain radiating to my left arm, cold sweat, and difficulty breathing for the past 25 minutes.',
      hr: '115',
      bpSys: '165',
      bpDia: '98',
      spo2: '91',
      temp: '37.1',
      pain: 9
    },
    {
      title: '⚡ Sudden Stroke Signs',
      text: 'Sudden weakness on my right side, drooping face, and difficulty speaking clearly that started 30 minutes ago.',
      hr: '84',
      bpSys: '155',
      bpDia: '92',
      spo2: '98',
      temp: '36.8',
      pain: 3
    },
    {
      title: '🫁 Severe Asthma Attack',
      text: 'Severe asthma flare, wheezing heavily, unable to complete full sentences, rescue inhaler is not providing relief.',
      hr: '124',
      bpSys: '135',
      bpDia: '85',
      spo2: '89',
      temp: '37.0',
      pain: 6
    },
    {
      title: '🦴 Broken Ankle / Fall',
      text: 'Fell down the stairs, heard a loud snap in my right ankle. Severe swelling, deformity, and cannot bear any weight.',
      hr: '90',
      bpSys: '128',
      bpDia: '78',
      spo2: '99',
      temp: '36.9',
      pain: 8
    },
    {
      title: '🤒 Sore Throat & Cold',
      text: 'Mild sore throat, clear runny nose, low grade fever, and slight fatigue for 2 days. No breathing problems.',
      hr: '72',
      bpSys: '118',
      bpDia: '74',
      spo2: '100',
      temp: '37.8',
      pain: 2
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSymptoms(preset.text);
    setHeartRate(preset.hr);
    setBpSys(preset.bpSys);
    setBpDia(preset.bpDia);
    setSpo2(preset.spo2);
    setTemp(preset.temp);
    setPainScale(preset.pain);
  };

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsSubmitting(true);
    setSubmitSuccess(null);

    try {
      const vitals: VitalSigns = {
        heartRate: heartRate ? Number(heartRate) : undefined,
        bloodPressureSys: bpSys ? Number(bpSys) : undefined,
        bloodPressureDia: bpDia ? Number(bpDia) : undefined,
        spo2: spo2 ? Number(spo2) : undefined,
        temperature: temp ? Number(temp) : undefined,
        painScale: painScale
      };

      const result = await api.submitIntake({
        patientId: currentPatient.id,
        symptoms,
        symptomLanguage: language,
        vitalSigns: vitals
      });

      setSubmitSuccess(`Triage Completed: Level ${result.triage.predictedLevel} (${result.triage.predictedPriority}) in ${result.triage.predictedDepartment}. Added to Dynamic Queue!`);
      setSymptoms('');
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Failed to submit intake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createPatient({
        firstName: newFirstName,
        lastName: newLastName,
        dob: newDob,
        gender: newGender,
        bloodType: newBloodType,
        emergencyContactName: newEmergencyName,
        emergencyContactPhone: newEmergencyPhone,
        emergencyContactRelation: 'Family',
        allergies: newAllergies ? newAllergies.split(',').map(s => s.trim()) : [],
        medicalHistory: newHistory ? newHistory.split(',').map(s => s.trim()) : []
      });

      setActivePatientId(created.id);
      setShowNewPatientModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Patient Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold font-mono">
            {currentPatient?.firstName[0]}{currentPatient?.lastName[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Viewing Patient Profile:</span>
              <strong className="text-white text-sm">{currentPatient?.firstName} {currentPatient?.lastName}</strong>
              <span className="text-xs font-mono bg-slate-950 px-2 py-0.5 rounded text-blue-400 border border-slate-800">
                {currentPatient?.mrn}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              DOB: {currentPatient?.dob} • Blood Type: <strong className="text-slate-200">{currentPatient?.bloodType}</strong> • Allergies: {currentPatient?.allergies.join(', ') || 'None'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={activePatientId}
            onChange={(e) => setActivePatientId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewPatientModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Emergency Intake Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Emergency Intake & Symptom Portal</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Describe your symptoms in natural language. Our clinical AI model will classify triage priority (Level 1-5) and route directly to the designated specialist department.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Quick Scenario Presets (Click to Auto-fill):</span>
                <span className="text-[11px] text-blue-400 font-normal">Real clinical emergency benchmarks</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition-all flex items-center space-x-1"
                  >
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intake Form */}
            <form onSubmit={handleSubmitIntake} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    What symptoms are you experiencing right now? <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                    <Languages className="w-3.5 h-3.5 text-blue-400" />
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="zh">中文 (Mandarin)</option>
                    </select>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. 'I have severe crushing chest pain that radiates to my jaw and left arm, sweating, and feeling lightheaded for 20 minutes...'"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Vital Signs (Optional / Triage Nurse Entry) */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    <span>Recorded Vitals (Auto-correlated by AI Triage):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 110"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">BP Sys / Dia</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        placeholder="160"
                        value={bpSys}
                        onChange={(e) => setBpSys(e.target.value)}
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-500">/</span>
                      <input
                        type="number"
                        placeholder="95"
                        value={bpDia}
                        onChange={(e) => setBpDia(e.target.value)}
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">SpO2 Oxygen (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 92"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="37.2"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Pain Scale Slider */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Pain Scale (0 - 10):</span>
                    <strong className={painScale >= 8 ? 'text-red-400' : painScale >= 5 ? 'text-amber-400' : 'text-emerald-400'}>
                      {painScale} / 10 ({painScale === 0 ? 'No Pain' : painScale <= 3 ? 'Mild' : painScale <= 6 ? 'Moderate' : painScale <= 8 ? 'Severe' : 'Worst Possible'})
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={painScale}
                    onChange={(e) => setPainScale(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-intake"
                type="submit"
                disabled={isSubmitting || !symptoms.trim()}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg ${
                  isSubmitting || !symptoms.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isSubmitting ? 'Evaluating Clinical Triage via Gemini AI...' : 'Submit Symptoms for Real-Time Triage'}</span>
              </button>
            </form>

            {submitSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Queue Status & Emergency Guidance Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Live Status Tracker */}
          {activeQueueEntry ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Live Queue Tracker</h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
                  ACTIVE CASE
                </span>
              </div>

              {/* Position Highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Your Queue Position</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-3xl font-extrabold text-white font-mono">#{activeQueueEntry.dynamicPosition}</span>
                    <span className="text-xs text-slate-400">in ER Queue</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Department: <strong className="text-blue-400">{activeQueueEntry.departmentName}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Estimated Wait</span>
                  <div className="flex items-center justify-end space-x-1 mt-1 text-2xl font-bold text-amber-300 font-mono">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>{activeQueueEntry.estimatedWaitMinutes}m</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Auto-calculated</span>
                </div>
              </div>

              {/* Patient Called Notice */}
              {activeQueueEntry.status === 'called' && (
                <div className="p-4 rounded-xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 animate-bounce space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <PhoneCall className="w-4 h-4 text-amber-300" />
                    <span>PLEASE PROCEED TO EXAMINATION ROOM</span>
                  </div>
                  <p className="text-xs text-amber-300">
                    The attending doctor has called you. Please proceed immediately to the department entrance.
                  </p>
                </div>
              )}

              {/* Real-Time Stepper */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-slate-300 block">Care Progression:</span>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</div>
                    <div>
                      <strong className="text-white">Emergency Intake & AI Triage</strong>
                      <p className="text-[11px] text-slate-400">Classified as Level {activeQueueEntry.triageLevel} ({activeQueueEntry.triagePriority})</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</div>
                    <div>
                      <strong className="text-white">Dynamic Department Routing</strong>
                      <p className="text-[11px] text-slate-400">Assigned to {activeQueueEntry.departmentName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeQueueEntry.status === 'called' || activeQueueEntry.status === 'in_consultation'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-slate-950 animate-pulse'
                    }`}>
                      {activeQueueEntry.status === 'called' || activeQueueEntry.status === 'in_consultation' ? '✓' : '3'}
                    </div>
                    <div>
                      <strong className="text-white">Physician Consultation</strong>
                      <p className="text-[11px] text-slate-400">
                        {activeQueueEntry.status === 'in_consultation' 
                          ? 'Consultation actively in progress' 
                          : activeQueueEntry.status === 'called' 
                            ? 'Physician ready — called to room' 
                            : 'Waiting in dynamic priority queue'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View full triage breakdown button */}
              <button
                onClick={() => onSelectCase(activeQueueEntry.caseId)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-1"
              >
                <span>View Full AI Triage Analysis & Nurse Checklist</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl text-center space-y-3">
              <Stethoscope className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="font-bold text-white text-sm">No Active Emergency Case</h3>
              <p className="text-xs text-slate-400">
                Submit symptoms on the left to begin real-time hospital triage and receive your live queue status.
              </p>
            </div>
          )}

          {/* Emergency SOS & First Aid Guidance */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <Phone className="w-4 h-4" />
              <h3 className="font-bold text-sm text-white">Emergency Assistance & First-Aid</h3>
            </div>

            <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/60 space-y-2 text-xs text-slate-300">
              <span className="font-bold text-red-300 block">Critical Pre-Arrival Advice:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>If you feel faint, lie down and keep your feet slightly elevated.</li>
                <li>Do not consume heavy food or fluids until evaluated by clinical staff.</li>
                <li>Keep your emergency contact notified of your hospital check-in.</li>
              </ul>
            </div>

            {/* Emergency Contact Card */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-semibold">Registered Emergency Contact:</span>
              <div className="flex justify-between items-center text-white">
                <strong>{currentPatient?.emergencyContactName} ({currentPatient?.emergencyContactRelation})</strong>
                <a 
                  href={`tel:${currentPatient?.emergencyContactPhone}`}
                  className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-xs font-mono font-bold"
                >
                  {currentPatient?.emergencyContactPhone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Register New Emergency Patient</h3>
              <button 
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">First Name</label>
                  <input
                    required
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Last Name</label>
                  <input
                    required
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">DOB</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Gender</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Blood Type</label>
                  <select
                    value={newBloodType}
                    onChange={(e) => setNewBloodType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, Peanuts"
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Known Medical History (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma, Stent"
                  value={newHistory}
                  onChange={(e) => setNewHistory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={newEmergencyName}
                    onChange={(e) => setNewEmergencyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500"
                >
                  Save & Select Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
