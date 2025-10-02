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
    <span className="hud-status-dot" style={{ backgroundColor: color, animation: status === 'LISTENING' ? 'pulse 1s infinite' : 'none' }}></span>
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

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    canvas.width = 300;
    canvas.height = 50;

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;

        canvasCtx.fillStyle = `rgba(0, 255, 255, ${barHeight / 100})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
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

  return (
    <div className={`hud ${isVisible ? 'visible' : ''}`}>
      <div className="hud-header">
        <span>VOICE INTERFACE</span>
        <HudStatus status={status.text} color={status.color} />
      </div>
      <div className="text-sm min-h-[4em]">
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
      <div className="mt-2 h-[50px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};
