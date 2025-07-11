import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  BarChart3, 
  Users, 
  CheckCircle,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Database,
  Globe,
  Cpu,
  Clock,
  Target
} from 'lucide-react';

interface WelcomePageProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onLogin }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setIsVisible(true), 300);
    const timer2 = setTimeout(() => setShowAuth(true), 1500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onLogin({ email: formData.email, password: formData.password });
    setIsLoading(false);
  };

  const features = [
    {
      icon: Cpu,
      title: 'Intelligence Artificielle',
      description: 'Prédiction automatique de criticité avec algorithmes avancés',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BarChart3,
      title: 'Analytiques Avancées',
      description: 'Tableaux de bord en temps réel et métriques de performance',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Clock,
      title: 'Planification Intelligente',
      description: 'Optimisation automatique des fenêtres de maintenance',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Target,
      title: 'Gestion Centralisée',
      description: 'Plateforme unifiée pour toutes les anomalies industrielles',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const stats = [
    { label: 'Disponibilité Système', value: '99.9%', icon: Activity },
    { label: 'Résolution Plus Rapide', value: '45%', icon: TrendingUp },
    { label: 'Utilisateurs Actifs', value: '2500+', icon: Users },
    { label: 'Anomalies Traitées', value: '150K+', icon: Database }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-300"></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-orange-500 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center">
        {/* Left Side - Branding and Features */}
        <div className={`flex-1 flex flex-col justify-center px-8 lg:px-16 transition-all duration-1000 transform ${
          isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}>
          {/* Logo and Title */}
          <div className="mb-12">
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700">
                  <img 
                    src="/image.png" 
                    alt="TAQA Logo" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-4 border-white dark:border-gray-900 animate-pulse shadow-lg"></div>
              </div>
              <div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-orange-600 bg-clip-text text-transparent mb-3">
                  TAMS
                </h1>
                <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium">
                  TAQA Anomaly Management System
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Système Opérationnel</span>
                </div>
              </div>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Transformez votre efficacité opérationnelle avec une gestion intelligente des anomalies, 
              des analyses en temps réel et une collaboration d'équipe transparente alimentée par l'innovation TAQA.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className={`group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-700 transform hover:scale-105 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: `${800 + index * 200}ms` }}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`bg-gradient-to-r ${feature.color} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Stats */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-1000 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '1200ms' }}>
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <div className="flex justify-center mb-2">
                      <div className="bg-gradient-to-r from-blue-500 to-orange-500 p-2 rounded-lg">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform">
                      {stat.value}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Powered by TAQA */}
          <div className={`mt-12 flex items-center space-x-3 transition-all duration-1000 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '1400ms' }}>
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Alimenté par TAQA - Leader de l'Innovation Énergétique
            </span>
          </div>
        </div>

        {/* Right Side - Authentication */}
        <div className={`flex-1 flex items-center justify-center px-8 transition-all duration-1000 transform ${
          showAuth ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="w-full max-w-md">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              {/* Auth Header */}
              <div className="text-center mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-orange-500 p-3 rounded-2xl w-fit mx-auto mb-4 shadow-lg">
                  <img 
                    src="/image.png" 
                    alt="TAQA Logo" 
                    className="h-8 w-auto object-contain brightness-0 invert"
                  />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Bienvenue
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Connectez-vous pour accéder à votre tableau de bord
                </p>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="votre.email@taqa.ma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mot de Passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Entrez votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Se souvenir de moi</span>
                  </label>
                  <button type="button" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    Mot de passe oublié?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-orange-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2 group shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <span>Se Connecter</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Identifiants Administrateur</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Email: admin@taqa.ma</div>
                    <div>Mot de passe: admin123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Animation Overlay */}
      <div className={`fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center z-50 transition-all duration-1000 ${
        isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl mb-6 animate-pulse border border-gray-200 dark:border-gray-700">
            <img 
              src="/image.png" 
              alt="TAQA Logo" 
              className="h-20 w-auto object-contain mx-auto"
            />
          </div>
          <div className="text-gray-900 dark:text-white text-2xl font-bold mb-2">TAMS</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">Chargement de votre espace de travail...</div>
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};