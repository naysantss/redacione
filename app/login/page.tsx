'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAuth } from "../context/AuthContext";
import Image from "next/image";

export default function Login() {
  const router = useRouter();
  const { currentUser, googleSignIn, signinWithEmail } = UserAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState("");

  const carouselImages = [
    "https://img.freepik.com/free-photo/close-up-hands-taking-notes_23-2148888827.jpg",
    "https://img.freepik.com/free-photo/close-up-student-reading-library_23-2148888813.jpg",
    "https://img.freepik.com/free-photo/portrait-happy-thoughtful-redhead-girl-holding-books_171337-4367.jpg"
  ];

  const carouselTexts = [
    {
      title: "Desenvolva seu potencial",
      description: "Aprimore suas habilidades de escrita com feedback personalizado e orientação especializada."
    },
    {
      title: "Pratique com propósito",
      description: "Temas atuais e relevantes para você desenvolver argumentos sólidos e convincentes."
    },
    {
      title: "Alcance a excelência",
      description: "Metodologia comprovada para você conquistar as melhores notas em redação."
    }
  ];

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch(error) {
      console.error(error);
      setError("Erro ao fazer login com Google");
    }
  };

  useEffect(() => {
    if(currentUser) {
      router.push("/home");
    }
  }, [currentUser, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signinWithEmail(email, password);
    } catch (error) {
      console.error(error);
      setError("Email ou senha inválidos");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Coluna de Login */}
      <div className="flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src="/logo.png" alt="Logo" className="h-20 w-20 mx-auto mb-4 transform hover:scale-105 transition-transform duration-300" />
            <div className="space-y-1">
              <h1 className="text-2xl font-medium text-purple-600">Redacione</h1>
              <h2 className="text-lg font-medium text-gray-700">Curso de Redação com Nayara Santos</h2>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-1 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none text-sm"
                placeholder="Digite seu email"
              />
            </div>

            <div className="space-y-1">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-1 py-2 bg-transparent border-0 border-b border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none text-sm"
                placeholder="Digite sua senha"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 text-sm font-medium hover:shadow-lg"
            >
              Entrar
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm py-2.5 px-4 border border-gray-200 rounded-lg transition-all duration-200 hover:border-gray-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>
          </form>
        </div>
      </div>

      {/* Coluna do Carrossel */}
      <div className="hidden lg:block relative bg-purple-900 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={carouselImages[currentSlide]}
            alt="Redacione"
            className="w-full h-full object-cover opacity-50 transition-all duration-1000"
            style={{
              animation: 'scaleIn 10s ease-in-out infinite'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-purple-900/70" />
        </div>
        
        <div className="relative h-full flex items-center justify-center text-white p-12">
          <div 
            key={currentSlide}
            className="max-w-xl text-center"
            style={{
              animation: 'slideInUp 0.8s ease-out forwards'
            }}
          >
            <h2 className="text-3xl font-light mb-4 opacity-0" style={{ animation: 'fadeIn 0.8s ease-out 0.3s forwards' }}>
              {carouselTexts[currentSlide].title}
            </h2>
            <p className="text-lg text-gray-200 opacity-0" style={{ animation: 'fadeIn 0.8s ease-out 0.6s forwards' }}>
              {carouselTexts[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Indicadores do Carrossel */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 