import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './Login.css'; // Import the new CSS file

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false); // Toggles between Login and Sign Up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect users if they are already logged in
  useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin-dashboard');
      else if (role === 'professional') navigate('/pro-dashboard');
      else navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isSignUp) {
      // --- SIGN UP LOGIC ---
      if (!fullName) {
        setErrorMsg('Please enter your full name.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user' 
          }
        }
      });
      if (error) setErrorMsg(error.message);
      else alert('Account created! You can now sign in.');
    } else {
      // --- SIGN IN LOGIC ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="login-subtitle">
          {isSignUp ? 'Begin your wellness journey today.' : 'Sign in to track your mood and activities.'}
        </p>

        {errorMsg && <div className="error-message">{errorMsg}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          
          {/* Only show Full Name field if they are signing up */}
          {isSignUp && (
            <div className="input-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="login-input"
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="login-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="login-input"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="toggle-mode">
          {isSignUp ? "Already have an account?" : "Don't have an account?"} 
          <span onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMsg(''); // Clear errors when switching modes
          }}>
            {isSignUp ? 'Sign In here' : 'Sign Up here'}
          </span>

          {!isSignUp && (
            <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '15px' }}>
              Are you a mental health practitioner? <br />
              <span onClick={() => navigate('/pro-register')} style={{ textDecoration: 'underline' }}>
                Register as a Professional
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;