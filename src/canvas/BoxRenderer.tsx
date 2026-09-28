import React, { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { BoxElement, UnitSystem, ThemeMode } from '../models/types';
import { formatLength, formatArea } from '../utils/units';
import { calculateBoxArea } from '../utils/geometry';
import { useDraggableObject } from './interaction/useDraggableObject';

interface BoxRendererProps {
  box: BoxElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions: boolean;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<BoxElement>) => void;
}

export const BoxRenderer: React.FC<BoxRendererProps> = ({
  box,
  isSelected,
  unitSystem,
  theme,
  showDimensions,
  onSelect,
  onChange,
}) => {
  const shapeRef = useRef<Konva.Group>(null);
  const isDark = theme === 'dark';

  const defaultFill = isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(14, 165, 233, 0.04)';
  const defaultStroke = isDark ? '#475569' : '#94a3b8';
  const selectedStroke = '#38bdf8';

  const area = calculateBoxArea(box.width, box.height);

  const dragHandlers = useDraggableObject({
    element: box,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  return (
    <Group
      ref={shapeRef}
      id={box.id}
      x={box.x}
      y={box.y}
      rotation={box.rotation || 0}
      {...dragHandlers}
    >
      {/* Box rectangle */}
      <Rect
        width={box.width}
        height={box.height}
        fill={box.fillColor || defaultFill}
        stroke={isSelected ? selectedStroke : box.strokeColor || defaultStroke}
        strokeWidth={isSelected ? 2 : box.strokeWidth || 1}
        dash={isSelected ? undefined : [6, 3]}
        shadowColor={isSelected ? selectedStroke : 'transparent'}
        shadowBlur={isSelected ? 8 : 0}
        cornerRadius={2}
      />

      {/* Center Label & Area */}
      <Group x={box.width / 2} y={box.height / 2}>
        {box.label && (
          <Text
            text={box.label}
            fontSize={12}
            fontStyle="bold"
            fontFamily="system-ui, sans-serif"
            fill={isSelected ? '#38bdf8' : isDark ? '#f1f5f9' : '#1e293b'}
            align="center"
            offsetX={box.label.length * 3.5}
            offsetY={16}
          />
        )}
        <Text
          text={`${formatArea(area, unitSystem)}`}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          fill={isDark ? '#94a3b8' : '#64748b'}
          align="center"
          offsetX={24}
          offsetY={box.label ? -2 : 5}
        />
      </Group>

      {/* Dimension labels along top and left edge */}
      {showDimensions && (
        <>
          <Text
            x={box.width / 2}
            y={-14}
            text={formatLength(box.width, unitSystem)}
            fontSize={10}
            fontStyle="bold"
            fontFamily="monospace"
            fill={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b'}
            align="center"
            offsetX={16}
          />
          <Text
            x={-14}
            y={box.height / 2}
            rotation={-90}
            text={formatLength(box.height, unitSystem)}
            fontSize={10}
            fontStyle="bold"
            fontFamily="monospace"
            fill={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b'}
            align="center"
            offsetX={16}
          />
        </>
      )}
    </Group>
  );
};
