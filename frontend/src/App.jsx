import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import Layout from './layouts/Layout.jsx';

// Public Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Student Pages
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Colleges from './pages/Colleges.jsx';
import CollegeDetails from './pages/CollegeDetails.jsx';
import Recommendations from './pages/Recommendations.jsx';
import Compare from './pages/Compare.jsx';
import WhatIf from './pages/WhatIf.jsx';
import AICounselor from './pages/AICounselor.jsx';
import SavedColleges from './pages/SavedColleges.jsx';
import Applications from './pages/Applications.jsx';
import Settings from './pages/Settings.jsx';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminStudents from './pages/AdminStudents.jsx';
import AdminColleges from './pages/AdminColleges.jsx';
import AdminCourses from './pages/AdminCourses.jsx';
import AdminCutoffs from './pages/AdminCutoffs.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

// Protected Route wrappers
const StudentRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'student') return <Navigate to="/admin/dashboard" replace />;
  
  return <Layout>{children}</Layout>;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (token) {
    return role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Student Protected Routes */}
        <Route path="/dashboard" element={<StudentRoute><Dashboard /></StudentRoute>} />
        <Route path="/profile" element={<StudentRoute><Profile /></StudentRoute>} />
        <Route path="/colleges" element={<StudentRoute><Colleges /></StudentRoute>} />
        <Route path="/colleges/:id" element={<StudentRoute><CollegeDetails /></StudentRoute>} />
        <Route path="/recommendations" element={<StudentRoute><Recommendations /></StudentRoute>} />
        <Route path="/compare" element={<StudentRoute><Compare /></StudentRoute>} />
        <Route path="/what-if" element={<StudentRoute><WhatIf /></StudentRoute>} />
        <Route path="/ai-counselor" element={<StudentRoute><AICounselor /></StudentRoute>} />
        <Route path="/saved-colleges" element={<StudentRoute><SavedColleges /></StudentRoute>} />
        <Route path="/applications" element={<StudentRoute><Applications /></StudentRoute>} />
        <Route path="/settings" element={<StudentRoute><Settings /></StudentRoute>} />

        {/* Admin Protected Routes */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
        <Route path="/admin/colleges" element={<AdminRoute><AdminColleges /></AdminRoute>} />
        <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
        <Route path="/admin/cutoffs" element={<AdminRoute><AdminCutoffs /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
