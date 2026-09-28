import React from 'react';
import { Group, Text, Circle } from 'react-konva';
import { TextElement, ThemeMode } from '../models/types';
import { useDraggableObject } from './interaction/useDraggableObject';

interface TextRendererProps {
  element: TextElement;
  isSelected: boolean;
  theme: ThemeMode;
  onSelect: (e: any) => void;
  onChange: (patch: Partial<TextElement>) => void;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  element,
  isSelected,
  theme,
  onSelect,
  onChange,
}) => {
  const isDark = theme === 'dark';
  const defaultColor = isDark ? '#f1f5f9' : '#0f172a';
  const color = isSelected ? '#38bdf8' : element.color || defaultColor;

  const dragHandlers = useDraggableObject({
    element,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => onChange({ x: pos.x, y: pos.y }),
  });

  const handleInlineEdit = (e: any) => {
    e.cancelBubble = true;
    const newVal = prompt('Edit Note / Text:', element.text);
    if (newVal !== null && newVal.trim() !== '') {
      onChange({ text: newVal.trim() });
    }
  };

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      {...dragHandlers}
      onDblClick={handleInlineEdit}
      onDblTap={handleInlineEdit}
    >
      <Text
        text={element.text}
        fontSize={element.fontSize || 14}
        fontFamily="system-ui, sans-serif"
        fontStyle="bold"
        fill={color}
        shadowColor={isSelected ? '#38bdf8' : undefined}
        shadowBlur={isSelected ? 4 : 0}
      />
      {element.locked && (
        <Group x={-10} y={-4}>
          <Circle radius={5} fill="#f59e0b" />
          <Text text="🔒" fontSize={7} x={-3.5} y={-4} />
        </Group>
      )}
    </Group>
  );
};
