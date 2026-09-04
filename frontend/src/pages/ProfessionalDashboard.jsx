// src/pages/ProfessionalDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import MindTrackLogo from '../components/MindTrackLogo';
import { NavIcons } from '../components/MoodVectors';
import { normalizeCalendarDays, calculateWellnessScore } from '../engine/wellnessRulesEngine';
import './ProfessionalDashboard.css';
import './UserDashboard.css';

// Recharts engines for data visualization
import { 
  ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';

// ========================================================
// GLOBAL SCOPE CONFIGURATIONS & TOOLTIPS
// ========================================================
const moodMetaConfig = {
  1: { name: 'Very Sad', class: 'bg-lvl-1', color: '#e53e3e' },
  2: { name: 'Sad', class: 'bg-lvl-2', color: '#dd6b20' },
  3: { name: 'Neutral', class: 'bg-lvl-3', color: '#4a5568' },
  4: { name: 'Happy', class: 'bg-lvl-4', color: '#38a169' },
  5: { name: 'Very Happy', class: 'bg-lvl-5', color: '#81b29a' },
};

const formatDecimalHourTo12h = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined) return '';
  let hours = Math.floor(decimalHours);
  let minutes = Math.round((decimalHours - hours) * 60);
  let isNextDay = false;
  if (hours >= 24) {
    hours -= 24;
    isNextDay = true;
  }
  const ampm = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${minuteStr} ${ampm}${isNextDay ? ' (+1d)' : ''}`;
};

const CustomClinicalTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip-box">
        <p className="tooltip-date-header">{data.dateStr}</p>
        <p className="tooltip-data-row" style={{ color: '#81b29a' }}>
          Mood: {moodMetaConfig[data['Mood Index']]?.name || 'Logged'} ({data['Mood Index']}/5)
        </p>
        <p className="tooltip-data-row" style={{ color: '#778da9' }}>
          Sleep: {data['Sleep Duration (hrs)']} hrs
        </p>
        <p className="tooltip-data-row" style={{ color: '#629098' }}>
          Hydration: {data['Hydration (Glasses)']} Glasses
        </p>
      </div>
    );
  }
  return null;
};

const CustomSleepTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const range = data.sleepRange;
    if (!range || range.length < 2) return null;
    return (
      <div className="custom-chart-tooltip-box">
        <p className="tooltip-date-header">{data.dateStr}</p>
        <p className="tooltip-data-row" style={{ color: '#778da9' }}>
          Bedtime: {formatDecimalHourTo12h(range[0])}
        </p>
        <p className="tooltip-data-row" style={{ color: '#81b29a' }}>
          Wake Time: {formatDecimalHourTo12h(range[1])}
        </p>
        <p className="tooltip-data-row" style={{ color: '#4a4e69' }}>
          Duration: {data.duration} hrs
        </p>
      </div>
    );
  }
  return null;
};

// ========================================================
// MAIN PROFESSIONAL DASHBOARD PLATFORM COMPONENT
// ========================================================
const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('loading');
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' | 'pending'

  // Case ledger matrices lists
  const [pendingIntakeCases, setPendingIntakeCases] = useState([]);
  const [activeMonitoredCases, setActiveMonitoredCases] = useState([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Collapsible Analytics State per patient card
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [patientChartLogs, setPatientChartLogs] = useState({});
  const [loadingChartId, setLoadingChartId] = useState(null);

  // --- REGISTRATION PARAMETERS AND STATUS CHECKS MODULE ---
  const executeLicensureVerificationCheck = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('status')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setVerificationStatus(data ? data.status : 'not_found');
    } catch (err) {
      console.error('Error verifying credentials status index:', err.message);
      setVerificationStatus('error');
    }
  };

  // --- COMPOSITE WELLNESS SCORE ENGINE CALCULATOR FOR PATIENTS ---
  const fetchPatientCompositeScore = async (studentId) => {
    try {
      const { data: moodLogs } = await supabase
        .from('mood_entry')
        .select(`
          id, mood_id, notes, created_at,
          activity_log (
            activity_type,
            sleep_activity (duration_hours, start_time, end_time),
            water_activity (glasses_count, liters_consumed),
            exercise_activity (duration_minutes),
            study_activity (duration_minutes)
          )
        `)
        .eq('profile_id', studentId)
        .order('created_at', { ascending: false })
        .limit(14);

      if (!moodLogs || moodLogs.length === 0) {
        return { computedWellnessScore: null };
      }

      const formattedLogs = moodLogs.map(log => {
        const subActivities = {};
        log.activity_log?.forEach(act => {
          if (act.activity_type === 'Sleep') {
            const s = Array.isArray(act.sleep_activity) ? act.sleep_activity[0] : act.sleep_activity;
            if (s) subActivities.sleep = s;
          }
          if (act.activity_type === 'Water') {
            const w = Array.isArray(act.water_activity) ? act.water_activity[0] : act.water_activity;
            if (w) subActivities.water = w;
          }
          if (act.activity_type === 'Exercise') {
            const e = Array.isArray(act.exercise_activity) ? act.exercise_activity[0] : act.exercise_activity;
            if (e) subActivities.exercise = e;
          }
          if (act.activity_type === 'Study') {
            const st = Array.isArray(act.study_activity) ? act.study_activity[0] : act.study_activity;
            if (st) subActivities.study = st;
          }
        });
        return {
          id: log.id,
          mood_id: log.mood_id,
          notes: log.notes,
          created_at: log.created_at,
          subActivities
        };
      });

      const normalized = normalizeCalendarDays(formattedLogs, 7);
      const scoreData = calculateWellnessScore(normalized);
      return scoreData;
    } catch (err) {
      console.error('Error calculating patient composite score:', err.message);
      return { computedWellnessScore: null };
    }
  };

  // IDENTITY & WELLNESS RESOLVER: Hydrates cases with profile names and composite scores
  const hydrateStudentData = async (casesArray) => {
    const enrichedCases = [];
    for (const item of casesArray) {
      if (item.user_id) {
        const { data: profileRow } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', item.user_id)
          .maybeSingle();

        const wellnessData = await fetchPatientCompositeScore(item.user_id);

        enrichedCases.push({
          ...item,
          student_name: profileRow?.full_name || 'Anonymous Student',
          wellnessData
        });
      } else {
        enrichedCases.push({
          ...item,
          student_name: 'Unknown Profile Link',
          wellnessData: { computedWellnessScore: null }
        });
      }
    }
    return enrichedCases;
  };

  // --- QUERY ACCESS REQUEST HANDSHAKES ---
  const fetchPractitionerCaseLoadsLedger = async () => {
    try {
      const { data: pendingData, error: pendingErr } = await supabase
        .from('access_requests')
        .select('*')
        .eq('professional_id', user.id)
        .eq('user_agreed', true)
        .eq('professional_agreed', false);

      if (pendingErr) throw pendingErr;

      const { data: activeData, error: activeErr } = await supabase
        .from('access_requests')
        .select('*')
        .eq('professional_id', user.id)
        .eq('user_agreed', true)
        .eq('professional_agreed', true)
        .eq('status', 'active');

      if (activeErr) throw activeErr;

      const enrichedPending = await hydrateStudentData(pendingData || []);
      const enrichedActive = await hydrateStudentData(activeData || []);
      setPendingIntakeCases(enrichedPending);
      setActiveMonitoredCases(enrichedActive);
    } catch (err) {
      console.error('Error compiling practitioner case load components:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      executeLicensureVerificationCheck();
    }
  }, [user]);

  useEffect(() => {
    if (verificationStatus === 'approved') {
      fetchPractitionerCaseLoadsLedger();
    }
  }, [verificationStatus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setExpandedPatientId(null);
      }
    };
    if (expandedPatientId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedPatientId]);

  // --- BUILD PATIENT ANALYTICS CHART DATA STREAM ---
  const buildPatientChartData = (moodLogs) => {
    if (!moodLogs || moodLogs.length === 0) return { correlation: [], sleepSchedule: [], performance: [], notes: [] };

    const correlation = [];
    const sleepSchedule = [];
    const performance = [];
    const notes = [];

    const sorted = [...moodLogs].reverse();

    sorted.forEach((log) => {
      const dateObj = new Date(log.created_at);
      const dateStr = dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      let sleepHours = 0;
      let waterGlasses = 0;
      let exerciseMins = 0;
      let studyMins = 0;
      let sleepStartDecimal = null;
      let sleepEndDecimal = null;

      log.activity_log?.forEach((act) => {
        if (act.activity_type === 'Sleep') {
          const s = Array.isArray(act.sleep_activity) ? act.sleep_activity[0] : act.sleep_activity;
          if (s) {
            sleepHours = parseFloat(s.duration_hours || 0);
            if (s.start_time) {
              const [h, m] = s.start_time.split(':').map(Number);
              let dec = h + m / 60;
              if (h < 12) dec += 24;
              sleepStartDecimal = dec;
            }
            if (s.end_time) {
              const [h, m] = s.end_time.split(':').map(Number);
              let dec = h + m / 60;
              if (s.start_time) {
                const [startH] = s.start_time.split(':').map(Number);
                if (h < startH || (startH >= 12 && h < 12)) dec += 24;
              }
              sleepEndDecimal = dec;
            }
          }
        }
        if (act.activity_type === 'Water') {
          const w = Array.isArray(act.water_activity) ? act.water_activity[0] : act.water_activity;
          if (w) waterGlasses = parseInt(w.glasses_count || 0);
        }
        if (act.activity_type === 'Exercise') {
          const e = Array.isArray(act.exercise_activity) ? act.exercise_activity[0] : act.exercise_activity;
          if (e) exerciseMins = parseInt(e.duration_minutes || 0);
        }
        if (act.activity_type === 'Study') {
          const st = Array.isArray(act.study_activity) ? act.study_activity[0] : act.study_activity;
          if (st) studyMins = parseInt(st.duration_minutes || 0);
        }
      });

      correlation.push({
        dateStr,
        'Mood Index': log.mood_id,
        'Sleep Duration (hrs)': sleepHours,
        'Hydration (Glasses)': waterGlasses
      });

      if (sleepStartDecimal !== null && sleepEndDecimal !== null) {
        sleepSchedule.push({
          dateStr,
          sleepRange: [sleepStartDecimal, sleepEndDecimal],
          duration: sleepHours
        });
      }

      performance.push({
        dateStr,
        'Focus Study (mins)': studyMins,
        'Exercise Time (mins)': exerciseMins
      });

      if (log.notes) {
        notes.push({
          dateStr,
          mood_id: log.mood_id,
          notes: log.notes
        });
      }
    });

    return { correlation, sleepSchedule, performance, notes };
  };

  // TOGGLE COLLAPSIBLE ANALYTICS DRAWER
  const toggleExpandPatientCharts = async (studentId) => {
    if (expandedPatientId === studentId) {
      setExpandedPatientId(null);
      return;
    }
    setExpandedPatientId(studentId);
    if (!patientChartLogs[studentId]) {
      setLoadingChartId(studentId);
      try {
        const { data: moodLogs } = await supabase
          .from('mood_entry')
          .select(`
            id, mood_id, notes, created_at,
            activity_log (
              activity_type,
              sleep_activity (duration_hours, start_time, end_time),
              water_activity (glasses_count, liters_consumed),
              exercise_activity (duration_minutes),
              study_activity (duration_minutes)
            )
          `)
          .eq('profile_id', studentId)
          .order('created_at', { ascending: false })
          .limit(14);

        const chartData = buildPatientChartData(moodLogs || []);
        setPatientChartLogs(prev => ({ ...prev, [studentId]: chartData }));
      } catch (err) {
        console.error('Error fetching patient chart telemetry stream:', err);
      } finally {
        setLoadingChartId(null);
      }
    }
  };

  // --- MUTATION TRANSACTION HANDSHAKE CHANNEL ---
  const handleResolveIntakeHandshake = async (requestId, acceptedChoice) => {
    setIsProcessingAction(true);
    const finalStatusFlag = acceptedChoice ? 'active' : 'rejected';
    try {
      const { data: requestRow, error: fetchErr } = await supabase
        .from('access_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('access_requests')
        .update({
          professional_agreed: acceptedChoice,
          status: finalStatusFlag
        })
        .eq('id', requestId);
      if (error) throw error;

      if (acceptedChoice) {
        const { data: doctorProfile } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert([{
          profile_id: requestRow.user_id,
          notification_type: 'info',
          title: 'Practitioner Monitoring Active',
          message: `Your assigned healthcare professional, ${doctorProfile?.full_name || 'Verified Practitioner'}, has accepted the tracking session token assignment. Your metrics trends charts are securely linked for active trend review monitoring.`,
          severity_level: 'medium',
          is_read: false
        }]);
      }

      alert(`Intake parameters resolved. Case status changed to: ${finalStatusFlag.toUpperCase()}`);
      await fetchPractitionerCaseLoadsLedger();
    } catch (err) {
      alert('Handshake update transaction rejected: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (verificationStatus === 'loading') {
    return <div className="dashboard-wrapper"><p>Validating professional session credentials...</p></div>;
  }

  if (verificationStatus !== 'approved') {
    return (
      <div className="login-wrapper">
        <div className="login-card" style={{ textAlign: 'center', maxWidth: '450px' }}>
          <span style={{ fontSize: '48px' }}>⏳</span>
          <h2 className="login-title" style={{ marginTop: '15px' }}>Application Under Review</h2>
          <p style={{ color: '#6c757d', lineHeight: '1.6', fontSize: '15px' }}>
            Hello, your medical licensure credentials are currently being reviewed by our system administrators. 
            Access to user wellness data will be enabled once your application is verified.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="logout-btn" style={{ marginTop: '20px', width: '100%' }}>
            Return to Login Screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR NAVIGATION CONTROL PANEL */}
      <aside className="sidebar-nav">
        <div className="sidebar-brand-box"><MindTrackLogo showText={true} /></div>
        <div style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#9a8c98', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical View</div>
        <ul className="sidebar-menu-links">
          <li className={`sidebar-link-item ${activeSubTab === 'active' ? 'active' : ''}`} onClick={() => setActiveSubTab('active')}>
            <NavIcons.Analytics /><span>Active Monitored Cases ({activeMonitoredCases.length})</span>
          </li>
          <li className={`sidebar-link-item ${activeSubTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveSubTab('pending')}>
            <NavIcons.AddEntry /><span>Pending Case Intake ({pendingIntakeCases.length})</span>
          </li>
          <li className="sidebar-link-item" onClick={() => supabase.auth.signOut()} style={{ marginTop: 'auto', color: '#e53e3e' }}>
            <svg className="nav-svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Practitioner Exit</span>
          </li>
        </ul>
      </aside>

      {/* DASHBOARD CORE VIEWPORT */}
      <div className="dashboard-main-content">
        <nav className="top-navbar">
          <span className="user-greeting">Clinical Telemetry Desk: <strong>Verified Practitioner Session</strong></span>
          <span className="status-pill-badge approved">HIPAA Data Secured</span>
        </nav>

        <main className="workspace-view">
          <div className="professional-panel-grid">
            <h3 className="section-title" style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#4a4e69', textAlign: 'left' }}>
              {activeSubTab === 'pending' ? 'Assigned Care Allocations (Awaiting Acceptance)' : 'Monitored Patient Directory'}
            </h3>
            
            <div className="case-grid-deck">
              {/* PENDING CASES */}
              {activeSubTab === 'pending' && pendingIntakeCases.map(c => {
                const score = c.wellnessData?.computedWellnessScore;
                const scoreClass = score !== null && score !== undefined 
                  ? (score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low')
                  : 'neutral';

                return (
                  <div key={c.id} className="case-profile-card">
                    <div className="case-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="patient-avatar-circle">
                          {c.student_name ? c.student_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4a4e69' }}>{c.student_name}</h4>
                          <span style={{ fontSize: '11px', color: '#9a8c98' }}>Pending Intake</span>
                        </div>
                      </div>

                      <div className={`composite-score-badge ${scoreClass}`}>
                        <span className="score-number">{score !== null && score !== undefined ? `${score}%` : '--'}</span>
                        <span className="score-label">Wellness Score</span>
                      </div>
                    </div>


                    <p style={{ fontSize: '12.5px', color: '#6c757d', margin: 0 }}>
                      Monitoring assignment awaiting your case workspace verification acceptance.
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="action-button-compact" style={{ padding: '8px 16px', fontSize: '12px', flex: 1 }} disabled={isProcessingAction} onClick={() => handleResolveIntakeHandshake(c.id, true)}>Accept Case</button>
                      <button className="history-delete-btn" style={{ padding: '8px 16px', fontSize: '12px', flex: 1 }} disabled={isProcessingAction} onClick={() => handleResolveIntakeHandshake(c.id, false)}>Decline</button>
                    </div>
                  </div>
                );
              })}

              {/* ACTIVE MONITORED CASES */}
              {activeSubTab === 'active' && activeMonitoredCases.map(c => {
                const score = c.wellnessData?.computedWellnessScore;
                const scoreClass = score !== null && score !== undefined 
                  ? (score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low')
                  : 'neutral';
                const isExpanded = expandedPatientId === c.user_id;

                return (
                  <div key={c.id} className="case-profile-card">
                    <div className="case-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="patient-avatar-circle">
                          {c.student_name ? c.student_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4a4e69' }}>{c.student_name}</h4>
                          <span style={{ fontSize: '11px', color: '#81b29a', fontWeight: 700 }}>● Monitored Patient</span>
                        </div>
                      </div>

                      <div className={`composite-score-badge ${scoreClass}`}>
                        <span className="score-number">{score !== null && score !== undefined ? `${score}%` : '--'}</span>
                        <span className="score-label">Wellness Score</span>
                      </div>
                    </div>

                    {score !== null && score !== undefined && (
                      <div className="patient-sub-indices-grid">
                        <div className="sub-pill">
                          <span className="pill-title">Mood (Mc)</span>
                          <span className="pill-value">{Math.round((c.wellnessData.mc || 0) * 100)}%</span>
                        </div>
                        <div className="sub-pill">
                          <span className="pill-title">Sleep (Sc)</span>
                          <span className="pill-value">{Math.round((c.wellnessData.sc || 0) * 100)}%</span>
                        </div>
                        <div className="sub-pill">
                          <span className="pill-title">Water (Hc)</span>
                          <span className="pill-value">{Math.round((c.wellnessData.hc || 0) * 100)}%</span>
                        </div>
                        <div className="sub-pill">
                          <span className="pill-title">Exercise (Ec)</span>
                          <span className="pill-value">{Math.round((c.wellnessData.ec || 0) * 100)}%</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6c757d', borderTop: '1px solid #edf2f7', paddingTop: '10px', marginTop: '4px' }}>
                      <span>Avg Sleep: <strong>{c.wellnessData?.avgSleep || 0} hrs/day</strong></span>
                      <span>Avg Water: <strong>{c.wellnessData?.avgWater || 0} glasses/day</strong></span>
                    </div>

                    {/* ANALYTICS CHARTS MODAL TRIGGER BUTTON */}
                    <button 
                      className="chart-toggle-btn"
                      onClick={() => toggleExpandPatientCharts(c.user_id)}
                    >
                      📊 View Analytics Dashboard
                    </button>
                  </div>
                );
              })}

              {((activeSubTab === 'pending' && pendingIntakeCases.length === 0) || (activeSubTab === 'active' && activeMonitoredCases.length === 0)) && (
                <p style={{ color: '#8d99ae', fontSize: '13px', fontStyle: 'italic', padding: '24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e9ecef', textAlign: 'center', gridColumn: '1 / -1' }}>
                  No patient record mappings found under {activeSubTab === 'pending' ? 'pending intake' : 'active monitored cases'}.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* FLOATING ANALYTICS WINDOW / MODAL */}
      {expandedPatientId && (() => {
        const selectedPatient = activeMonitoredCases.find(c => c.user_id === expandedPatientId);
        if (!selectedPatient) return null;
        const score = selectedPatient.wellnessData?.computedWellnessScore;
        const scoreClass = score !== null && score !== undefined 
          ? (score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low')
          : 'neutral';
        const logsData = patientChartLogs[expandedPatientId];

        return (
          <div className="analytics-modal-overlay" onClick={() => setExpandedPatientId(null)}>
            <div className="analytics-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* MODAL HEADER */}
              <div className="analytics-modal-header">
                <div className="analytics-modal-title-group">
                  <div className="patient-avatar-circle" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                    {selectedPatient.student_name ? selectedPatient.student_name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                      📊 Analytics Dashboard: {selectedPatient.student_name}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Clinical Telemetry Stream & Detailed Correlation Charts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className={`composite-score-badge ${scoreClass}`} style={{ padding: '4px 10px', minWidth: '70px' }}>
                    <span className="score-number" style={{ fontSize: '15px' }}>{score !== null && score !== undefined ? `${score}%` : '--'}</span>
                    <span className="score-label" style={{ fontSize: '9px' }}>Wellness Score</span>
                  </div>
                  <button 
                    className="analytics-modal-close-btn"
                    onClick={() => setExpandedPatientId(null)}
                    title="Close Window (Esc)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* MODAL BODY */}
              <div className="analytics-modal-body">
                {loadingChartId === expandedPatientId ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Compiling patient telemetry chart streams...</p>
                  </div>
                ) : !logsData || !logsData.correlation || logsData.correlation.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No historical tracking logs recorded yet by this patient.</p>
                  </div>
                ) : (
                  <>
                    {/* CHART 1: Mood, Sleep & Hydration Correlation */}
                    <div className="analytics-chart-section">
                      <h5 className="analytics-chart-title">
                        📈 1. Mood, Sleep & Hydration Correlation
                      </h5>
                      <div style={{ width: '100%', height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={logsData.correlation} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.7} />
                            <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" domain={[1, 5]} tickCount={5} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomClinicalTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                            <Bar yAxisId="right" dataKey="Hydration (Glasses)" name="Water Intake" fill="#629098" opacity={0.35} barSize={18} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="left" type="monotone" dataKey="Mood Index" name="Tracked Mood" stroke="#81b29a" strokeWidth={3} dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }} />
                            <Line yAxisId="right" type="monotone" dataKey="Sleep Duration (hrs)" name="Rest Duration" stroke="#778da9" strokeWidth={2.5} strokeDasharray="4 4" dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CHART 2: Sleep Schedule Consistency */}
                    {logsData.sleepSchedule && logsData.sleepSchedule.length > 0 && (
                      <div className="analytics-chart-section">
                        <h5 className="analytics-chart-title">
                          🌙 2. Sleep Schedule Consistency
                        </h5>
                        <div style={{ width: '100%', height: '240px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={logsData.sleepSchedule} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.7} />
                              <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis tickFormatter={formatDecimalHourTo12h} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomSleepTooltip />} />
                              <Bar dataKey="sleepRange" name="Sleep Window" fill="#778da9" radius={[4, 4, 4, 4]} barSize={20} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* CHART 3: Focus Workload vs Physical Activation */}
                    {logsData.performance && logsData.performance.length > 0 && (
                      <div className="analytics-chart-section">
                        <h5 className="analytics-chart-title">
                          ⚡ 3. Focus Workload vs. Physical Exercise
                        </h5>
                        <div style={{ width: '100%', height: '240px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={logsData.performance} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.7} />
                              <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                              <Bar dataKey="Focus Study (mins)" name="Study Block" fill="#f39c12" opacity={0.65} barSize={18} radius={[4, 4, 0, 0]} />
                              <Line type="monotone" dataKey="Exercise Time (mins)" name="Exercise Time" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff' }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* PATIENT REFLECTION NOTES */}
                    {logsData.notes && logsData.notes.length > 0 && (
                      <div className="analytics-chart-section">
                        <h5 className="analytics-chart-title">
                          📝 Patient Reflection Notes
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                          {logsData.notes.map((n, idx) => (
                            <div key={idx} className="modal-notes-block" style={{ margin: 0, fontSize: '13px', textAlign: 'left', padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <strong style={{ color: '#475569' }}>{n.dateStr}:</strong> "{n.notes}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ProfessionalDashboard;