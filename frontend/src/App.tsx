import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ListingsPage from './pages/ListingsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/followups" element={<FollowUpsPage />} />
      <Route path="/listings" element={<ListingsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
