import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CalendarioPage from './pages/CalendarioPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
      </Routes>
    </Router>
  );
}
