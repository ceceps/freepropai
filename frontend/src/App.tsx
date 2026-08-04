import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ListingsPage from './pages/ListingsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/followups" element={<FollowUpsPage />} />
          <Route path="/listings" element={<ListingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
