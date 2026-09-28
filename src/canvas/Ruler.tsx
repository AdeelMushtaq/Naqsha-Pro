import React, { useRef, useEffect, useState } from 'react';
import { UnitSystem, Point2D, ThemeMode, GuideLine } from '../models/types';

interface RulerProps {
  width: number;
  height: number;
  zoom: number;
  pan: Point2D;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  mousePos: Point2D | null;
  guides: GuideLine[];
  onAddGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
  onRemoveGuide: (id: string) => void;
}

export const Ruler: React.FC<RulerProps> = ({
  width,
  height,
  zoom,
  pan,
  unitSystem,
  theme,
  mousePos,
  guides,
  onAddGuide,
  onRemoveGuide,
}) => {
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  const rulerSize = 24; // pixels
  const [draggingGuide, setDraggingGuide] = useState<'horizontal' | 'vertical' | null>(null);

  // Draw Top Ruler
  useEffect(() => {
    const canvas = topCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, rulerSize);

    // Styling
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, width, rulerSize);
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerSize - 0.5);
    ctx.lineTo(width, rulerSize - 0.5);
    ctx.stroke();

    // Determine interval in inches based on zoom
    let stepInches = 12; // 1 foot
    if (zoom < 0.4) stepInches = 60; // 5 feet
    else if (zoom < 0.8) stepInches = 24; // 2 feet
    else if (zoom > 2.0) stepInches = 6; // 6 inches

    const startXInches = Math.floor((-pan.x / zoom) / stepInches) * stepInches;
    const endXInches = Math.ceil(((width - pan.x) / zoom) / stepInches) * stepInches;

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    for (let x = startXInches; x <= endXInches; x += stepInches) {
      const screenX = pan.x + x * zoom;
      if (screenX < 0 || screenX > width) continue;

      const isMajor = x % (stepInches * 2) === 0;
      const tickH = isMajor ? 12 : 7;

      ctx.beginPath();
      ctx.moveTo(screenX, rulerSize - tickH);
      ctx.lineTo(screenX, rulerSize);
      ctx.stroke();

      if (isMajor) {
        const text = unitSystem === 'ft' ? `${Math.round(x / 12)}'` : `${x}"`;
        ctx.fillText(text, screenX, rulerSize - 13);
      }
    }

    // Mouse position indicator line
    if (mousePos) {
      const mouseScreenX = pan.x + mousePos.x * zoom;
      if (mouseScreenX >= 0 && mouseScreenX <= width) {
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(mouseScreenX, 0);
        ctx.lineTo(mouseScreenX, rulerSize);
        ctx.stroke();
      }
    }
  }, [width, zoom, pan, unitSystem, isDark, mousePos]);

  // Draw Left Ruler
  useEffect(() => {
    const canvas = leftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, rulerSize, height);

    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, rulerSize, height);
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rulerSize - 0.5, 0);
    ctx.lineTo(rulerSize - 0.5, height);
    ctx.stroke();

    let stepInches = 12;
    if (zoom < 0.4) stepInches = 60;
    else if (zoom < 0.8) stepInches = 24;
    else if (zoom > 2.0) stepInches = 6;

    const startYInches = Math.floor((-pan.y / zoom) / stepInches) * stepInches;
    const endYInches = Math.ceil(((height - pan.y) / zoom) / stepInches) * stepInches;

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    for (let y = startYInches; y <= endYInches; y += stepInches) {
      const screenY = pan.y + y * zoom;
      if (screenY < 0 || screenY > height) continue;

      const isMajor = y % (stepInches * 2) === 0;
      const tickW = isMajor ? 12 : 7;

      ctx.beginPath();
      ctx.moveTo(rulerSize - tickW, screenY);
      ctx.lineTo(rulerSize, screenY);
      ctx.stroke();

      if (isMajor) {
        const text = unitSystem === 'ft' ? `${Math.round(y / 12)}'` : `${y}"`;
        ctx.save();
        ctx.translate(rulerSize - 13, screenY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 3);
        ctx.restore();
      }
    }

    if (mousePos) {
      const mouseScreenY = pan.y + mousePos.y * zoom;
      if (mouseScreenY >= 0 && mouseScreenY <= height) {
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, mouseScreenY);
        ctx.lineTo(rulerSize, mouseScreenY);
        ctx.stroke();
      }
    }
  }, [height, zoom, pan, unitSystem, isDark, mousePos]);

  return (
    <>
      {/* Top Ruler Bar */}
      <div
        className="absolute top-0 left-[24px] right-0 h-[24px] z-30 select-none cursor-ns-resize"
        onMouseDown={() => setDraggingGuide('horizontal')}
        title="Neechay drag karein horizontal guide line ke liye"
      >
        <canvas ref={topCanvasRef} width={width - 24} height={rulerSize} />
      </div>

      {/* Left Ruler Bar */}
      <div
        className="absolute top-[24px] left-0 bottom-0 w-[24px] z-30 select-none cursor-ew-resize"
        onMouseDown={() => setDraggingGuide('vertical')}
        title="Daayein drag karein vertical guide line ke liye"
      >
        <canvas ref={leftCanvasRef} width={rulerSize} height={height - 24} />
      </div>

      {/* Origin Corner */}
      <div className="absolute top-0 left-0 w-[24px] h-[24px] z-30 bg-slate-900 border-r border-b border-slate-800 flex items-center justify-center text-[9px] font-bold text-sky-400 select-none">
        {unitSystem === 'ft' ? "'" : '"'}
      </div>

      {/* Draggable Guide Lines Overlay */}
      {guides.map((g) => {
        if (g.orientation === 'horizontal') {
          const screenY = pan.y + g.position * zoom;
          if (screenY < 24 || screenY > height) return null;
          return (
            <div
              key={g.id}
              className="absolute left-[24px] right-0 h-[1px] bg-cyan-400/80 pointer-events-auto z-20 group cursor-ns-resize"
              style={{ top: `${screenY}px` }}
              onDoubleClick={() => onRemoveGuide(g.id)}
              title="Guide line (Double click to delete)"
            >
              <div className="absolute right-2 -top-4 text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800 opacity-0 group-hover:opacity-100 transition-opacity">
                {unitSystem === 'ft' ? `${Math.round(g.position / 12)}'` : `${g.position}"`}
              </div>
            </div>
          );
        } else {
          const screenX = pan.x + g.position * zoom;
          if (screenX < 24 || screenX > width) return null;
          return (
            <div
              key={g.id}
              className="absolute top-[24px] bottom-0 w-[1px] bg-cyan-400/80 pointer-events-auto z-20 group cursor-ew-resize"
              style={{ left: `${screenX}px` }}
              onDoubleClick={() => onRemoveGuide(g.id)}
              title="Guide line (Double click to delete)"
            >
              <div className="absolute top-2 -left-6 text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800 opacity-0 group-hover:opacity-100 transition-opacity">
                {unitSystem === 'ft' ? `${Math.round(g.position / 12)}'` : `${g.position}"`}
              </div>
            </div>
          );
        }
      })}
    </>
  );
};
