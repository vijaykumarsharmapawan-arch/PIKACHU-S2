import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  BedDouble, 
  UserCheck, 
  Shield, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  TrendingUp, 
  ToggleLeft, 
  ToggleRight,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { Department, Doctor, ClinicalPolicyRule, AuditLog, HospitalMetrics } from '../types';
import { api } from '../services/api';

interface HospitalAdminProps {
  departments: Department[];
  doctors: Doctor[];
  clinicalRules: ClinicalPolicyRule[];
  metrics: HospitalMetrics;
  onRefreshState: () => void;
}

export const HospitalAdmin: React.FC<HospitalAdminProps> = ({
  departments,
  doctors,
  clinicalRules,
  metrics,
  onRefreshState
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'capacity' | 'rules' | 'audit' | 'doctors'>('capacity');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchAudit, setSearchAudit] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const logs = await api.fetchAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeSubTab]);

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await api.toggleClinicalRule(ruleId, !currentStatus);
      onRefreshState();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = auditLogs.filter(l => 
    searchAudit === '' || 
    l.eventType.toLowerCase().includes(searchAudit.toLowerCase()) ||
    l.targetEntity.toLowerCase().includes(searchAudit.toLowerCase()) ||
    l.performedBy.toLowerCase().includes(searchAudit.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Hospital Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hospital Administration & Capacity</h1>
          <p className="text-xs text-slate-400 mt-1">
            Emergency department operations, bed allocation, active physician rosters, and clinical safety policies.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('capacity')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'capacity' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Capacity & Beds
          </button>
          <button
            onClick={() => setActiveSubTab('doctors')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'doctors' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Physicians ({doctors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'rules' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Clinical Guardrails ({clinicalRules.length})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'audit' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit & Trace Logs
          </button>
        </div>
      </div>

      {/* Analytics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Total Intake Today</span>
          </span>
          <span className="text-2xl font-bold text-white font-mono">{metrics.totalPatientsToday}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <BedDouble className="w-3.5 h-3.5 text-purple-400" />
            <span>Overall Bed Occupancy</span>
          </span>
          <span className={`text-2xl font-bold font-mono ${metrics.bedOccupancyRate > 85 ? 'text-red-400' : 'text-emerald-400'}`}>
            {metrics.bedOccupancyRate}%
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Average ER Wait</span>
          </span>
          <span className="text-2xl font-bold text-amber-300 font-mono">{metrics.avgWaitTimeMinutes}m</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Triage Accuracy</span>
          </span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{metrics.triageAccuracyPercent}%</span>
        </div>
      </div>

      {/* SubTab 1: Capacity & Beds */}
      {activeSubTab === 'capacity' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <BedDouble className="w-4 h-4 text-purple-400" />
            <span>Department Bed Allocations & Real-Time Census</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => {
              const occupancy = Math.round((dept.occupiedBeds / dept.totalBeds) * 100);
              return (
                <div key={dept.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{dept.name}</h4>
                      <span className="text-xs text-slate-400">{dept.code}</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      occupancy >= 90 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {occupancy}% Full
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{dept.description}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Occupied Beds:</span>
                      <strong className="text-white font-mono">{dept.occupiedBeds} / {dept.totalBeds}</strong>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full rounded-full ${occupancy >= 90 ? 'bg-red-500' : occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, occupancy)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <span>On-Duty Staff: <strong className="text-white">{dept.activeStaffCount}</strong></span>
                    <span>Wait: <strong className="text-amber-400">{dept.currentWaitTimeMinutes}m</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 2: Physicians */}
      {activeSubTab === 'doctors' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Emergency Department Medical Staff & Active Rooms</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => {
              const dept = departments.find(d => d.id === doc.departmentId);
              return (
                <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{doc.name}</h4>
                      <p className="text-xs text-blue-400 font-medium">{dept?.name}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      doc.status === 'available' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : doc.status === 'in_consultation'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-slate-800 text-slate-400'
                    }`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Specialty: <strong className="text-slate-200">{doc.specialty}</strong>
                  </p>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <span>Assigned Room: <strong className="text-white font-mono">{doc.activeRoom}</strong></span>
                    {doc.currentCaseId && <span className="text-amber-400 font-bold">Active Patient</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 3: Clinical Policy Guardrails & Rules Engine */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>AI Clinical Safety Guardrails & Hard Protocols</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic medical rules that enforce strict priority floors and human escalation on high-risk clinical presentations before AI triage takes effect.
            </p>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {clinicalRules.map((rule) => (
              <div key={rule.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-white text-sm">{rule.name}</h4>
                    {rule.forcedLevel && (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        FORCES LEVEL {rule.forcedLevel}
                      </span>
                    )}
                    {rule.escalateToHuman && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        HUMAN ESCALATION
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-mono bg-slate-950 p-1.5 rounded border border-slate-800 inline-block">
                    Condition: {rule.condition}
                  </p>
                  <p className="text-xs text-slate-400">{rule.description}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      rule.enabled 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900' 
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{rule.enabled ? 'ACTIVE RULE' : 'DISABLED'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 4: Audit & Observability Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Real-Time Audit & Observability Telemetry</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Complete traceability of every AI triage decision, status transition, priority override, and latency benchmark.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500"
                />
              </div>

              <button
                onClick={loadAuditLogs}
                disabled={loadingLogs}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Actor / Engine</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Trace ID</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">{log.performedBy}</td>
                      <td className="p-3 text-purple-300">{log.targetEntity} ({log.targetId})</td>
                      <td className="p-3 text-slate-500">{log.traceId}</td>
                      <td className="p-3 text-amber-300">{log.latencyMs ? `${log.latencyMs}ms` : '—'}</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
