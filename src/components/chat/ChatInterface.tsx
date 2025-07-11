import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageCircle, Zap, Users, UserPlus, Circle, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { supabaseChatService } from '../../services/supabaseChatService';
import { useChatLogging } from '../../hooks/useLogging';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'peer';
  content: string;
  timestamp: Date;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    status?: 'online' | 'offline' | 'away';
  };
}

interface UserChat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  status: 'online' | 'offline' | 'away';
}

type ChatMode = 'ai' | 'users';

export const ChatInterface: React.FC = () => {
  const { logMessageSent, logAIResponse, logError } = useChatLogging();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Bonjour! Je suis votre assistant IA TAMS. Comment puis-je vous aider aujourd\'hui?',
      timestamp: new Date(),
    },
  ]);
  const [userChats, setUserChats] = useState<UserChat[]>([
    {
      id: '1',
      name: 'Marie Dubois',
      avatar: '👩‍💼',
      lastMessage: 'La maintenance du P-101 est terminée',
      lastMessageTime: new Date(Date.now() - 300000),
      unreadCount: 2,
      status: 'online'
    },
    {
      id: '2', 
      name: 'Jean Martin',
      avatar: '👨‍🔧',
      lastMessage: 'Anomalie détectée sur la ligne 3',
      lastMessageTime: new Date(Date.now() - 900000),
      unreadCount: 0,
      status: 'away'
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      avatar: '👩‍🔬',
      lastMessage: 'Rapport d\'analyse prêt',
      lastMessageTime: new Date(Date.now() - 1800000),
      unreadCount: 1,
      status: 'online'
    }
  ]);
  const [peerMessages, setPeerMessages] = useState<{ [chatId: string]: ChatMessage[] }>({
    '1': [
      {
        id: 'p1',
        type: 'peer',
        content: 'Salut! As-tu vu l\'anomalie sur P-101?',
        timestamp: new Date(Date.now() - 600000),
        sender: { id: '1', name: 'Marie Dubois', status: 'online' }
      },
      {
        id: 'p2',
        type: 'peer',
        content: 'La maintenance du P-101 est terminée',
        timestamp: new Date(Date.now() - 300000),
        sender: { id: '1', name: 'Marie Dubois', status: 'online' }
      }
    ],
    '2': [
      {
        id: 'p3',
        type: 'peer',
        content: 'Anomalie détectée sur la ligne 3, urgent!',
        timestamp: new Date(Date.now() - 900000),
        sender: { id: '2', name: 'Jean Martin', status: 'away' }
      }
    ],
    '3': [
      {
        id: 'p4',
        type: 'peer',
        content: 'Le rapport d\'analyse est prêt pour révision',
        timestamp: new Date(Date.now() - 1800000),
        sender: { id: '3', name: 'Sophie Laurent', status: 'online' }
      }
    ]
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Suggested messages for quick access
  const suggestedMessages = [
    "Afficher les anomalies critiques",
    "État des équipements P-101",
    "Planning de maintenance",
    "Statistiques des anomalies"
  ];

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerMessages, selectedUserChat]);

  // Load initial connection
  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSuggestedMessage = (suggestion: string) => {
    setInputMessage(suggestion);
    // Auto-send the suggested message after a brief delay
    setTimeout(() => {
      if (!isTyping) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: suggestion,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);
        
        // Process the message
        processMessage(suggestion);
      }
    }, 100);
  };

  const processMessage = async (message: string) => {
    const startTime = Date.now();
    
    try {
      // Log the user message
      await logMessageSent(message, message.length);
      
      // Get AI response from Supabase service
      const context = await buildMessageContext(message);
      const response = await supabaseChatService.getAIResponse(message, context);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
      
      // Save conversation to database
      await supabaseChatService.saveChatMessage(message, response, context);
      
      // Log the AI response
      const duration = Date.now() - startTime;
      await logAIResponse(response.length, duration);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Log the error
      await logError(error as Error, 'chat-message-processing');
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Désolé, je rencontre une difficulté pour traiter votre demande. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
      toast.error('Erreur lors du traitement de votre message');
    } finally {
      setIsTyping(false);
    }
  };

  const loadInitialData = async () => {
    try {
      // Test connection to Supabase
      const { error: anomaliesError } = await supabase
        .from('anomalies')
        .select('id')
        .limit(1);
        
      if (anomaliesError) throw anomaliesError;
      
      toast.success('Connecté à la base de données');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      toast.error('Erreur de connexion à la base de données');
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    if (chatMode === 'ai') {
      // Send message to AI
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: inputMessage,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      const currentMessage = inputMessage;
      setInputMessage('');
      setIsTyping(true);
      
      // Process the message with AI
      await processMessage(currentMessage);
    } else {
      // Send message to selected user
      if (!selectedUserChat) {
        toast.error('Veuillez sélectionner un utilisateur');
        return;
      }
      
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: inputMessage,
        timestamp: new Date(),
        sender: { id: 'current-user', name: 'Vous', status: 'online' }
      };
      
      // Add message to peer chat
      setPeerMessages(prev => ({
        ...prev,
        [selectedUserChat]: [...(prev[selectedUserChat] || []), userMessage]
      }));
      
      // Update last message in user chat list
      setUserChats(prev => prev.map(chat => 
        chat.id === selectedUserChat 
          ? { ...chat, lastMessage: inputMessage, lastMessageTime: new Date() }
          : chat
      ));
      
      setInputMessage('');
      
      // Simulate response from peer (in real app, this would be real-time)
      setTimeout(() => {
        const selectedUser = userChats.find(u => u.id === selectedUserChat);
        if (selectedUser) {
          const peerResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'peer',
            content: generatePeerResponse(),
            timestamp: new Date(),
            sender: { id: selectedUser.id, name: selectedUser.name, status: selectedUser.status }
          };
          
          setPeerMessages(prev => ({
            ...prev,
            [selectedUserChat]: [...(prev[selectedUserChat] || []), peerResponse]
          }));
        }
      }, 1000 + Math.random() * 2000);
    }
  };

  const generatePeerResponse = (): string => {
    const responses = [
      "Merci pour l'information !",
      "Je regarde ça tout de suite.",
      "Parfait, c'est noté.",
      "D'accord, je m'en occupe.",
      "Merci de m'avoir prévenu.",
      "Je vais vérifier les détails.",
      "C'est bien reçu, merci !",
      "Je te tiens au courant."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getCurrentMessages = (): ChatMessage[] => {
    if (chatMode === 'ai') {
      return messages;
    } else if (selectedUserChat) {
      return peerMessages[selectedUserChat] || [];
    }
    return [];
  };

  const getStatusColor = (status: 'online' | 'offline' | 'away'): string => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const buildMessageContext = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    const context: any = {};

    try {
      // Get basic data based on message content (fallback for non-vector search)
      if (lowerMessage.includes('anomalie') || lowerMessage.includes('critique') || lowerMessage.includes('équipement')) {
        const { data: anomalies, error } = await supabase
          .from('anomalies')
          .select('*')
          .limit(3);
          
        if (!error && anomalies) {
          context.anomalies = anomalies;
        }
      }

      if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning') || lowerMessage.includes('arrêt')) {
        const { data: maintenanceWindows, error } = await supabase
          .from('maintenance_windows')
          .select('*')
          .limit(3);
          
        if (!error && maintenanceWindows) {
          context.maintenanceWindows = maintenanceWindows;
        }
      }

      // Calculate basic statistics
      const { data: anomalies, error: anomaliesError } = await supabase
        .from('anomalies')
        .select('status, final_criticality_level')
        .limit(1000);
        
      if (!anomaliesError && anomalies) {
        const openAnomalies = anomalies.filter(a => a.status !== 'cloture').length;
        const criticalAnomalies = anomalies.filter(a => a.final_criticality_level >= 10).length;
        const totalAnomalies = anomalies.length;
        const treatmentRate = totalAnomalies > 0 ? Math.round(((totalAnomalies - openAnomalies) / totalAnomalies) * 100) : 0;
        
        context.statistics = {
          openAnomalies,
          criticalAnomalies,
          treatmentRate,
          averageResolutionTime: 5
        };
      }

    } catch (error) {
      console.error('Error building context:', error);
    }

    return context;
  };
  
  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar for User Chats (only visible in users mode) */}
      {chatMode === 'users' && (
        <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <UserPlus className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Chat List */}
          <div className="flex-1 overflow-y-auto">
            {userChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedUserChat(chat.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedUserChat === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-xl">
                      {chat.avatar || '👤'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(chat.status)} rounded-full border-2 border-white`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{chat.name}</h3>
                      {chat.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {chat.lastMessageTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            {/* Chat Mode Tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => {setChatMode('ai'); setSelectedUserChat(null);}}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    chatMode === 'ai'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <span>Assistant IA</span>
                  </div>
                </button>
                <button
                  onClick={() => setChatMode('users')}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    chatMode === 'users'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Équipe</span>
                    {userChats.reduce((sum, chat) => sum + chat.unreadCount, 0) > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {userChats.reduce((sum, chat) => sum + chat.unreadCount, 0)}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Current Chat Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {chatMode === 'ai' ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                  ) : selectedUserChat ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg text-xl">
                      {userChats.find(u => u.id === selectedUserChat)?.avatar || '👤'}
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  {chatMode === 'ai' ? (
                    <>
                      <h1 className="text-xl font-bold text-gray-900">Assistant IA TAMS</h1>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Sparkles className="h-4 w-4 mr-1 text-purple-500" />
                        Alimenté par l'IA • En ligne
                      </p>
                    </>
                  ) : selectedUserChat ? (
                    <>
                      <h1 className="text-xl font-bold text-gray-900">
                        {userChats.find(u => u.id === selectedUserChat)?.name}
                      </h1>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Circle className={`h-2 w-2 mr-2 rounded-full ${getStatusColor(userChats.find(u => u.id === selectedUserChat)?.status || 'offline')}`} />
                        {userChats.find(u => u.id === selectedUserChat)?.status === 'online' ? 'En ligne' : 
                         userChats.find(u => u.id === selectedUserChat)?.status === 'away' ? 'Absent' : 'Hors ligne'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-gray-900">Chat Équipe</h1>
                      <p className="text-sm text-gray-500">Sélectionnez une conversation</p>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <MessageCircle className="h-4 w-4" />
                <span>{getCurrentMessages().length} messages</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto flex flex-col">
            {chatMode === 'users' && !selectedUserChat ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sélectionnez une conversation</h3>
                  <p className="text-gray-500 max-w-md">
                    Choisissez un membre de votre équipe dans la liste pour commencer à discuter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {getCurrentMessages().map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-4 animate-fadeIn ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : message.type === 'bot'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : 'bg-gradient-to-br from-green-500 to-green-600'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : message.type === 'bot' ? (
                        <Bot className="h-5 w-5 text-white" />
                      ) : (
                        <span className="text-sm text-white">
                          {message.sender?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`group max-w-xs sm:max-w-md lg:max-w-lg ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`relative px-5 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                          message.type === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                            : message.type === 'bot'
                            ? 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                            : 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border border-green-200 rounded-bl-md'
                        }`}
                      >
                        {message.type === 'peer' && message.sender && (
                          <div className="text-xs font-semibold text-green-600 mb-1">
                            {message.sender.name}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Message Time */}
                        <div className={`text-xs mt-2 opacity-70 ${
                          message.type === 'user' ? 'text-blue-100' : 
                          message.type === 'bot' ? 'text-gray-500' :
                          'text-green-600'
                        }`}>
                          {message.timestamp.toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && chatMode === 'ai' && (
                  <div className="flex items-start space-x-4 animate-fadeIn">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">Assistant IA tape...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show suggested messages only for AI chat when there are few messages */}
                {chatMode === 'ai' && messages.length <= 2 && !isTyping && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-medium">Suggestions:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {suggestedMessages.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedMessage(suggestion)}
                          className="text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-sm text-gray-700 group"
                        >
                          <div className="flex items-center justify-between">
                            <span>{suggestion}</span>
                            <Zap className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area */}
        {(chatMode === 'ai' || selectedUserChat) && (
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Input
                    placeholder={chatMode === 'ai' ? "Tapez votre message..." : "Tapez votre message à l'équipe..."}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isTyping}
                    className="w-full px-4 py-3 pr-16 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputMessage.trim() || isTyping}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mt-2 text-center">
                {chatMode === 'ai' 
                  ? "L'IA peut faire des erreurs. Vérifiez les informations importantes."
                  : "Communiquez de manière professionnelle avec votre équipe."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;