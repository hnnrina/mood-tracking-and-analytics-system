import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // You can replace this with a nice spinner
  }

  // If they aren't logged in, send them to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If they don't have the right role, send them to unauthorized (or their default dashboard)
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If everything is good, render the page
  return children;
};

export default ProtectedRoute;