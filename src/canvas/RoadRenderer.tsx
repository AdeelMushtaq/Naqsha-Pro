import React from 'react';
import { Group, Line, Rect, Text, Circle } from 'react-konva';
import { RoadElement, UnitSystem, ThemeMode } from '../models/types';
import { formatLength } from '../utils/units';

interface RoadRendererProps {
  road: RoadElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<RoadElement>) => void;
}

export const RoadRenderer: React.FC<RoadRendererProps> = ({
  road,
  isSelected,
  unitSystem,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const { start, end, width, hasFootpath = true, footpathWidth = 36, name } = road;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;

  const nx = -dy / len;
  const ny = dx / len;

  const halfW = width / 2;
  const fpW = hasFootpath ? footpathWidth : 0;
  const totalHalfW = halfW + fpW;

  // Road pavement 4 corners
  const p1 = { x: start.x + nx * halfW, y: start.y + ny * halfW };
  const p2 = { x: end.x + nx * halfW, y: end.y + ny * halfW };
  const p3 = { x: end.x - nx * halfW, y: end.y - ny * halfW };
  const p4 = { x: start.x - nx * halfW, y: start.y - ny * halfW };

  // Footpath polygons
  const fpL1 = { x: start.x + nx * totalHalfW, y: start.y + ny * totalHalfW };
  const fpL2 = { x: end.x + nx * totalHalfW, y: end.y + ny * totalHalfW };
  const fpR1 = { x: start.x - nx * totalHalfW, y: start.y - ny * totalHalfW };
  const fpR2 = { x: end.x - nx * totalHalfW, y: end.y - ny * totalHalfW };

  const roadColor = isDark ? '#1e293b' : '#cbd5e1';
  const footpathColor = isDark ? '#334155' : '#e2e8f0';
  const centerLineColor = '#fbbf24';

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <Group id={road.id} onClick={onSelect} onTap={onSelect}>
      {/* Footpath Left */}
      {hasFootpath && (
        <Line
          points={[p1.x, p1.y, p2.x, p2.y, fpL2.x, fpL2.y, fpL1.x, fpL1.y]}
          closed
          fill={footpathColor}
          stroke={isDark ? '#475569' : '#94a3b8'}
          strokeWidth={1}
          opacity={0.7}
        />
      )}

      {/* Footpath Right */}
      {hasFootpath && (
        <Line
          points={[p4.x, p4.y, p3.x, p3.y, fpR2.x, fpR2.y, fpR1.x, fpR1.y]}
          closed
          fill={footpathColor}
          stroke={isDark ? '#475569' : '#94a3b8'}
          strokeWidth={1}
          opacity={0.7}
        />
      )}

      {/* Main Road Surface */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y]}
        closed
        fill={roadColor}
        stroke={isSelected ? '#06b6d4' : isDark ? '#475569' : '#94a3b8'}
        strokeWidth={isSelected ? 2.5 : 1.5}
        opacity={0.9}
      />

      {/* Road Centerline */}
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={centerLineColor}
        strokeWidth={1.5}
        dash={[16, 12]}
        opacity={0.8}
      />

      {/* Road Name and Width Tag */}
      <Group x={midX} y={midY} rotation={angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg}>
        <Rect
          x={-60}
          y={-10}
          width={120}
          height={20}
          fill="rgba(15, 23, 42, 0.85)"
          stroke={isSelected ? '#06b6d4' : '#475569'}
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          x={-56}
          y={-5}
          width={112}
          align="center"
          text={`${name || 'Road'} (${formatLength(width, unitSystem)})`}
          fontSize={8.5}
          fontStyle="bold"
          fill="#38bdf8"
          ellipsis
        />
      </Group>

      {/* Selection handles for adjusting road endpoints */}
      {isSelected && (
        <>
          <Circle
            x={start.x}
            y={start.y}
            radius={6}
            fill="#06b6d4"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              onChange({ start: { x: e.target.x(), y: e.target.y() } });
            }}
          />
          <Circle
            x={end.x}
            y={end.y}
            radius={6}
            fill="#06b6d4"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              onChange({ end: { x: e.target.x(), y: e.target.y() } });
            }}
          />
        </>
      )}
    </Group>
  );
};
