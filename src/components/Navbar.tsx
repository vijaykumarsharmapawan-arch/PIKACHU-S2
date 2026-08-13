import React from 'react';
import { 
  Activity, 
  Stethoscope, 
  User, 
  Building2, 
  Cpu, 
  Bell, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { HospitalMetrics, NotificationItem } from '../types';
import { clinicalAudio } from '../services/audio';

interface NavbarProps {
  activeTab: 'doctor' | 'patient' | 'admin' | 'benchmark';
  setActiveTab: (tab: 'doctor' | 'patient' | 'admin' | 'benchmark') => void;
  metrics: HospitalMetrics;
  notifications: NotificationItem[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  notifications,
  connectionStatus,
  soundEnabled,
  setSoundEnabled,
  onOpenNotifications
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md bg-opacity-95">
      {/* Top Emergency Status Bar */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="font-semibold tracking-wider uppercase text-[11px]">
              {connectionStatus === 'connected' ? 'LIVE WS STREAM' : connectionStatus === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-3 text-slate-400 border-l border-slate-800 pl-3">
            <span className="flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-red-400" />
              <span>Critical Cases: <strong className="text-red-400">{metrics.criticalCasesCount}</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Avg Wait: <strong className="text-amber-300">{metrics.avgWaitTimeMinutes}m</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Triage Accuracy: <strong className="text-blue-300">{metrics.triageAccuracyPercent}%</strong></span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="hidden sm:inline-block text-slate-400">
            Active in Queue: <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">{metrics.activeInQueue}</strong>
          </span>
          <span className="hidden sm:inline-block text-slate-500">|</span>
          <span className="text-slate-400">
            Bed Occupancy: <strong className={metrics.bedOccupancyRate > 85 ? 'text-red-400' : 'text-emerald-400'}>{metrics.bedOccupancyRate}%</strong>
          </span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Clinical Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('doctor')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-md shadow-red-900/30 border border-red-500/30">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">PulseRoute<span className="text-red-400">ER</span></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/60">
                  Decision Support MVP
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI Triage & Dynamic Hospital Emergency Management</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
            <button
              id="nav-tab-doctor"
              onClick={() => setActiveTab('doctor')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'doctor'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor / Triage Queue</span>
              {metrics.activeInQueue > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'doctor' ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {metrics.activeInQueue}
                </span>
              )}
            </button>

            <button
              id="nav-tab-patient"
              onClick={() => setActiveTab('patient')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'patient'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patient Intake & Live Status</span>
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hospital Admin & Capacity</span>
            </button>

            <button
              id="nav-tab-benchmark"
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI Evaluation & Chaos Suite</span>
            </button>
          </nav>

          {/* Quick Actions & Controls */}
          <div className="flex items-center space-x-2.5">
            {/* Sound Toggle */}
            <button
              id="btn-toggle-audio"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                clinicalAudio.soundEnabled = next;
                if (next) clinicalAudio.playNotificationBlip();
              }}
              title={soundEnabled ? 'Clinical audio chimes enabled' : 'Audio muted'}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled 
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-750' 
                  : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <button
              id="btn-open-notifications"
              onClick={onOpenNotifications}
              title="Hospital Alert Center"
              className="relative p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* WebSocket status icon */}
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400" title={`WebSocket: ${connectionStatus}`}>
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto space-x-1 pb-2 pt-1 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('doctor')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'doctor' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            🩺 Doctor Queue ({metrics.activeInQueue})
          </button>
          <button
            onClick={() => setActiveTab('patient')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'patient' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            👤 Patient Intake
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'admin' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            🏢 Hospital Admin
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'benchmark' ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            ⚡ AI Bench & Chaos
          </button>
        </div>
      </div>
    </header>
  );
};
