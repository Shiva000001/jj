
import React, { useRef, useEffect } from 'react';
import { Emotion } from '../types';

interface VisualizerProps {
  analyserNode: AnalyserNode | null;
  emotion: Emotion;
}

// Jarvis-themed colors: primarily variations of cyan, blue, and white
const emotionParticleColors: Record<Emotion, [number, number, number]> = {
  [Emotion.NEUTRAL]: [34, 211, 238], // cyan-400
  [Emotion.HAPPY]: [125, 211, 252], // sky-300
  [Emotion.SARCASTIC]: [96, 165, 250], // blue-400
  [Emotion.WITTY]: [56, 189, 248], // sky-400
  [Emotion.HELPFUL]: [45, 212, 191], // teal-400
  [Emotion.THINKING]: [165, 243, 252], // cyan-200
};

const Visualizer: React.FC<VisualizerProps> = ({ analyserNode, emotion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const currentColor = useRef<[number, number, number]>([...emotionParticleColors.NEUTRAL]);
  const targetColor = useRef<[number, number, number]>([...emotionParticleColors.NEUTRAL]);

  useEffect(() => {
    targetColor.current = emotionParticleColors[emotion] || emotionParticleColors.NEUTRAL;
  }, [emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Increased particle count for high-tech look
    const NUM_PARTICLES = 3000;
    const RADIUS = 140;
    const particles: any[] = [];

    for (let i = 0; i < NUM_PARTICLES; i++) {
        const phi = Math.acos(-1 + (2 * i) / NUM_PARTICLES);
        const theta = Math.sqrt(NUM_PARTICLES * Math.PI) * phi;
        const x = RADIUS * Math.cos(theta) * Math.sin(phi);
        const y = RADIUS * Math.sin(theta) * Math.sin(phi);
        const z = RADIUS * Math.cos(phi);
        // Add random speed factors for dynamic tech feel
        particles.push({ x, y, z, ox: x, oy: y, oz: z, speed: 0.5 + Math.random() });
    }

    let rotation = 0;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 0;
    const dataArray = analyserNode ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const resizeCanvas = () => {
        const { devicePixelRatio = 1 } = window;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      
      // Composite operation for glow effect
      ctx.globalCompositeOperation = 'screen';

      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      const lerp = (start: number, end: number, amount: number) => start * (1 - amount) + end * amount;
      currentColor.current[0] = lerp(currentColor.current[0], targetColor.current[0], 0.05);
      currentColor.current[1] = lerp(currentColor.current[1], targetColor.current[1], 0.05);
      currentColor.current[2] = lerp(currentColor.current[2], targetColor.current[2], 0.05);
      
      rotation += 0.002;

      particles.forEach((p, i) => {
        const rotX = p.ox * Math.cos(rotation * p.speed) - p.oz * Math.sin(rotation * p.speed);
        const rotZ = p.ox * Math.sin(rotation * p.speed) + p.oz * Math.cos(rotation * p.speed);
        p.x = rotX;
        p.z = rotZ;

        let displacement = 0;
        if (analyserNode) {
            // Map particle index to frequency bin
            const k = Math.floor((i / NUM_PARTICLES) * bufferLength);
            // More aggressive displacement for visualization
            displacement = Math.pow(dataArray[k] / 255, 4) * 50;
        }

        const currentRadius = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (currentRadius > 0) {
            const ratio = (RADIUS + displacement) / currentRadius;
            p.x *= ratio;
            p.y *= ratio;
            p.z *= ratio;
        }

        const FOCAL_LENGTH = 400;
        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + p.z);
        const projX = p.x * scale + width / 2;
        const projY = p.y * scale + height / 2;
        
        // Smaller, sharper particles
        const size = Math.max(0.1, scale * 1.0);
        const alpha = Math.max(0.05, Math.min(0.8, scale * 0.8));

        const [r, g, b] = currentColor.current;

        ctx.beginPath();
        ctx.arc(projX, projY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
        ctx.fill();
        
        // Connecting lines for low distance particles (wireframe effect)
        if (analyserNode && i % 50 === 0) {
            // Occasional connections
             ctx.strokeStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha * 0.2})`;
             ctx.lineWidth = 0.5;
             ctx.beginPath();
             ctx.moveTo(width/2, height/2);
             ctx.lineTo(projX, projY);
             ctx.stroke();
        }
      });
      
      ctx.globalCompositeOperation = 'source-over';
    };
    
    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [analyserNode]);


  return (
    <div className={`absolute inset-0 w-full h-full`}>
        <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default Visualizer;
