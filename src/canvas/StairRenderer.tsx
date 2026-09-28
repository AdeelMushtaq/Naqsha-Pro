import React from 'react';
import { Group, Rect, Line, Text, Arrow } from 'react-konva';
import { StairElement, UnitSystem, ThemeMode } from '../models/types';
import { generateStairGeometry2D } from '../utils/stairs';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';

interface StairRendererProps {
  element: StairElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions?: boolean;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<StairElement>) => void;
}

export const StairRenderer: React.FC<StairRendererProps> = ({
  element,
  isSelected,
  unitSystem,
  theme,
  showDimensions = true,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const selectedColor = '#f43f5e';
  const defaultStroke = isDark ? '#94a3b8' : '#475569';
  const strokeColor = isSelected ? selectedColor : defaultStroke;
  const fillColor = isDark ? 'rgba(244, 63, 94, 0.04)' : 'rgba(225, 29, 72, 0.03)';

  const geom = generateStairGeometry2D(element);

  const dragHandlers = useDraggableObject({
    element,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  const outlineFlat = geom.outline.flatMap((p) => [p.x, p.y]);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      {...dragHandlers}
    >
      {/* Outer outline */}
      <Line
        points={outlineFlat}
        closed
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.4}
      />

      {/* Landing box if L or U shape */}
      {geom.landing && (
        <Line
          points={geom.landing.points.flatMap((p) => [p.x, p.y])}
          closed
          fill={isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(225, 29, 72, 0.06)'}
          stroke={strokeColor}
          strokeWidth={1}
          dash={[4, 3]}
        />
      )}

      {/* Individual Step Treads */}
      {geom.treads.map((tr) => (
        <Line
          key={tr.index}
          points={[tr.start.x, tr.start.y, tr.end.x, tr.end.y]}
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.8}
        />
      ))}

      {/* Break / Cut line */}
      {geom.breakLine && (
        <Line
          points={[
            geom.breakLine.start.x,
            geom.breakLine.start.y,
            (geom.breakLine.start.x + geom.breakLine.end.x) / 2 - 4,
            (geom.breakLine.start.y + geom.breakLine.end.y) / 2,
            (geom.breakLine.start.x + geom.breakLine.end.x) / 2 + 4,
            (geom.breakLine.start.y + geom.breakLine.end.y) / 2,
            geom.breakLine.end.x,
            geom.breakLine.end.y,
          ]}
          stroke={strokeColor}
          strokeWidth={1.5}
          dash={[6, 3]}
        />
      )}

      {/* Direction Arrow with UP / DOWN badge */}
      {geom.arrow && (
        <Group>
          <Arrow
            points={[
              geom.arrow.start.x,
              geom.arrow.start.y,
              geom.arrow.end.x,
              geom.arrow.end.y,
            ]}
            pointerLength={8}
            pointerWidth={6}
            fill={isSelected ? '#f43f5e' : '#38bdf8'}
            stroke={isSelected ? '#f43f5e' : '#38bdf8'}
            strokeWidth={1.5}
          />
          <Text
            x={geom.arrow.labelPos.x - 14}
            y={geom.arrow.labelPos.y - 6}
            text={element.direction === 'down' ? 'DN' : 'UP'}
            fontSize={9}
            fontStyle="bold"
            fill={isSelected ? '#f43f5e' : '#38bdf8'}
          />
        </Group>
      )}

      {/* Handrail line */}
      {element.handrail && (
        <Line
          points={outlineFlat.slice(0, 4)}
          stroke="#f59e0b"
          strokeWidth={2}
          opacity={0.7}
        />
      )}

      {/* Step count badge */}
      <Text
        x={8}
        y={8}
        text={`${element.numSteps || 16} Steps (${(element.calculatedRiser || 6).toFixed(1)}" R)`}
        fontSize={8.5}
        fontStyle="bold"
        fill={isDark ? '#cbd5e1' : '#334155'}
      />

      {/* Dimensions tag when selected */}
      {isSelected && showDimensions && (
        <Group y={-16}>
          <Rect
            x={0}
            y={0}
            width={120}
            height={14}
            fill="rgba(15, 23, 42, 0.85)"
            cornerRadius={3}
          />
          <Text
            x={4}
            y={2}
            text={`W: ${formatLength(element.width, unitSystem)} | Riser: ${(element.calculatedRiser || 6).toFixed(1)}"`}
            fontSize={8}
            fill="#38bdf8"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
};
