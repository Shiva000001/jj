import React, { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcript: { speaker: 'user' | 'model', text: string }[];
  interimText: string | null;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript, interimText }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  return (
    <div className="absolute top-4 left-4 text-left text-base max-w-sm w-full bg-black/40 p-4 rounded-lg backdrop-blur-sm max-h-64 overflow-y-auto font-sans shadow-lg">
      <div className="space-y-2">
        {transcript.map((entry, index) => (
          <p key={index} className={entry.speaker === 'user' ? 'text-gray-300' : 'text-cyan-300'}>
            <span className="font-bold capitalize">{entry.speaker}: </span>
            {entry.text}
          </p>
        ))}
        {interimText && <p className="text-gray-400 opacity-80">{interimText}</p>}
      </div>
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TranscriptDisplay;
