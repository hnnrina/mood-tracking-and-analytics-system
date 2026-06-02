import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Login.css'; // Reuses your calm design aesthetic rules

const ProfessionalRegister = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [professionType, setProfessionType] = useState('Counselor');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!fullName || !licenseNumber) {
      setErrorMsg('Please populate all clinical configuration inputs.');
      setLoading(false);
      return;
    }

    // 1. Sign up the user inside Supabase Auth with professional metadata tags
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'professional' // Handled by your database trigger path
        }
      }
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // 2. Insert the validation variables into public.verification_requests
    if (authData?.user) {
      const { error: dbError } = await supabase
        .from('verification_requests')
        .insert([{
          professional_id: authData.user.id,
          profession_type: professionType,
          license_number: licenseNumber,
          status: 'pending' // Defaults to pending audit
        }]);

      if (dbError) {
        setErrorMsg(dbError.message);
      } else {
        alert('Application submitted successfully! An administrator will audit your profile credentials before your access is granted.');
        navigate('/login');
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card" style={{ maxWidth: '450px' }}>
        <h2 className="login-title">Practitioner Portal</h2>
        <p className="login-subtitle">Register your clinical credentials to request system entry.</p>

        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleRegister} className="login-form">
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="login-input" placeholder="Dr. Jane Doe" required />
          </div>

          <div className="input-group">
            <label>Profession Type</label>
            <select value={professionType} onChange={(e) => setProfessionType(e.target.value)} className="login-input" style={{ color: '#4a4e69' }}>
              <option value="Counselor">Certified Counselor</option>
              <option value="Psychologist">Clinical Psychologist</option>
              <option value="Psychiatrist">Psychiatrist</option>
            </select>
          </div>

          <div className="input-group">
            <label>Medical License / Certification Number</label>
            <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="login-input" placeholder="e.g. MGC-12345" required />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" placeholder="counselor@institution.org" required />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Submitting Application...' : 'Submit Credentials'}
          </button>
        </form>

        <div className="toggle-mode" style={{ marginTop: '20px' }}>
          Back to standard <span onClick={() => navigate('/login')}>Sign In</span>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalRegister;