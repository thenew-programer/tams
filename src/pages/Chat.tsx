import React, { useEffect } from 'react';
import { ChatInterface } from '../components/chat/ChatInterface';
import { useLogging } from '../hooks/useLogging';

export const Chat: React.FC = () => {
  const { logPageView } = useLogging();

  useEffect(() => {
    logPageView('Chat');
  }, [logPageView]);

  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  );
};