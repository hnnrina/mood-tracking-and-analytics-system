import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import "./UserDashboard.css"; 

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          id,
          profession_type,
          license_number,
          status,
          created_at,
          professional_id,
          document_url,
          profile ( full_name )
        `)
        .eq('status', 'pending');

      if (error) throw error;
      setRequests(data);
    } catch (error) {
      console.error('Error fetching system audit payloads:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleAuditAction = async (requestId, newStatus) => {
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      alert(`Account has been successfully ${newStatus}.`);
      fetchPendingRequests(); 
    } catch (error) {
      alert('Audit submission failed: ' + error.message);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container" style={{ maxWidth: '950px' }}>
        <div className="dashboard-header">
          <h2>Administrative Governance Dashboard</h2>
          <button onClick={() => supabase.auth.signOut()} className="logout-btn">Log Out</button>
        </div>

        <div className="log-card">
          <h3 className="section-title">Pending Clinical Practitioner Applications</h3>
          
          {loading ? (
            <p>Loading validation parameters...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: '#8d99ae', textAlign: 'center', padding: '20px' }}>
              No pending registration requests require audit at this time.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e9ecef', color: '#9a8c98' }}>
                  <th style={{ padding: '12px' }}>Applicant</th>
                  <th>Specialty</th>
                  <th>License ID</th>
                  <th>Attached File</th> {/* NEW HEADER COLUMN */}
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const applicantName = Array.isArray(req.profile)
                    ? req.profile[0]?.full_name
                    : req.profile?.full_name;

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #f4f6f8' }}>
                      <td style={{ padding: '15px 12px', fontWeight: '600' }}>
                        {applicantName || 'Unknown Requestor'}
                      </td>
                      <td>{req.profession_type}</td>
                      <td style={{ fontFamily: 'monospace', color: '#e07a5f' }}>{req.license_number}</td>
                      
                      <td>
                        {req.document_url ? (
                          <a 
                            href={req.document_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: '#81b29a', fontWeight: '600', textDecoration: 'underline' }}
                          >
                            View Certificate
                          </a>
                        ) : (
                          <span style={{ color: '#8d99ae' }}>No Document</span>
                        )}
                      </td>

                      <td style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '15px 12px' }}>
                        <button onClick={() => handleAuditAction(req.id, 'approved')} className="submit-log-btn" style={{ margin: 0, padding: '8px 14px', fontSize: '14px' }}>
                          Approve Access
                        </button>
                        <button onClick={() => handleAuditAction(req.id, 'rejected')} className="logout-btn" style={{ padding: '8px 14px', fontSize: '14px', color: '#d63031', borderColor: '#d63031' }}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;