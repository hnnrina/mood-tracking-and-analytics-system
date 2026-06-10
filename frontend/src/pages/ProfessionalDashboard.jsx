// src/pages/ProfessionalDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import MindTrackLogo from '../components/MindTrackLogo';
import { MoodVectors, NavIcons, DashboardIcons } from '../components/MoodVectors';
import './ProfessionalDashboard.css';
import './UserDashboard.css';

// Import Recharts charting engines for data visualization
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceArea
} from 'recharts';

// ========================================================
// GLOBAL SCOPE CONFIGURATIONS & TOOLTIPS (Hoisting Protected)
// ========================================================
const moodMetaConfig = {
  1: { name: 'Very Sad', class: 'bg-lvl-1', color: '#e53e3e' },
  2: { name: 'Sad', class: 'bg-lvl-2', color: '#dd6b20' },
  3: { name: 'Neutral', class: 'bg-lvl-3', color: '#4a5568' },
  4: { name: 'Happy', class: 'bg-lvl-4', color: '#38a169' },
  5: { name: 'Very Happy', class: 'bg-lvl-5', color: '#81b29a' },
};

const CustomClinicalTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip-box">
        <p className="tooltip-date-header">{data.dateStr}</p>
        <p className="tooltip-data-row" style={{ color: '#81b29a' }}>
          Feeling: {moodMetaConfig[data['Mood Index']]?.name || 'Unknown'} ({data['Mood Index']}/5)
        </p>
        <p className="tooltip-data-row" style={{ color: '#778da9' }}>
          Sleep Window: {data['Sleep Duration (hrs)']} hrs
        </p>
        <p className="tooltip-data-row" style={{ color: '#629098' }}>
          Water Volume: {data['Hydration (Glasses)']} Glasses
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
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'active'

  // Care handshake tracking state arrays
  const [pendingIntakeCases, setPendingIntakeCases] = useState([]);
  const [activeMonitoredCases, setActiveMonitoredCases] = useState([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Read-only parameters inspection viewer states
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [studentHistoricalLogs, setStudentHistoricalLogs] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // --- REGISTRATION PARAMETERS AND STATUS CHECKS ---
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

  // IDENTITY RESOLVER: Converts alphanumeric UUIDs to human-readable full names
  const hydrateStudentNames = async (casesArray) => {
    const enrichedCases = [];
    for (const item of casesArray) {
      if (item.user_id) {
        const { data: profileRow } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', item.user_id)
          .maybeSingle();
        enrichedCases.push({ ...item, student_name: profileRow?.full_name || 'Anonymous Student' });
      } else {
        enrichedCases.push({ ...item, student_name: 'Unknown Profile Link' });
      }
    }
    return enrichedCases;
  };

  // --- QUERY ACCESS REQUEST HANDSHAKES (image_d5f9b6.png schemas) ---
  const fetchPractitionerCaseLoadsLedger = async () => {
    try {
      // 1. Fetch pending care allocations assigned by admin and approved by student
      const { data: pendingData, error: pendingErr } = await supabase
        .from('access_requests')
        .select('*')
        .eq('professional_id', user.id)
        .eq('user_agreed', true)
        .eq('professional_agreed', false);

      if (pendingErr) throw pendingErr;

      // 2. Fetch fully activated medical monitoring cases
      const { data: activeData, error: activeErr } = await supabase
        .from('access_requests')
        .select('*')
        .eq('professional_id', user.id)
        .eq('status', 'active');

      if (activeErr) throw activeErr;

      // REMOVED ALL DUMMY DATA SEEDING LOOPS: Enforces strict data-binding bounds
      const enrichedPending = await hydrateStudentNames(pendingData || []);
      const enrichedActive = await hydrateStudentNames(activeData || []);
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

  // --- LIVE READ-ONLY DATA TELEMETRY LOGS INJECTOR ---
  const loadStudentTelemetryStream = async (studentIdString, studentNameString) => {
    setSelectedStudentId(studentIdString);
    setSelectedStudentName(studentNameString);
    setLoadingTelemetry(true);
    try {
      // Direct query fetch from active student's mood_entry table
      const { data: moodLogs, error: moodErr } = await supabase
        .from('mood_entry')
        .select('id, mood_id, notes, created_at')
        .eq('profile_id', studentIdString)
        .order('created_at', { ascending: false })
        .limit(7);

      if (moodErr) throw moodErr;

      const calculatedChartRows = [];
      
      // Loop and join cross-activity table constraints to parse live metrics rows
      if (moodLogs && moodLogs.length > 0) {
        for (const log of [...moodLogs].reverse()) {
          const dateObj = new Date(log.created_at);
          
          const { data: activities } = await supabase
            .from('activity_log')
            .select('activity_type, sleep_activity(duration_hours), water_activity(glasses_count)')
            .eq('mood_entry_id', log.id);

          let sleepHours = 0;
          let waterGlasses = 0;

          activities?.forEach(act => {
            const sleepData = Array.isArray(act.sleep_activity) ? act.sleep_activity[0] : act.sleep_activity;
            const waterData = Array.isArray(act.water_activity) ? act.water_activity[0] : act.water_activity;
            if (act.activity_type === 'Sleep' && sleepData) sleepHours = parseFloat(sleepData.duration_hours || 0);
            if (act.activity_type === 'Water' && waterData) waterGlasses = parseInt(waterData.glasses_count || 0);
          });

          calculatedChartRows.push({
            dateStr: dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
            'Mood Index': log.mood_id,
            'Sleep Duration (hrs)': sleepHours,
            'Hydration (Glasses)': waterGlasses,
            notes: log.notes || "No reflection summary annotations typed for this entry."
          });
        }
      }
      setStudentHistoricalLogs(calculatedChartRows);
    } catch (err) {
      console.error('Data pipeline connection block dropped:', err.message);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // --- MUTATION TRANSACTION HANDSHAKE CHANNEL ---
  const handleResolveIntakeHandshake = async (requestId, acceptedChoice) => {
    setIsProcessingAction(true);
    const finalStatusFlag = acceptedChoice ? 'active' : 'rejected';
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          professional_agreed: acceptedChoice,
          status: finalStatusFlag
        })
        .eq('id', requestId);
      if (error) throw error;

      alert(`Intake parameters resolved. Case status changed to: ${finalStatusFlag.toUpperCase()}`);
      setSelectedStudentId(null);
      await fetchPractitionerCaseLoadsLedger();
    } catch (err) {
      alert('Handshake update transaction rejected: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (verificationStatus === 'loading') {
    return <div className="dashboard-wrapper"><p>Validating professional governance credentials...</p></div>;
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
          <li className={`sidebar-link-item ${activeSubTab === 'pending' ? 'active' : ''}`} onClick={() => { setActiveSubTab('pending'); setSelectedStudentId(null); }}>
            <NavIcons.AddEntry /><span>Pending Case Intake</span>
          </li>
          <li className={`sidebar-link-item ${activeSubTab === 'active' ? 'active' : ''}`} onClick={() => { setActiveSubTab('active'); setSelectedStudentId(null); }}>
            <NavIcons.Analytics /><span>Active Monitoring</span>
          </li>
          <li className="sidebar-link-item" onClick={() => supabase.auth.signOut()} style={{ marginTop: 'auto', color: '#e53e3e' }}>
             離開 <span>Practitioner Exit</span>
          </li>
        </ul>
      </aside>

      {/* DASHBOARD CORE ROW VIEWPORT CHANNELS */}
      <div className="dashboard-main-content">
        <nav className="top-navbar">
          <span className="user-greeting">Clinical Telemetry Desk: <strong>Verified Practitioner Session</strong></span>
          <span className="status-pill-badge approved">HIPAA Data Secured</span>
        </nav>

        <main className="workspace-view">
          <div className="professional-panel-grid">
            
            {/* SIDE PANEL A: CASES MATRIX REVIEWS LIST */}
            <div className="case-grid-deck">
              <h3 className="section-title" style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#9a8c98' }}>
                {activeSubTab === 'pending' ? 'Assigned Care Allocations' : 'Your Monitored Student Cases'}
              </h3>
              
              {activeSubTab === 'pending' && pendingIntakeCases.map(c => (
                <div key={c.id} className="case-profile-card">
                  <h4>{c.student_name}</h4>
                  <p>Monitoring assignment generated by Administrator. Double-consent tracking requires your acceptance.</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn-action-approve" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={isProcessingAction} onClick={() => handleResolveIntakeHandshake(c.id, true)}>Accept Case</button>
                    <button className="btn-action-decline" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={isProcessingAction} onClick={() => handleResolveIntakeHandshake(c.id, false)}>Decline</button>
                  </div>
                </div>
              ))}

              {activeSubTab === 'active' && activeMonitoredCases.map(c => (
                <div key={c.id} className="case-profile-card" style={{ cursor: 'pointer', transform: selectedStudentId === c.user_id ? 'scale(1.01)' : 'scale(1)', borderColor: selectedStudentId === c.user_id ? '#81b29a' : '#e9ecef' }} onClick={() => loadStudentTelemetryStream(c.user_id, c.student_name)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4>{c.student_name}</h4>
                    <span style={{ fontSize: '11px', color: '#81b29a', fontWeight: 700 }}>AUDITING ➔</span>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Consent complete. Click to populate data charts tracking index streams.</p>
                </div>
              ))}

              {((activeSubTab === 'pending' && pendingIntakeCases.length === 0) || (activeSubTab === 'active' && activeMonitoredCases.length === 0)) && (
                <p style={{ color: '#8d99ae', fontSize: '13px', fontStyle: 'italic', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e9ecef', textAlign: 'center' }}>No record mappings found.</p>
              )}
            </div>

            {/* MAIN PANEL B: LIVE DATA TELEMETRY REVIEW INTERFACE VISUALIZER */}
            <div className="telemetry-inspection-workspace">
              {!selectedStudentId ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8d99ae', minHeight: '340px' }}>
                  <DashboardIcons.Insights style={{ width: '48px', height: '48px', strokeWidth: 1.5, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>Select an active student case node from the left pane layout matrix to run read-only trend audits.</p>
                </div>
              ) : loadingTelemetry ? (
                <p style={{ color: '#8d99ae', padding: '60px' }}>Compiling remote chart data indices stream...</p>
              ) : studentHistoricalLogs.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8d99ae', minHeight: '340px' }}>
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>This user has granted permission but has not logged any mood or activity entries yet.</p>
                </div>
              ) : (
                <div>
                  <div className="clinical-badge-alert">
                    🛡️ <strong>Ethical Compliance Enforcement (Rule PR1 & ET1):</strong> You are entering a read-only biometric review viewport window. Under health data privacy laws, data modifications, drop operations, or diagnostic text writes are strictly prohibited.
                  </div>

                  <div className="workspace-header" style={{ borderBottom: '1px solid #e9ecef', paddingBottom: '14px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#4a4e69' }}>Longitudinal Data Stream: {selectedStudentName}</h3>
                      <span style={{ fontSize: '11px', color: '#9a8c98', fontWeight: 600 }}>SINGLE PATIENT RECORD VIEW MATRIX</span>
                    </div>
                  </div>

                  {/* CHART VP PORT */}
                  <div style={{ width: '100%', height: '280px', minWidth: 0, marginBottom: '24px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={studentHistoricalLogs} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" strokeOpacity={0.4} />
                        <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#9a8c98' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" domain={[1, 5]} tickCount={5} tick={{ fontSize: 11, fill: '#4a4e69' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#778da9' }} axisLine={false} tickLine={false} />
                        
                        <Tooltip content={<CustomClinicalTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <ReferenceArea y1={7} y2={9} yAxisId="right" fill="#778da9" fillOpacity={0.04} />
                        
                        <Bar yAxisId="right" dataKey="Hydration (Glasses)" name="Fluid Log Profile" fill="#629098" opacity={0.25} barSize={18} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="Mood Index" name="Patient Mood Trend" stroke="#81b29a" strokeWidth={3} dot={{ r: 4, fill: '#ffffff', strokeWidth: 1.5 }} />
                        <Line yAxisId="right" type="monotone" dataKey="Sleep Duration (hrs)" name="Rest Duration Parameters" stroke="#778da9" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* DYNAMIC READ-ONLY JOURNAL NOTES DECK */}
                  <h4 style={{ fontSize: '13px', color: '#9a8c98', margin: '24px 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>Patient Behavioral Context Notes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {studentHistoricalLogs.map((log, idx) => (
                      <div key={idx} className="modal-notes-block" style={{ margin: 0, fontSize: '13px', borderLeftColor: moodMetaConfig[log['Mood Index']]?.color || '#778da9', textAlign: 'left' }}>
                        <strong>{log.dateStr} ({moodMetaConfig[log['Mood Index']]?.name || 'Logged'}):</strong> "{log.notes}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;