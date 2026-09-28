import React from 'react';
import { Group, Circle, Text, Line } from 'react-konva';
import { CircleElement, UnitSystem, ThemeMode } from '../models/types';
import { formatLength, formatArea } from '../utils/units';
import { calculateCircleArea } from '../utils/geometry';
import { useDraggableObject } from './interaction/useDraggableObject';

interface CircleRendererProps {
  circle: CircleElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions: boolean;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<CircleElement>) => void;
}

export const CircleRenderer: React.FC<CircleRendererProps> = ({
  circle,
  isSelected,
  unitSystem,
  theme,
  showDimensions,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const defaultFill = isDark ? 'rgba(168, 85, 247, 0.05)' : 'rgba(168, 85, 247, 0.04)';
  const defaultStroke = isDark ? '#a855f7' : '#9333ea';
  const selectedStroke = '#38bdf8';

  const area = calculateCircleArea(circle.radius);

  const dragHandlers = useDraggableObject({
    element: circle,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  return (
    <Group
      id={circle.id}
      x={circle.x}
      y={circle.y}
      {...dragHandlers}
    >
      {/* Circle shape */}
      <Circle
        radius={circle.radius}
        fill={circle.fillColor || defaultFill}
        stroke={isSelected ? selectedStroke : circle.strokeColor || defaultStroke}
        strokeWidth={isSelected ? 2 : circle.strokeWidth || 1.5}
        dash={isSelected ? undefined : [4, 4]}
        shadowColor={isSelected ? selectedStroke : 'transparent'}
        shadowBlur={isSelected ? 8 : 0}
      />

      {/* Center crosshair */}
      <Line points={[-4, 0, 4, 0]} stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth={1} />
      <Line points={[0, -4, 0, 4]} stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth={1} />

      {/* Center Label & Area */}
      <Group y={-6}>
        {circle.label && (
          <Text
            text={circle.label}
            fontSize={12}
            fontStyle="bold"
            fontFamily="system-ui, sans-serif"
            fill={isSelected ? '#38bdf8' : isDark ? '#f1f5f9' : '#1e293b'}
            align="center"
            offsetX={circle.label.length * 3.5}
            offsetY={12}
          />
        )}
        <Text
          text={`${formatArea(area, unitSystem)}`}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          fill={isDark ? '#94a3b8' : '#64748b'}
          align="center"
          offsetX={24}
          offsetY={circle.label ? -2 : 0}
        />
      </Group>

      {/* Radius dimension leader */}
      {showDimensions && (
        <Group>
          <Line
            points={[0, 0, circle.radius * 0.707, circle.radius * 0.707]}
            stroke={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b'}
            strokeWidth={1}
            dash={[3, 3]}
          />
          <Text
            x={circle.radius * 0.35}
            y={circle.radius * 0.35 - 12}
            text={`R: ${formatLength(circle.radius, unitSystem)}`}
            fontSize={10}
            fontStyle="bold"
            fontFamily="monospace"
            fill={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b'}
          />
        </Group>
      )}
    </Group>
  );
};
