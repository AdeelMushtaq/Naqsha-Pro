import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { PlotElement, UnitSystem, AreaUnit, ThemeMode } from '../models/types';
import { formatLength, formatAreaWithUnit } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';

interface PlotRendererProps {
  element: PlotElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  areaUnit: AreaUnit;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<PlotElement>) => void;
}

export const PlotRenderer: React.FC<PlotRendererProps> = ({
  element,
  isSelected,
  unitSystem,
  areaUnit,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const strokeColor = isSelected ? '#38bdf8' : '#eab308'; // Amber/yellow for cadastral plot boundary
  const fillColor = isDark ? 'rgba(234, 179, 8, 0.02)' : 'rgba(234, 179, 8, 0.03)';

  const { x, y, width, height, locked, label } = element;
  const areaSqInches = width * height;

  const dragHandlers = useDraggableObject({
    element,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  return (
    <Group
      id={element.id}
      x={x}
      y={y}
      {...dragHandlers}
    >
      {/* Plot Boundary Rectangle */}
      <Rect
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.8}
        dash={[12, 6, 3, 6]} // Standard boundary cadastral dash-dot
      />

      {/* Corner crosshairs */}
      {[
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ].map(([cx, cy], i) => (
        <Group key={i} x={cx} y={cy}>
          <Circle radius={3} fill={strokeColor} />
          <Line points={[-6, 0, 6, 0]} stroke={strokeColor} strokeWidth={1} />
          <Line points={[0, -6, 0, 6]} stroke={strokeColor} strokeWidth={1} />
        </Group>
      ))}

      {/* Plot Info Badge */}
      <Group x={16} y={16}>
        <Rect
          width={180}
          height={48}
          fill={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)'}
          stroke={strokeColor}
          strokeWidth={1}
          cornerRadius={6}
        />
        <Text
          x={10}
          y={8}
          text={label || 'PLOT BOUNDARY'}
          fontSize={11}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          fill={strokeColor}
        />
        <Text
          x={10}
          y={22}
          text={`${formatLength(width, unitSystem)} × ${formatLength(height, unitSystem)}`}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          fill={isDark ? '#cbd5e1' : '#475569'}
        />
        <Text
          x={10}
          y={34}
          text={formatAreaWithUnit(areaSqInches, areaUnit)}
          fontSize={10}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          fill={isDark ? '#f8fafc' : '#0f172a'}
        />
      </Group>

      {locked && (
        <Group x={width - 16} y={16}>
          <Circle radius={6} fill="#f59e0b" />
          <Text text="🔒" fontSize={8} x={-4} y={-5} />
        </Group>
      )}
    </Group>
  );
};
