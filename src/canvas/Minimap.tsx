import React, { useRef, useEffect } from 'react';
import { PlanElement, Point2D, ThemeMode } from '../models/types';

interface MinimapProps {
  elements: PlanElement[];
  zoom: number;
  pan: Point2D;
  viewportWidth: number;
  viewportHeight: number;
  theme: ThemeMode;
  onPanTo: (newPan: Point2D) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  elements,
  zoom,
  pan,
  viewportWidth,
  viewportHeight,
  theme,
  onPanTo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';
  const mapWidth = 140;
  const mapHeight = 90;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // Draw background
    ctx.fillStyle = isDark ? '#090d16' : '#f1f5f9';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    // Calculate bounds of elements
    let minX = -100, maxX = 600, minY = -100, maxY = 500;
    if (elements.length > 0) {
      minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
      elements.forEach((el) => {
        if (el.type === 'wall' || el.type === 'curve_wall') {
          minX = Math.min(minX, el.start.x, el.end.x);
          maxX = Math.max(maxX, el.start.x, el.end.x);
          minY = Math.min(minY, el.start.y, el.end.y);
          maxY = Math.max(maxY, el.start.y, el.end.y);
        } else if ('x' in el && 'y' in el) {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          const w = 'width' in el ? el.width : 24;
          const h = 'height' in el ? el.height : 24;
          maxX = Math.max(maxX, el.x + w);
          maxY = Math.max(maxY, el.y + h);
        }
      });
    }

    const padding = 60;
    minX -= padding; maxX += padding;
    minY -= padding; maxY += padding;

    const spanX = Math.max(100, maxX - minX);
    const spanY = Math.max(100, maxY - minY);

    const scaleX = mapWidth / spanX;
    const scaleY = mapHeight / spanY;
    const miniScale = Math.min(scaleX, scaleY);

    const toMiniX = (x: number) => (x - minX) * miniScale + (mapWidth - spanX * miniScale) / 2;
    const toMiniY = (y: number) => (y - minY) * miniScale + (mapHeight - spanY * miniScale) / 2;

    // Draw elements
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 1.2;

    elements.forEach((el) => {
      if (el.hidden) return;
      if (el.type === 'wall' || el.type === 'curve_wall') {
        ctx.beginPath();
        ctx.moveTo(toMiniX(el.start.x), toMiniY(el.start.y));
        ctx.lineTo(toMiniX(el.end.x), toMiniY(el.end.y));
        ctx.stroke();
      } else if (el.type === 'box' || el.type === 'furniture' || el.type === 'plot') {
        const mx = toMiniX(el.x);
        const my = toMiniY(el.y);
        const mw = el.width * miniScale;
        const mh = el.height * miniScale;
        ctx.fillStyle = el.type === 'plot' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.15)';
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeRect(mx, my, mw, mh);
      }
    });

    // Draw camera viewport box
    const viewLeftInches = -pan.x / zoom;
    const viewTopInches = -pan.y / zoom;
    const viewWidthInches = viewportWidth / zoom;
    const viewHeightInches = viewportHeight / zoom;

    const vpX = toMiniX(viewLeftInches);
    const vpY = toMiniY(viewTopInches);
    const vpW = viewWidthInches * miniScale;
    const vpH = viewHeightInches * miniScale;

    ctx.strokeStyle = '#f59e0b'; // amber viewport
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.fillRect(vpX, vpY, vpW, vpH);
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }, [elements, zoom, pan, viewportWidth, viewportHeight, isDark]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click in minimap to world coordinate inches
    let minX = -100, maxX = 600, minY = -100, maxY = 500;
    if (elements.length > 0) {
      minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
      elements.forEach((el) => {
        if (el.type === 'wall' || el.type === 'curve_wall') {
          minX = Math.min(minX, el.start.x, el.end.x);
          maxX = Math.max(maxX, el.start.x, el.end.x);
          minY = Math.min(minY, el.start.y, el.end.y);
          maxY = Math.max(maxY, el.start.y, el.end.y);
        } else if ('x' in el && 'y' in el) {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          const w = 'width' in el ? el.width : 24;
          const h = 'height' in el ? el.height : 24;
          maxX = Math.max(maxX, el.x + w);
          maxY = Math.max(maxY, el.y + h);
        }
      });
    }

    const padding = 60;
    minX -= padding; maxX += padding;
    minY -= padding; maxY += padding;

    const spanX = Math.max(100, maxX - minX);
    const spanY = Math.max(100, maxY - minY);
    const miniScale = Math.min(mapWidth / spanX, mapHeight / spanY);

    const worldX = (clickX - (mapWidth - spanX * miniScale) / 2) / miniScale + minX;
    const worldY = (clickY - (mapHeight - spanY * miniScale) / 2) / miniScale + minY;

    // Center camera on this world coordinate
    const targetPanX = viewportWidth / 2 - worldX * zoom;
    const targetPanY = viewportHeight / 2 - worldY * zoom;

    onPanTo({ x: targetPanX, y: targetPanY });
  };

  return (
    <div
      className="hidden sm:block absolute bottom-6 right-6 z-30 rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900/90 backdrop-blur-md select-none group"
      title="Minimap: Click karke plan par navigate karein"
    >
      <div className="px-2 py-0.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-[9px] font-bold text-slate-400">
        <span>MINIMAP</span>
      </div>
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
        onClick={handleMinimapClick}
        className="cursor-pointer block"
      />
    </div>
  );
};
