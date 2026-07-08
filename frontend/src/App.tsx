import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from "./components/Navbar";
import { HeroSlider } from "./components/HeroSlider";
import { ServicesSection } from "./components/ServicesSection";
import { EPSSection } from "./components/EPSSection";
import { AppointmentChatSection } from "./components/AppointmentChatSection";
import { ChatBot } from "./components/ChatBot";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { Toaster } from "./components/ui/sonner";
import CalendarioPage from "./pages/CalendarioPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ContrastToggle from "./components/ContrastToggle";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./lib/authContext";

function HomePage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      {/* Contrast toggle only on the main home page */}
      <ContrastToggle />
      <Navbar 
        onLoginClick={() => navigate("/login")}
        onAgendarClick={() => navigate("/calendario")}
      />
      <HeroSlider />
      <ServicesSection />
      <EPSSection />
      <AppointmentChatSection />
      <ChatBot />
      <Footer />
    </div>
  );
}

function LoginPageWrapper() {
  const navigate = useNavigate();

  // BOT-01: el chatbot es SOLO para la landing pública, no en el portal de empleados.
  return <LoginPage onBack={() => navigate("/")} />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <CalendarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
      </AuthProvider>
    </Router>
  );
}