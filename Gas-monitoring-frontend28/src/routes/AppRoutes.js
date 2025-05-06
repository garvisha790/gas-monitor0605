import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MainDashboard from "../pages/MainDashboard";
import PlantDashboard from "../pages/PlantDashboard";
import DeviceDashboard from "../pages/DeviceDashboard";
import TelemetryDashboard from "../pages/TelemetryDashboard";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/plant-dashboard" element={<PlantDashboard />} />
        <Route path="/device-dashboard" element={<DeviceDashboard />} />
        <Route path="/telemetry-dashboard" element={<TelemetryDashboard />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;