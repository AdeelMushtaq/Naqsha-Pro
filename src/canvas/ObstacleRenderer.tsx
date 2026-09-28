import React from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import { ObstacleElement, UnitSystem, ThemeMode } from '../models/types';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';

interface ObstacleRendererProps {
  obstacle: ObstacleElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<ObstacleElement>) => void;
}

export const ObstacleRenderer: React.FC<ObstacleRendererProps> = ({
  obstacle,
  isSelected,
  unitSystem,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const { obstacleType, width, height, height3d, elevation, isOverhead, label } = obstacle;

  const dragHandlers = useDraggableObject({
    element: obstacle,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  const isWireOrBeam = obstacleType === 'hanging_wire' || obstacleType === 'arch_beam';
  const isTree = obstacleType === 'tree';
  const isPole = obstacleType === 'pole';

  let fillColor = obstacle.fillColor;
  let strokeColor = isSelected ? '#38bdf8' : '#ef4444';

  if (!fillColor) {
    if (isWireOrBeam || isOverhead) {
      fillColor = 'rgba(239, 68, 68, 0.08)';
      strokeColor = isSelected ? '#38bdf8' : '#f59e0b';
    } else if (isTree) {
      fillColor = 'rgba(34, 197, 94, 0.2)';
      strokeColor = '#22c55e';
    } else if (isPole) {
      fillColor = '#64748b';
      strokeColor = '#cbd5e1';
    } else {
      fillColor = 'rgba(239, 68, 68, 0.15)';
    }
  }

  const elevationText = elevation ? ` | El: ${formatLength(elevation, unitSystem)}` : '';
  const heightText = `H: ${formatLength(height3d, unitSystem)}${elevationText}`;

  return (
    <Group
      id={obstacle.id}
      x={obstacle.x}
      y={obstacle.y}
      rotation={obstacle.rotation || 0}
      {...dragHandlers}
    >
      {/* Visual Footprint */}
      {isTree ? (
        <Group>
          <Circle
            x={0}
            y={0}
            radius={width / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
          <Circle x={0} y={0} radius={6} fill="#15803d" />
        </Group>
      ) : isPole ? (
        <Group>
          <Circle
            x={0}
            y={0}
            radius={width / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
          <Line points={[-width / 2, 0, width / 2, 0]} stroke="#ffffff" strokeWidth={1} />
          <Line points={[0, -height / 2, 0, height / 2]} stroke="#ffffff" strokeWidth={1} />
        </Group>
      ) : (
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1.5}
          dash={isWireOrBeam || isOverhead ? [6, 4] : undefined}
          cornerRadius={obstacleType === 'parked_car' ? 6 : 2}
        />
      )}

      {/* Label and Height Chip */}
      <Group y={-height / 2 - 14}>
        <Rect
          x={-45}
          y={-6}
          width={90}
          height={14}
          fill="rgba(15, 23, 42, 0.85)"
          stroke={isSelected ? '#38bdf8' : '#475569'}
          strokeWidth={1}
          cornerRadius={3}
        />
        <Text
          x={-43}
          y={-4}
          width={86}
          align="center"
          text={`${label || obstacleType}: ${heightText}`}
          fontSize={7.5}
          fontStyle="bold"
          fill={isOverhead ? '#f59e0b' : '#f87171'}
          ellipsis
        />
      </Group>
    </Group>
  );
};
