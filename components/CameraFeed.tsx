
import React, { useRef, useEffect } from 'react';

interface CameraFeedProps {
  stream: MediaStream | null;
  isCameraOn: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ stream, isCameraOn }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return (
    <div 
      className={`absolute top-24 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-cyan-500/50 transition-all duration-500 ease-in-out ${isCameraOn ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
    >
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 z-10"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 z-10"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 z-10"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 z-10"></div>
      
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="w-full h-full object-cover transform -scale-x-100 opacity-80" // Flip for mirror effect and slight transparent tech feel
      />
       <div className="absolute inset-0 bg-cyan-900/10 pointer-events-none"></div>
    </div>
  );
};

export default CameraFeed;
