import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Classroom from './pages/Classroom';
import Profile from './pages/Profile';
import Routine from './pages/Routine';
import LiveExam from './pages/LiveExam';
import ExamManage from './pages/ExamManage';
import ExamResult from './pages/ExamResult';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/classroom/:id" element={<Classroom />} />
            <Route path="/classroom/:classroomId/exam/:examId" element={<LiveExam />} />
            <Route path="/classroom/:classroomId/exam/:examId/manage" element={<ExamManage />} />
            <Route path="/classroom/:classroomId/exam/:examId/result" element={<ExamResult />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/routine" element={<Routine />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
