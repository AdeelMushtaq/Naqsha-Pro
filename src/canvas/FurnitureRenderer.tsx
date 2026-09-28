import React from 'react';
import { Group, Rect, Circle, Line, Text, Shape } from 'react-konva';
import { FurnitureElement, UnitSystem, ThemeMode } from '../models/types';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';

interface FurnitureRendererProps {
  element: FurnitureElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<FurnitureElement>) => void;
}

export const FurnitureRenderer: React.FC<FurnitureRendererProps> = ({
  element,
  isSelected,
  unitSystem,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const selectedStroke = '#38bdf8';
  const defaultStroke = isDark ? '#64748b' : '#475569';
  const strokeColor = isSelected ? selectedStroke : element.strokeColor || defaultStroke;
  const fillColor = element.fillColor || (isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(14, 165, 233, 0.04)');

  const { width, height, category, locked } = element;

  const dragHandlers = useDraggableObject({
    element,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      {...dragHandlers}
    >
      {/* Base bounding frame */}
      <Rect
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.2}
        cornerRadius={category === 'sofa' || category === 'bed' ? 4 : 2}
        dash={category === 'beam' ? [6, 4] : undefined}
      />

      {/* Category-specific CAD symbols */}
      {category === 'bed' && (
        <Group>
          {/* Headboard */}
          <Rect x={2} y={2} width={width - 4} height={8} fill={strokeColor} opacity={0.3} />
          {/* Pillows */}
          {width >= 48 ? (
            <>
              <Rect x={6} y={14} width={width / 2 - 10} height={16} stroke={strokeColor} strokeWidth={1} cornerRadius={2} />
              <Rect x={width / 2 + 4} y={14} width={width / 2 - 10} height={16} stroke={strokeColor} strokeWidth={1} cornerRadius={2} />
            </>
          ) : (
            <Rect x={6} y={14} width={width - 12} height={16} stroke={strokeColor} strokeWidth={1} cornerRadius={2} />
          )}
          {/* Blanket fold line */}
          <Line points={[4, height * 0.45, width - 4, height * 0.45]} stroke={strokeColor} strokeWidth={1} dash={[3, 3]} />
        </Group>
      )}

      {category === 'sofa' && (
        <Group>
          {/* Backrest cushion */}
          <Rect x={0} y={0} width={width} height={10} fill={strokeColor} opacity={0.25} />
          {/* Armrests */}
          <Rect x={0} y={10} width={8} height={height - 10} fill={strokeColor} opacity={0.2} />
          <Rect x={width - 8} y={10} width={8} height={height - 10} fill={strokeColor} opacity={0.2} />
          {/* Seat division */}
          {width > 48 && (
            <Line points={[width / 2, 10, width / 2, height]} stroke={strokeColor} strokeWidth={1} />
          )}
        </Group>
      )}

      {category === 'stairs' && (
        <Group>
          {/* Step treads */}
          {(() => {
            const treads: React.ReactNode[] = [];
            const stepCount = 10;
            const stepH = height / stepCount;
            for (let i = 1; i < stepCount; i++) {
              treads.push(
                <Line
                  key={`step-${i}`}
                  points={[0, i * stepH, width, i * stepH]}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              );
            }
            return treads;
          })()}
          {/* Directional arrow */}
          <Line
            points={[width / 2, height - 10, width / 2, 20]}
            stroke="#f59e0b"
            strokeWidth={2}
          />
          <Line
            points={[width / 2 - 6, 28, width / 2, 18, width / 2 + 6, 28]}
            stroke="#f59e0b"
            strokeWidth={2}
          />
        </Group>
      )}

      {category === 'bath' && (
        <Group>
          {width <= 24 ? (
            // Commode
            <>
              <Rect x={width * 0.15} y={2} width={width * 0.7} height={8} stroke={strokeColor} strokeWidth={1.2} />
              <Circle x={width / 2} y={height * 0.6} radius={Math.min(width, height) * 0.35} stroke={strokeColor} strokeWidth={1.2} />
            </>
          ) : (
            // Basin / Shower
            <>
              <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.35} stroke={strokeColor} strokeWidth={1.2} />
              <Circle x={width / 2} y={height / 2} radius={2} fill={strokeColor} />
            </>
          )}
        </Group>
      )}

      {category === 'column' && (
        <Group>
          {/* Hatch cross */}
          <Line points={[0, 0, width, height]} stroke={strokeColor} strokeWidth={1.2} />
          <Line points={[0, height, width, 0]} stroke={strokeColor} strokeWidth={1.2} />
        </Group>
      )}

      {/* Label in center */}
      {element.label && (
        <Text
          x={width / 2}
          y={height / 2}
          text={element.label}
          fontSize={10}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          fill={isSelected ? '#38bdf8' : isDark ? '#cbd5e1' : '#334155'}
          align="center"
          verticalAlign="middle"
          offsetX={element.label.length * 2.8}
          offsetY={5}
        />
      )}

      {/* Lock badge if locked */}
      {locked && (
        <Group x={width - 12} y={4}>
          <Circle radius={6} fill="#f59e0b" />
          <Text text="🔒" fontSize={8} x={-4} y={-5} />
        </Group>
      )}
    </Group>
  );
};
