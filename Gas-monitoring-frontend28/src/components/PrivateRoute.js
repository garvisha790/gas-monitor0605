import React from 'react';
import { Navigate, Outlet, useLocation} from 'react-router-dom';

const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Default redirect from "/" to "/dashboard" happens **only if logged in**
  if (location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
