import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import { DimensionElement, UnitSystem, ThemeMode } from '../models/types';
import { DimensionLine } from './DimensionLine';
import { useDraggableObject } from './interaction/useDraggableObject';
import { getWallNormal } from '../utils/geometry';
import { useStore } from '../store/useStore';

interface DimensionRendererProps {
  element: DimensionElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<DimensionElement>) => void;
}

export const DimensionRenderer: React.FC<DimensionRendererProps> = ({
  element,
  isSelected,
  unitSystem,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const color = isSelected ? '#38bdf8' : isDark ? '#64748b' : '#94a3b8';
  const { deleteElements } = useStore();

  const normal = getWallNormal(element.start, element.end);
  const offset = element.offset || 16;
  const p1 = {
    x: element.start.x + normal.x * offset,
    y: element.start.y + normal.y * offset,
  };
  const p2 = {
    x: element.end.x + normal.x * offset,
    y: element.end.y + normal.y * offset,
  };
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  const dragHandlers = useDraggableObject({
    element,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => {
      const dx = pos.x;
      const dy = pos.y;
      onChange({
        start: { x: element.start.x + dx, y: element.start.y + dy },
        end: { x: element.end.x + dx, y: element.end.y + dy },
      });
    },
  });

  const handleInlineEdit = (e: any) => {
    e.cancelBubble = true;
    const newVal = prompt(
      'Edit Dimension Text Override (leave blank for auto length):',
      element.labelOverride || ''
    );
    if (newVal !== null) {
      onChange({ labelOverride: newVal.trim() || undefined });
    }
  };

  const handleDelete = (e: any) => {
    e.cancelBubble = true;
    deleteElements([element.id]);
  };

  return (
    <Group
      id={element.id}
      {...dragHandlers}
      onDblClick={handleInlineEdit}
      onDblTap={handleInlineEdit}
    >
      {/* 1. Wide invisible hit line along the dimension offset line so clicking it selects the dimension */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="transparent"
        strokeWidth={28}
        hitStrokeWidth={36}
      />

      {/* 2. Invisible hit line between actual element measured endpoints */}
      <Line
        points={[element.start.x, element.start.y, element.end.x, element.end.y]}
        stroke="transparent"
        strokeWidth={16}
        hitStrokeWidth={24}
      />

      {/* 3. Extension lines hit area */}
      <Line
        points={[element.start.x, element.start.y, p1.x, p1.y]}
        stroke="transparent"
        strokeWidth={16}
        hitStrokeWidth={20}
      />
      <Line
        points={[element.end.x, element.end.y, p2.x, p2.y]}
        stroke="transparent"
        strokeWidth={16}
        hitStrokeWidth={20}
      />

      {/* 4. Visual Dimension Line */}
      <DimensionLine
        start={element.start}
        end={element.end}
        unitSystem={unitSystem}
        offset={offset}
        color={color}
        textColor={isSelected ? '#38bdf8' : '#cbd5e1'}
        labelOverride={element.labelOverride}
        isDraggable={!element.locked}
        onOffsetChange={(newOffset) => onChange({ offset: newOffset })}
      />

      {/* 5. Highlight selection box/ticks when selected */}
      {isSelected && (
        <Line
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke="#38bdf8"
          strokeWidth={2}
          dash={[6, 4]}
          opacity={0.8}
        />
      )}

      {/* 6. Interactive handles when selected */}
      {isSelected && !element.locked && (
        <>
          {/* Start Point Handle */}
          <Circle
            x={element.start.x}
            y={element.start.y}
            radius={6}
            hitStrokeWidth={24}
            fill="#38bdf8"
            stroke="#0f172a"
            strokeWidth={2}
            draggable
            onDragEnd={(e) => {
              e.cancelBubble = true;
              onChange({ start: { x: Math.round(e.target.x()), y: Math.round(e.target.y()) } });
            }}
          />
          {/* End Point Handle */}
          <Circle
            x={element.end.x}
            y={element.end.y}
            radius={6}
            hitStrokeWidth={24}
            fill="#38bdf8"
            stroke="#0f172a"
            strokeWidth={2}
            draggable
            onDragEnd={(e) => {
              e.cancelBubble = true;
              onChange({ end: { x: Math.round(e.target.x()), y: Math.round(e.target.y()) } });
            }}
          />

          {/* Quick Floating Delete Button (Red Badge with 'X' / Trash) right at the midpoint */}
          <Group
            x={midX + normal.x * 22}
            y={midY + normal.y * 22}
            onClick={handleDelete}
            onTap={handleDelete}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          >
            <Circle
              radius={10}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={1.5}
              shadowColor="#000000"
              shadowBlur={6}
              shadowOpacity={0.35}
            />
            {/* 'X' icon */}
            <Line
              points={[-3.5, -3.5, 3.5, 3.5]}
              stroke="#ffffff"
              strokeWidth={2}
              lineCap="round"
            />
            <Line
              points={[3.5, -3.5, -3.5, 3.5]}
              stroke="#ffffff"
              strokeWidth={2}
              lineCap="round"
            />
          </Group>
        </>
      )}
    </Group>
  );
};
