import { useEffect } from 'react';
import { loggingService } from '../../services/loggingService';

export const LoggingInitializer: React.FC = () => {
  useEffect(() => {
    // Initialize logging service when the app starts
    loggingService.initialize().catch(error => {
      console.error('Failed to initialize logging service:', error);
    });
  }, []);

  return null; // This component doesn't render anything
};

export default LoggingInitializer;
