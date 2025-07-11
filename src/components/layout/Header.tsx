import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  AlertTriangle, 
  Calendar, 
  MessageCircle, 
  User,
  LogOut,
  Settings,
  FileText,
  Archive,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
    { name: 'Planning', href: '/planning', icon: Calendar },
    { name: 'Archives', href: '/archive', icon: Archive },
    { name: 'Chat AI', href: '/chat', icon: MessageCircle },
    { name: 'Logs', href: '/logs', icon: FileText },
  ];

  const userMenuItems = [
    {
      label: 'Profil',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/profile')
    },
    {
      label: 'Paramètres',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings')
    },
    {
      label: 'Déconnexion',
      icon: <LogOut className="w-4 h-4" />,
      onClick: logout,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
  ];
  
  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="relative">
                <img 
                  src="/image.png" 
                  alt="TAQA Logo" 
                  className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* User Menu Dropdown */}
            <Dropdown
              align="right"
              items={userMenuItems}
              trigger={
                <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-blue-50">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-blue-200"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="hidden md:inline text-sm">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
};