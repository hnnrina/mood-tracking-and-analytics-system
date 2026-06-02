import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './UserDashboard.css';

const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('loading');

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('verification_requests')
          .select('status')
          .eq('professional_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setVerificationStatus(data ? data.status : 'not_found');
      } catch (err) {
        console.error('Error verifying registration parameter checks:', err.message);
        setVerificationStatus('error');
      }
    };

    if (user) checkVerificationStatus();
  }, [user]);

  if (verificationStatus === 'loading') {
    return <div className="dashboard-wrapper"><p>Validating system credentials...</p></div>;
  }

  // Enforce block if status is not approved
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

  // Clear to display full operational capability if validated
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Professional Workspace Dashboard</h2>
          <button onClick={() => supabase.auth.signOut()} className="logout-btn">Log Out</button>
        </div>
        <div className="log-card">
          <p>Welcome to your workspace. Approved users who consent to sharing analytics parameters will display metrics indicators here.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;