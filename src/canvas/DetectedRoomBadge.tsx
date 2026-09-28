import React, { useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { DetectedRoom, UnitSystem, AreaUnit, ThemeMode } from '../models/types';
import { formatAreaWithUnit, formatPerimeter } from '../utils/units';

interface DetectedRoomBadgeProps {
  room: DetectedRoom;
  unitSystem: UnitSystem;
  areaUnit: AreaUnit;
  theme: ThemeMode;
  onRename?: (id: string, newName: string) => void;
}

export const DetectedRoomBadge: React.FC<DetectedRoomBadgeProps> = ({
  room,
  unitSystem,
  areaUnit,
  theme,
  onRename,
}) => {
  const isDark = theme === 'dark';
  const badgeWidth = 110;
  const badgeHeight = 44;

  const areaStr = formatAreaWithUnit(room.areaSqInches, 'sqft');
  const perimStr = formatPerimeter(room.perimeterInches, unitSystem);

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    if (onRename) {
      const newName = prompt('Kamray Ka Naam (Room Name):', room.name);
      if (newName && newName.trim()) {
        onRename(room.id, newName.trim());
      }
    }
  };

  return (
    <Group
      x={room.centroid.x - badgeWidth / 2}
      y={room.centroid.y - badgeHeight / 2}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleClick}
      onDblTap={handleClick}
    >
      {/* Badge container background */}
      <Rect
        width={badgeWidth}
        height={badgeHeight}
        fill={isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)'}
        stroke={isDark ? '#38bdf8' : '#0284c7'}
        strokeWidth={1}
        cornerRadius={8}
        dash={[3, 3]}
        shadowColor={isDark ? '#000000' : '#cbd5e1'}
        shadowBlur={4}
        shadowOpacity={0.3}
      />

      {/* Room Name */}
      <Text
        x={0}
        y={6}
        width={badgeWidth}
        text={room.name}
        fontSize={11}
        fontStyle="bold"
        fontFamily="system-ui, sans-serif"
        fill={isDark ? '#38bdf8' : '#0284c7'}
        align="center"
      />

      {/* Floor Area */}
      <Text
        x={0}
        y={19}
        width={badgeWidth}
        text={areaStr}
        fontSize={10}
        fontStyle="bold"
        fontFamily="system-ui, sans-serif"
        fill={isDark ? '#f1f5f9' : '#0f172a'}
        align="center"
      />

      {/* Perimeter */}
      <Text
        x={0}
        y={30}
        width={badgeWidth}
        text={`P: ${perimStr}`}
        fontSize={8.5}
        fontFamily="system-ui, sans-serif"
        fill={isDark ? '#94a3b8' : '#64748b'}
        align="center"
      />
    </Group>
  );
};
