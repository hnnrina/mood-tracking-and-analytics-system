// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import MindTrackLogo from '../components/MindTrackLogo';
import { NavIcons, DashboardIcons } from '../components/MoodVectors';
import './UserDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  // Navigation tab states: 'flags' | 'verifications' | 'pairings'
  const [activeTab, setActiveTab] = useState('flags');
  const [loading, setLoading] = useState(true);

  // Data storage states
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [criticalFlags, setCriticalFlags] = useState([]);
  const [activePairings, setActivePairings] = useState([]);
  const [verifiedProfessionals, setVerifiedProfessionals] = useState([]);

  // Modal assignment machine hooks
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [targetProfessionalId, setTargetProfessionalId] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // IDENTITY & SCORE RESOLVER: Converts profile UUIDs to names and grabs the single most recent wellness score
  const hydrateFlaggedUsersDetails = async (flagsArray) => {
    const enriched = [];
    for (const item of flagsArray) {
      // Fetch user's full name
      const { data: profileRow } = await supabase
        .from('profile')
        .select('full_name')
        .eq('id', item.profile_id)
        .maybeSingle();

      // Query exclusively the single most recent wellness score entry
      const { data: wellnessRow } = await supabase
        .from('wellness_analysis')
        .select('wellness_score')
        .eq('profile_id', item.profile_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      enriched.push({
        ...item,
        student_name: profileRow?.full_name || 'Anonymous Student',
        wellness_score: wellnessRow && wellnessRow.wellness_score !== undefined ? wellnessRow.wellness_score : 'Uncomputed Baseline'
      });
    }
    return enriched;
  };

  // IDENTITY RESOLVER FOR CARE LEDGER TABS: Hydrates student full names
  const hydratePairingStudentNames = async (pairingsArray) => {
    const enriched = [];
    for (const item of pairingsArray) {
      const { data: profileRow } = await supabase
        .from('profile')
        .select('full_name')
        .eq('id', item.user_id)
        .maybeSingle();
      enriched.push({ ...item, student_name: profileRow?.full_name || 'Anonymous Student' });
    }
    return enriched;
  };

  // PRACTITIONER IDENTITY RESOLVER: Maps practitioner IDs to formatted names and specialties
  const resolvePractitionerIdentityText = (profId) => {
    const match = verifiedProfessionals.find(p => p.id === profId);
    return match ? `${match.name} (${match.profession})` : 'Assigned Specialist Node';
  };

  // --- QUERY HANDLERS ---
  const fetchCriticalSystemFlags = async () => {
    try {
      // 1. Fetch active or assigned tracking items to find out who is already under care
      const { data: activeAssignments, error: pairingsErr } = await supabase
        .from('access_requests')
        .select('user_id')
        .in('status', ['assigned', 'active']);

      if (pairingsErr) throw pairingsErr;
      const assignedUserIds = activeAssignments ? activeAssignments.map(item => item.user_id) : [];

      // 2. Query high-severity active system anomalies flags
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('notification_type', 'alert')
        .eq('severity_level', 'high')
        .eq('is_read', false);

      if (error) throw error;

      // 3. Filter out rows for any student profiles who are already assigned to a clinical specialist
      const filteredFlags = (data || []).filter(flag => !assignedUserIds.includes(flag.profile_id));

      const fullyHydratedFlags = await hydrateFlaggedUsersDetails(filteredFlags);
      setCriticalFlags(fullyHydratedFlags);
    } catch (err) {
      console.error('Error fetching system critical indicators:', err.message);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          id, profession_type, license_number, status, created_at, professional_id, document_url,
          profile ( full_name )
        `)
        .eq('status', 'pending');

      if (error) throw error;
      setVerificationRequests(data || []);
    } catch (err) {
      console.error('Error fetching system audit payloads:', err.message);
    }
  };

  const fetchActiveCarePairings = async () => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fullyHydratedPairings = await hydratePairingStudentNames(data || []);
      setActivePairings(fullyHydratedPairings);
    } catch (err) {
      console.error('Error fetching active pairing ledger fields:', err.message);
    }
  };

  const fetchApprovedPractitionersList = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`professional_id, profession_type, profile ( full_name )`)
        .eq('status', 'approved');

      if (error) throw error;
      setVerifiedProfessionals(data.map(item => ({
        id: item.professional_id,
        name: item.profile?.full_name || 'Verified Professional',
        profession: item.profession_type || 'Clinical Practitioner'
      })));
    } catch (err) {
      console.error('Error building practitioners registry map:', err.message);
    }
  };

  const synchronizeMasterAdminData = async () => {
    setLoading(true);
    // Fetch practitioner identities list first so synchronous mappings function seamlessly during layout evaluation loops
    await fetchApprovedPractitionersList();
    await Promise.all([
      fetchCriticalSystemFlags(),
      fetchPendingVerifications(),
      fetchActiveCarePairings()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      synchronizeMasterAdminData();
    }
  }, [user]);

  // --- ACTIONS WORKSPACE HANDLERS ---
  const handleVerifyPractitionerLicense = async (requestId, statusOutcome) => {
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: statusOutcome })
        .eq('id', requestId);

      if (error) throw error;
      alert(`Account application registry has been successfully ${statusOutcome}.`);
      synchronizeMasterAdminData();
    } catch (err) {
      alert('Audit submission failed: ' + err.message);
    }
  };

  const handleExecuteCareAssignment = async (e) => {
    e.preventDefault();
    if (!targetProfessionalId) return;
    setIsSubmittingAssignment(true);

    try {
      // DUPLICATE TRANSACTION GUARD: Blocks generation if a request is already assigned or active inside database
      const { data: duplicateCheck } = await supabase
        .from('access_requests')
        .select('id')
        .eq('user_id', selectedFlag.profile_id)
        .in('status', ['assigned', 'active'])
        .maybeSingle();

      if (duplicateCheck) {
        alert('Assignment Cancelled: This student profile is already tied to an open or active professional assignment request.');
        setSelectedFlag(null);
        setTargetProfessionalId('');
        setIsSubmittingAssignment(false);
        return;
      }

      const targetDoctor = verifiedProfessionals.find(p => p.id === targetProfessionalId);

      // Step A: Insert care assignment record tracking item into access_requests ledger
      const { data: requestRow, error: requestErr } = await supabase
        .from('access_requests')
        .insert([{
          admin_id: user.id,
          user_id: selectedFlag.profile_id,
          professional_id: targetProfessionalId,
          user_agreed: false,
          professional_agreed: false,
          status: 'assigned'
        }])
        .select().single();

      if (requestErr) throw requestErr;

      // Step B: Dispatch consent choice request notification card to flagged student account inbox
      const { error: noticeErr } = await supabase
        .from('notifications')
        .insert([{
          profile_id: selectedFlag.profile_id,
          notification_type: 'request',
          title: 'Practitioner Assignment Consent Request',
          message: `Administrative Action: ${targetDoctor.name} (${targetDoctor.profession}) has been assigned to view your historical tracking trends charts. Please authorize access inside your notification center panel.`,
          severity_level: 'medium',
          is_read: false,
          request_id: requestRow.id
        }]);

      if (noticeErr) throw noticeErr;

      // Step C: Mark the administrative alert flag as read to resolve it from admin tab
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', selectedFlag.id);

      alert('Care tracking assignment transaction initialized successfully.');
      setSelectedFlag(null);
      setTargetProfessionalId('');
      synchronizeMasterAdminData();
    } catch (err) {
      alert('Transaction failure: ' + err.message);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR NAVIGATION BLOCK */}
      <aside className="sidebar-nav">
        <div className="sidebar-brand-box"><MindTrackLogo showText={true} /></div>
        <div style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 700, color: '#9a8c98', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel</div>
        <ul className="sidebar-menu-links">
          <li className={`sidebar-link-item ${activeTab === 'flags' ? 'active' : ''}`} onClick={() => setActiveTab('flags')}>
            <NavIcons.History /><span>Critical System Flags</span>
          </li>
          <li className={`sidebar-link-item ${activeTab === 'verifications' ? 'active' : ''}`} onClick={() => setActiveTab('verifications')}>
            <NavIcons.AddEntry /><span>Practitioner Audits</span>
          </li>
          <li className={`sidebar-link-item ${activeTab === 'pairings' ? 'active' : ''}`} onClick={() => setActiveTab('pairings')}>
            <NavIcons.Analytics /><span>Care Token Auditing</span>
          </li>
          <li className="sidebar-link-item" onClick={() => supabase.auth.signOut()} style={{ marginTop: 'auto', color: '#e53e3e' }}>
            🚪 <span>Sign Out Session</span>
          </li>
        </ul>
      </aside>

      {/* CORE DISPLAY WORKSPACE VIEWPORT */}
      <div className="dashboard-main-content">
        <nav className="top-navbar">
          <span className="user-greeting">Administrative Governance Console</span>
          <span className="status-pill-badge approved">Secure Server Linked</span>
        </nav>

        <main className="workspace-view">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#8d99ae', padding: '40px' }}>Syncing administrative records matrix arrays...</p>
          ) : (
            <>
              {/* VIEW TAB A: CRITICAL ANOMALIES & ASSIGNMENT FLAGS */}
              {activeTab === 'flags' && (
                <div>
                  <div className="workspace-header">
                    <div>
                      <h2 style={{ marginBottom: '4px' }}>Critical Care Response Center</h2>
                      <p style={{ color: '#8d99ae', margin: 0, fontSize: '14px' }}>Students flagged dynamically by the rules engine following score drops under 45%.</p>
                    </div>
                  </div>

                  <div className="notification-list-deck">
                    {criticalFlags.length === 0 ? (
                      <div style={{ textAlign: 'center', background: '#ffffff', padding: '40px', borderRadius: '14px', border: '1px solid #e9ecef', color: '#8d99ae' }}>
                        No untriaged student distress flags require immediate care routing.
                      </div>
                    ) : (
                      criticalFlags.map((flag) => {
                        const scoreDisplayText = typeof flag.wellness_score === 'number' ? `${flag.wellness_score}%` : flag.wellness_score;
                        return (
                          <div key={flag.id} className="notification-card-item" style={{ borderLeft: '5px solid #e53e3e' }}>
                            <div className="notification-left-block">
                              <div className="notification-bell-icon-frame alert-style">⚠️</div>
                              <div className="notification-text-details" style={{ textAlign: 'left' }}>
                                <h4>Automatic Low-Wellness Boundary Flag Triggered</h4>
                                <p style={{ margin: '6px 0', fontSize: '14px', color: '#4a4e69' }}>
                                  👤 <strong>Student Full Name:</strong> {flag.student_name}
                                  <span style={{ marginLeft: '12px', padding: '2px 8px', background: '#fff5f5', color: '#e53e3e', borderRadius: '4px', fontWeight: 'bold' }}>
                                    Wellness Index: {scoreDisplayText}
                                  </span>
                                </p>
                                <p style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '13px' }}>"{flag.message}"</p>
                                <span className="notification-timestamp-tag">Trapped: {new Date(flag.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="notification-actions-grid">
                              <button className="history-edit-btn" style={{ borderColor: '#81b29a', color: '#81b29a' }} onClick={() => setSelectedFlag(flag)}>
                                Assign Practitioner
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VIEW TAB B: PRACTITIONER LICENSE VERIFICATIONS */}
              {activeTab === 'verifications' && (
                <div className="analytics-chart-card">
                  <h4 className="analytics-chart-title">📋 Pending Professional Application Audits</h4>
                  {verificationRequests.length === 0 ? (
                    <p style={{ color: '#8d99ae', textAlign: 'center', padding: '20px', margin: 0, fontStyle: 'italic' }}>
                      No professional license registrations require administrative validation at this time.
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #e9ecef', color: '#9a8c98', fontSize: '13px' }}>
                          <th style={{ padding: '12px' }}>Applicant Name</th>
                          <th>Specialty Field</th>
                          <th>License Number</th>
                          <th>Credential File</th>
                          <th style={{ textAlign: 'center' }}>Actions Ledger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verificationRequests.map((req) => (
                          <tr key={req.id} style={{ borderBottom: '1px solid #f4f6f8', fontSize: '13.5px' }}>
                            <td style={{ padding: '15px 12px', fontWeight: '600' }}>{req.profile?.full_name || 'Practitioner Candidate'}</td>
                            <td>{req.profession_type}</td>
                            <td style={{ fontFamily: 'monospace', color: '#e07a5f', fontWeight: '600' }}>{req.license_number}</td>
                            <td>
                              {req.document_url ? (
                                <a href={req.document_url} target="_blank" rel="noopener noreferrer" style={{ color: '#81b29a', fontWeight: '700', textDecoration: 'underline' }}>
                                  View Certificate Asset
                                </a>
                              ) : <span style={{ color: '#8d99ae' }}>No asset attached</span>}
                            </td>
                            <td style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '15px 12px' }}>
                              <button onClick={() => handleVerifyPractitionerLicense(req.id, 'approved')} className="history-edit-btn" style={{ borderColor: '#81b29a', color: '#81b29a' }}>Approve Professional</button>
                              <button onClick={() => handleVerifyPractitionerLicense(req.id, 'rejected')} className="history-delete-btn">Reject</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* VIEW TAB C: CARE LEDGER ACCESS CONTROL AUDITS */}
              {activeTab === 'pairings' && (
                <div>
                  <div className="workspace-header">
                    <div>
                      <h2 style={{ marginBottom: '4px' }}>Care Token Access Ledger Map</h2>
                      <p style={{ color: '#8d99ae', margin: 0, fontSize: '14px' }}>Trace history ledger showing active multi-role double-consent care pairings statuses.</p>
                    </div>
                  </div>

                  <div className="history-list-wrapper">
                    {activePairings.length === 0 ? (
                      <div style={{ textAlign: 'center', background: '#ffffff', padding: '40px', borderRadius: '14px', border: '1px solid #e9ecef', color: '#8d99ae' }}>
                        No care assignments have been mapped within the system records yet.
                      </div>
                    ) : (
                      activePairings.map((pair) => (
                        <div key={pair.id} className="history-item-card">
                          <div className="history-card-left-section">
                            <div className="history-metadata-box">
                              <h4 className="history-date-header">Student Tracker: <span style={{ color: '#4F46E5' }}>{pair.student_name}</span></h4>
                              <p style={{ margin: '6px 0 4px 0', fontSize: '13.5px' }}>
                                🩺 <strong>Assigned Practitioner:</strong> {resolvePractitionerIdentityText(pair.professional_id)}
                              </p>
                              <div className="history-activity-pills-row" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <span className={`history-pill-tag ${pair.user_agreed ? 'sleep' : 'study'}`}>
                                  User Handshake: {pair.user_agreed ? 'AUTHORIZED' : 'PENDING'}
                                </span>
                                <span className={`history-pill-tag ${pair.professional_agreed ? 'exercise' : 'study'}`}>
                                  Practitioner Intake: {pair.professional_agreed ? 'ACCEPTED' : 'PENDING'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="history-card-actions-cluster">
                            <span className={`status-pill-badge ${pair.status === 'active' ? 'approved' : 'rejected'}`}>
                              {pair.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* COMPACT INTERACTIVE OVERLAY PANEL MODEL */}
      {selectedFlag && (
        <div className="modal-backdrop-layer">
          <div className="modal-content-card" style={{ maxWidth: '420px', borderRadius: '16px', padding: '28px' }}>
            <div className="modal-header-row" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Deploy Care Assignment</h3>
              <button className="close-modal-x" onClick={() => setSelectedFlag(null)}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#4a4e69' }}><strong>Student Target:</strong> {selectedFlag.student_name}</p>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#e53e3e', fontWeight: 600 }}>
                <strong>Latest Risk Score:</strong> {typeof selectedFlag.wellness_score === 'number' ? `${selectedFlag.wellness_score}%` : selectedFlag.wellness_score}
              </p>
            </div>

            <form onSubmit={handleExecuteCareAssignment}>
              <div className="form-input-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a4e69' }}>Select Verified System Professional:</label>
                <select 
                  className="filter-select-dropdown"
                  style={{ width: '100%', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dcdde1' }}
                  value={targetProfessionalId}
                  onChange={e => setTargetProfessionalId(e.target.value)}
                  required
                >
                  <option value="">-- Select Specialist Node --</option>
                  {verifiedProfessionals.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.name} - {prof.profession}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="action-button-compact" style={{ flex: 2, padding: '12px', height: 'auto', lineHeight: 'normal' }} disabled={isSubmittingAssignment}>
                  Deploy Assignment
                </button>
                <button type="button" className="modal-action-btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setSelectedFlag(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;