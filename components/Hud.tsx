import React, { useRef, useEffect } from 'react';

interface HudProps {
  isListening: boolean;
  isInitializing: boolean;
  liveTranscription: string;
  activatingModule: string | null;
  analyser: AnalyserNode | null;
}

const HudStatus: React.FC<{ status: string; color: string }> = ({ status, color }) => (
  <div className="flex items-center">
    <span 
        className="w-2 h-2 rounded-full mr-2 inline-block" 
        style={{ 
            backgroundColor: color, 
            animation: status === 'LISTENING' ? 'pulse 1.5s infinite' : 'none' 
        }}>
    </span>
    <span>{status}</span>
  </div>
);

export const Hud: React.FC<HudProps> = ({ isListening, isInitializing, liveTranscription, activatingModule, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  const isVisible = isListening || isInitializing || !!activatingModule;

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    let mounted = true;

    const draw = () => {
      if (!mounted) return;
      animationFrameId.current = requestAnimationFrame(draw);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;
        canvasCtx.fillStyle = `rgba(0, 255, 255, ${barHeight / 150})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      mounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyser]);
  
  const getStatus = () => {
    if (isInitializing) return { text: 'INITIALIZING', color: '#ffc107' };
    if (isListening) return { text: 'LISTENING', color: '#f44336' };
    if (activatingModule) return { text: 'PROCESSING CMD', color: '#00ffff' };
    return { text: 'STANDBY', color: '#607d8b' };
  };
  
  const status = getStatus();

  const hudClasses = `
    fixed bottom-4 left-4 right-4 sm:right-auto sm:w-[350px]
    bg-slate-900/80 border border-slate-700 text-slate-400
    p-3 font-mono text-sm z-[100]
    backdrop-blur-sm transition-all duration-300 ease-in-out
    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
  `;

  return (
    <div className={hudClasses} style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
      <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-2 font-bold text-cyan-400 uppercase tracking-widest text-xs">
        <span>Voice Interface</span>
        <HudStatus status={status.text} color={status.color} />
      </div>
      <div className="text-xs min-h-[3em]">
        {activatingModule && (
            <p className="text-amber-400 animate-pulse">
                &gt; Activating Power Module: <span className="font-bold">{activatingModule}</span>
            </p>
        )}
        {!activatingModule && (
            <p className="text-slate-300">
                &gt; {liveTranscription}<span className="animate-pulse">_</span>
            </p>
        )}
      </div>
      <div className="mt-2 h-[50px] w-full">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>
    </div>
  );
};