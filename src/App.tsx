// import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Anomalies } from './pages/Anomalies';
import { AnomalyDetail } from './pages/AnomalyDetail';
import { Planning } from './pages/Planning';
import { PlanningNew } from './pages/PlanningNew';
import { Archive } from './pages/Archive';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import LogsPage from './pages/Logs';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/anomalies" element={<Anomalies />} />
                <Route path="/anomaly/:id" element={<AnomalyDetail />} />
                <Route path="/planning" element={<PlanningNew />} />
                <Route path="/planning-old" element={<Planning />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
          <Toaster position="top-right" />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;