import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Classroom from './pages/Classroom';
import Profile from './pages/Profile';
import Routine from './pages/Routine';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/classroom/:id" element={<Classroom />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/routine" element={<Routine />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
