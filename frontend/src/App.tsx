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
import ContrastToggle from "./components/ContrastToggle";

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
  
  return (
    <>
      <LoginPage onBack={() => navigate("/")} />
      <ChatBot />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route path="/calendario" element={<CalendarioPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}