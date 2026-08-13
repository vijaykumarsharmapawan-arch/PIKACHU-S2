import React, { useState } from 'react';
import { 
  HeartPulse, 
  Brain, 
  Wind, 
  Bone, 
  Stethoscope, 
  Flame, 
  Baby, 
  Activity, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Search, 
  ArrowUpDown, 
  ChevronRight,
  Sparkles,
  BedDouble,
  FileEdit,
  UserCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QueueEntry, Department, Doctor, Case, TriageLevel } from '../types';
import { api } from '../services/api';

interface DoctorDashboardProps {
  queue: QueueEntry[];
  departments: Department[];
  doctors: Doctor[];
  cases: Case[];
  onSelectCase: (caseId: string) => void;
  onOpenOverride: (caseId: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  queue,
  departments,
  doctors,
  cases,
  onSelectCase,
  onOpenOverride
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [callingCaseId, setCallingCaseId] = useState<string | null>(null);

  // Department icon mapper
  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'HeartPulse': return <HeartPulse className="w-4 h-4 text-red-500" />;
      case 'Brain': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'Wind': return <Wind className="w-4 h-4 text-cyan-500" />;
      case 'Bone': return <Bone className="w-4 h-4 text-blue-500" />;
      case 'Flame': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'Baby': return <Baby className="w-4 h-4 text-pink-500" />;
      case 'Activity': return <Activity className="w-4 h-4 text-rose-500" />;
      default: return <Stethoscope className="w-4 h-4 text-emerald-500" />;
    }
  };

  // Priority styling badge
  const getPriorityBadge = (level: TriageLevel, priority: string) => {
    switch (level) {
      case 1:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-700/80 animate-pulse shadow-sm shadow-red-950">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>Level 1 — Critical</span>
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-300 border border-orange-700/60">
            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
            <span>Level 2 — Emergency</span>
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-700/50">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span>Level 3 — Urgent</span>
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/50">
            <span className="h-2 w-2 rounded-full bg-blue-400"></span>
            <span>Level 4 — Less Urgent</span>
          </span>
        );
      case 5:
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Level 5 — Non-Urgent</span>
          </span>
        );
    }
  };

  // Filter queue
  const filteredQueue = queue.filter(item => {
    const matchesDept = selectedDeptId === 'all' || item.departmentId === selectedDeptId;
    const matchesSearch = searchQuery === '' || 
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reportedSymptoms.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? item.status === 'waiting' || item.status === 'triaged' || item.status === 'called' || item.status === 'in_consultation'
        : item.status === statusFilter;

    return matchesDept && matchesSearch && matchesStatus;
  });

  const handleCallPatient = async (entry: QueueEntry) => {
    try {
      setCallingCaseId(entry.caseId);
      const doc = doctors.find(d => d.departmentId === entry.departmentId) || doctors[0];
      await api.callPatient(entry.caseId, doc?.id, doc?.activeRoom || 'Exam Bay 1');
      setTimeout(() => setCallingCaseId(null), 1200);
    } catch (err) {
      console.error(err);
      setCallingCaseId(null);
    }
  };

  const handleStatusChange = async (caseId: string, status: QueueEntry['status']) => {
    try {
      await api.updateCaseStatus(caseId, status, undefined, `Status updated to ${status} from Doctor Dashboard.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Quick Department Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Hospital Emergency Triage & Queue</h1>
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30 flex items-center space-x-1 font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
              <span>LIVE WS SYNC</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time dynamic priority queue autonomously ordered by Gemini AI Emergency Severity Index (ESI Level 1-5).
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2">
            <span className="text-slate-400 block text-[11px]">Total in Queue</span>
            <span className="text-lg font-bold text-white font-mono">{queue.length} Patients</span>
          </div>
          <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-3.5 py-2">
            <span className="text-red-400 block text-[11px]">Critical (Level 1)</span>
            <span className="text-lg font-bold text-red-300 font-mono">
              {queue.filter(q => q.triageLevel === 1).length} STAT
            </span>
          </div>
        </div>
      </div>

      {/* Department Filter Strip */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center space-x-2 min-w-max">
          <button
            id="dept-filter-all"
            onClick={() => setSelectedDeptId('all')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedDeptId === 'all'
                ? 'bg-slate-100 text-slate-900 border-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>All ER Departments</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {queue.length}
            </span>
          </button>

          {departments.map((dept) => {
            const count = queue.filter(q => q.departmentId === dept.id).length;
            const isSelected = selectedDeptId === dept.id;

            return (
              <button
                key={dept.id}
                id={`dept-filter-${dept.code.toLowerCase()}`}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {getDeptIcon(dept.iconName)}
                <span>{dept.name}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Status Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search MRN, patient name, symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status:</span>
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="active">Active Patients (Waiting / In Consultation)</option>
            <option value="waiting">Waiting Only</option>
            <option value="in_consultation">In Consultation</option>
            <option value="admitted">Admitted</option>
            <option value="all">All Cases History</option>
          </select>
        </div>
      </div>

      {/* Dynamic Queue Table & Cards */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span>DYNAMIC AI-TRIAGED QUEUE ORDER</span>
            <span className="text-slate-500">({filteredQueue.length} cases displayed)</span>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Auto-reordered upon arrival: <strong className="text-red-400">Level 1</strong> → <strong className="text-orange-400">Level 2</strong> → <strong className="text-amber-400">Level 3</strong> → <strong className="text-blue-400">Level 4</strong>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">No patients currently matching filter.</p>
            <p className="text-xs text-slate-500 mt-1">Submit a new case from Patient Intake to see live dynamic routing.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            <AnimatePresence initial={false}>
              {filteredQueue.map((entry) => {
                const fullCase = cases.find(c => c.id === entry.caseId);
                const isCritical = entry.triageLevel === 1;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className={`p-4.5 hover:bg-slate-850/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isCritical ? 'bg-red-950/20 border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    {/* Left: Position Rank & Patient Info */}
                    <div className="flex items-start space-x-4">
                      {/* Rank Position */}
                      <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl font-mono font-bold shrink-0 border ${
                        entry.triageLevel === 1
                          ? 'bg-red-950 text-red-300 border-red-600 shadow-md shadow-red-950'
                          : entry.triageLevel === 2
                            ? 'bg-orange-950/60 text-orange-300 border-orange-700/60'
                            : entry.triageLevel === 3
                              ? 'bg-amber-950/50 text-amber-300 border-amber-700/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        <span className="text-[10px] text-slate-400 font-normal leading-none">RANK</span>
                        <span className="text-lg">#{entry.dynamicPosition}</span>
                      </div>

                      {/* Patient Details & Symptoms */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white text-base hover:text-blue-400 cursor-pointer" onClick={() => onSelectCase(entry.caseId)}>
                            {entry.patientName}
                          </h3>
                          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {entry.mrn}
                          </span>
                          {getPriorityBadge(entry.triageLevel, entry.triagePriority)}
                          
                          <span className="text-xs font-medium text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            <span>{entry.departmentName}</span>
                          </span>

                          {entry.status === 'called' && (
                            <span className="text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700 animate-pulse">
                              CALLED TO ROOM
                            </span>
                          )}

                          {entry.status === 'in_consultation' && (
                            <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                              IN CONSULTATION
                            </span>
                          )}
                        </div>

                        {/* Natural language symptom summary */}
                        <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                          &ldquo;{entry.reportedSymptoms}&rdquo;
                        </p>

                        {/* Vitals & Wait Time telemetry */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                          {entry.vitalSigns.heartRate && (
                            <span className="flex items-center space-x-1 text-slate-300">
                              <HeartPulse className="w-3.5 h-3.5 text-red-400" />
                              <span>HR: <strong>{entry.vitalSigns.heartRate} bpm</strong></span>
                            </span>
                          )}
                          {entry.vitalSigns.bloodPressureSys && entry.vitalSigns.bloodPressureDia && (
                            <span className="flex items-center space-x-1 text-slate-300">
                              <Activity className="w-3.5 h-3.5 text-blue-400" />
                              <span>BP: <strong>{entry.vitalSigns.bloodPressureSys}/{entry.vitalSigns.bloodPressureDia}</strong></span>
                            </span>
                          )}
                          {entry.vitalSigns.spo2 && (
                            <span className={`flex items-center space-x-1 ${entry.vitalSigns.spo2 < 93 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                              <Wind className="w-3.5 h-3.5 text-cyan-400" />
                              <span>SpO2: <strong>{entry.vitalSigns.spo2}%</strong></span>
                            </span>
                          )}
                          {entry.vitalSigns.painScale !== undefined && (
                            <span className="flex items-center space-x-1 text-slate-300">
                              <span>Pain: <strong className={entry.vitalSigns.painScale >= 7 ? 'text-red-400' : 'text-amber-300'}>{entry.vitalSigns.painScale}/10</strong></span>
                            </span>
                          )}
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Est Wait: <strong className="text-white">{entry.estimatedWaitMinutes} min</strong></span>
                          </span>
                          <span className="text-slate-500">
                            Risk: <strong className={entry.riskScore > 75 ? 'text-red-400' : 'text-amber-400'}>{entry.riskScore}/100</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Call, Consult, Inspect AI, Override) */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      {/* Call Patient button */}
                      <button
                        id={`btn-call-${entry.caseId}`}
                        onClick={() => handleCallPatient(entry)}
                        disabled={callingCaseId === entry.caseId}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                          callingCaseId === entry.caseId
                            ? 'bg-amber-500 text-slate-950 font-bold animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{callingCaseId === entry.caseId ? 'Calling...' : 'Call Patient'}</span>
                      </button>

                      {/* Start Consultation button */}
                      {entry.status !== 'in_consultation' ? (
                        <button
                          id={`btn-consult-${entry.caseId}`}
                          onClick={() => handleStatusChange(entry.caseId, 'in_consultation')}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Start Consult</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-discharge-${entry.caseId}`}
                          onClick={() => handleStatusChange(entry.caseId, 'discharged')}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Complete / Discharge</span>
                        </button>
                      )}

                      {/* Inspect AI Explainability */}
                      <button
                        id={`btn-inspect-${entry.caseId}`}
                        onClick={() => onSelectCase(entry.caseId)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all"
                        title="View AI Explainability & Nurse Recommendations"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>AI Triage Details</span>
                      </button>

                      {/* Override Priority */}
                      <button
                        id={`btn-override-${entry.caseId}`}
                        onClick={() => onOpenOverride(entry.caseId)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700/80 transition-all"
                        title="Doctor Priority Override / Re-route"
                      >
                        <FileEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Active Department Capacity Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.slice(0, 4).map((dept) => {
          const occupancy = Math.round((dept.occupiedBeds / dept.totalBeds) * 100);
          const deptQueueCount = queue.filter(q => q.departmentId === dept.id).length;

          return (
            <div key={dept.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getDeptIcon(dept.iconName)}
                  <h4 className="font-semibold text-sm text-white">{dept.name}</h4>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {dept.code}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Bed Utilization:</span>
                  <strong className="text-white font-mono">{dept.occupiedBeds} / {dept.totalBeds} ({occupancy}%)</strong>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${occupancy > 85 ? 'bg-red-500' : occupancy > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, occupancy)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Waiting: <strong className="text-white font-mono">{deptQueueCount}</strong></span>
                <span className="text-slate-400">Avg Wait: <strong className="text-amber-400 font-mono">{dept.currentWaitTimeMinutes}m</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
