import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import MindTrackLogo from '../components/MindTrackLogo'; // Import the new logo
import './Login.css'; 

const ProfessionalRegister = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [professionType, setProfessionType] = useState('Counselor');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!fullName || !licenseNumber || !selectedFile) {
      setErrorMsg('Please complete all fields and attach your verification document.');
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'professional'
        }
      }
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    try {
      let documentPublicUrl = null;

      if (authData?.user && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `credentials/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(filePath);

        documentPublicUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('verification_requests')
        .insert([{
          professional_id: authData.user.id,
          profession_type: professionType,
          license_number: licenseNumber,
          document_url: documentPublicUrl,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      alert('Application and credentials submitted successfully! Admin will audit your document shortly.');
      navigate('/login');

    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during onboarding file generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card" style={{ maxWidth: '450px' }}>
        
        {/* BRAND LOGO HEADER INTEGRATION */}
        <MindTrackLogo showText={true} className="logo-display-center" />

        <h2 className="login-title" style={{ marginTop: '15px' }}>Practitioner Portal</h2>
        <p className="login-subtitle">Register your credentials and upload your practicing certificate.</p>

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
            <label>Medical License Number</label>
            <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="login-input" placeholder="e.g. MGC-12345" required />
          </div>

          <div className="input-group">
            <label>Verification Document (PDF or Image)</label>
            <input type="file" accept=".pdf, image/*" onChange={handleFileChange} className="login-input" style={{ padding: '8px' }} required />
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
            {loading ? 'Uploading Files & Submitting...' : 'Submit Application'}
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