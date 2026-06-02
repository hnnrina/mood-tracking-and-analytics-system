import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: '50px' }}>
      <h2>Unauthorized</h2>
      <p>Welcome, your User ID is: {user?.id}</p>
      <button onClick={handleLogout}>Log Out</button>
    </div>
  );
};

export default Unauthorized;