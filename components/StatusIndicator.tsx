
import React from 'react';
import { AssistantStatus } from '../types';

interface StatusIndicatorProps {
  status: AssistantStatus;
}

const statusMap: Record<AssistantStatus, { text: string; className: string }> = {
  [AssistantStatus.IDLE]: { text: 'Click the icon to start a new chat', className: 'text-gray-400' },
  [AssistantStatus.LISTENING]: { text: 'Listening...', className: 'text-cyan-400 animate-pulse' },
  [AssistantStatus.THINKING]: { text: 'Thinking...', className: 'text-sky-400 animate-pulse' },
  [AssistantStatus.SPEAKING]: { text: 'Speaking...', className: 'text-teal-400 animate-pulse' },
  [AssistantStatus.ERROR]: { text: 'Error occurred. Please restart.', className: 'text-red-500' },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, className } = statusMap[status];

  return (
    <div className="h-10 text-center">
      <p className={`text-2xl font-semibold transition-all duration-300 ${className}`}>
        {text}
      </p>
    </div>
  );
};

export default StatusIndicator;
