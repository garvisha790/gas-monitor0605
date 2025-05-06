//app.js
 
import React from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import { AlarmProvider } from './context/alarmContext';

import Layout from './components/Layout';

import Login from './pages/Login';

import Register from './pages/Register';

import MainDashboard from './pages/MainDashboard';

import PlantDashboard from './pages/PlantDashboard';

import DeviceDashboard from './pages/DeviceDashboard';

import TelemetryDashboard from './pages/TelemetryDashboard';
import PrivateRoute from './components/PrivateRoute';

 
function App() {

  return (
<AlarmProvider>
  <Router>
    <AuthProvider>
      <Routes>
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/" element={<PrivateRoute />}>

<Route path="dashboard" element={
<Layout>
<MainDashboard />
</Layout>

              } />
<Route path="plant-dashboard" element={
<Layout>
<PlantDashboard />
</Layout>

              } />
<Route path="device-dashboard" element={
<Layout>
<DeviceDashboard />
</Layout>

              } />
<Route path="telemetry-dashboard" element={
<Layout>
<TelemetryDashboard />
</Layout>

              } />
</Route>
</Routes>
    </AuthProvider>
  </Router>
</AlarmProvider>

  );

}
 
export default App;
 