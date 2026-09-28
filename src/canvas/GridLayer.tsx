import React from 'react';
import { Layer, Line, Rect } from 'react-konva';
import { ThemeMode } from '../models/types';

interface GridLayerProps {
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  gridSize: number; // inches (default 12" = 1 ft)
  showGrid: boolean;
  theme: ThemeMode;
}

export const GridLayer: React.FC<GridLayerProps> = ({
  width,
  height,
  zoom,
  pan,
  gridSize = 12,
  showGrid,
  theme,
}) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f172a' : '#f8fafc';
  const majorColor = isDark ? '#334155' : '#cbd5e1';
  const minorColor = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#38bdf8' : '#0284c7';

  // Calculate visible bounds in world coordinates (inches)
  const startX = Math.floor((-pan.x / zoom) / gridSize) * gridSize - gridSize * 2;
  const endX = Math.ceil(((width - pan.x) / zoom) / gridSize) * gridSize + gridSize * 2;
  const startY = Math.floor((-pan.y / zoom) / gridSize) * gridSize - gridSize * 2;
  const endY = Math.ceil(((height - pan.y) / zoom) / gridSize) * gridSize + gridSize * 2;

  const lines: React.ReactNode[] = [];

  if (showGrid) {
    // If zoomed in enough (zoom > 1.2), render minor sub-grid (e.g. 3" or 1")
    const showMinor = zoom >= 1.5;
    const minorStep = 3; // 3 inches

    if (showMinor) {
      for (let x = startX; x <= endX; x += minorStep) {
        if (x % gridSize === 0) continue; // Major grid handles this
        lines.push(
          <Line
            key={`minor-v-${x}`}
            points={[x, startY, x, endY]}
            stroke={minorColor}
            strokeWidth={0.5 / zoom}
            listening={false}
          />
        );
      }
      for (let y = startY; y <= endY; y += minorStep) {
        if (y % gridSize === 0) continue;
        lines.push(
          <Line
            key={`minor-h-${y}`}
            points={[startX, y, endX, y]}
            stroke={minorColor}
            strokeWidth={0.5 / zoom}
            listening={false}
          />
        );
      }
    }

    // Major 1-foot grid lines
    for (let x = startX; x <= endX; x += gridSize) {
      const isOrigin = Math.abs(x) < 0.1;
      lines.push(
        <Line
          key={`major-v-${x}`}
          points={[x, startY, x, endY]}
          stroke={isOrigin ? axisColor : majorColor}
          strokeWidth={(isOrigin ? 1.5 : 0.8) / zoom}
          opacity={isOrigin ? 0.6 : 0.4}
          listening={false}
        />
      );
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const isOrigin = Math.abs(y) < 0.1;
      lines.push(
        <Line
          key={`major-h-${y}`}
          points={[startX, y, endX, y]}
          stroke={isOrigin ? axisColor : majorColor}
          strokeWidth={(isOrigin ? 1.5 : 0.8) / zoom}
          opacity={isOrigin ? 0.6 : 0.4}
          listening={false}
        />
      );
    }
  }

  return (
    <Layer listening={false}>
      {/* Background fill */}
      <Rect
        x={-pan.x / zoom - 200}
        y={-pan.y / zoom - 200}
        width={width / zoom + 400}
        height={height / zoom + 400}
        fill={bgColor}
      />
      {lines}
    </Layer>
  );
};
