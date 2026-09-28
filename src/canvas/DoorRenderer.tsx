import React from 'react';
import { Group, Line, Arc, Text, Circle, Rect } from 'react-konva';
import {
  DoorElement,
  WallElement,
  CurveWallElement,
  UnitSystem,
  ThemeMode,
} from '../models/types';
import {
  getDoorWorldPosition,
  getWallNormal,
  distance,
  projectPointOntoSegment,
  clampOffset,
  getWallLength,
} from '../utils/geometry';
import { useStore } from '../store/useStore';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';
import { DoorWindowHandles } from './interaction/DoorWindowHandles';

interface DoorRendererProps {
  door: DoorElement;
  wall: WallElement | CurveWallElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions: boolean;
  onSelect: (e: any) => void;
  onOffsetChange?: (newOffset: number) => void;
  onLiveInfo?: (info: string | null) => void;
}

export const DoorRenderer: React.FC<DoorRendererProps> = ({
  door,
  wall,
  isSelected,
  unitSystem,
  theme,
  showDimensions,
  onSelect,
  onOffsetChange,
  onLiveInfo,
}) => {
  const isDark = theme === 'dark';
  const doorColor = isSelected ? '#38bdf8' : isDark ? '#f59e0b' : '#d97706'; // Amber / Gold for doors
  const arcColor = isSelected ? '#38bdf8' : isDark ? '#fbbf24' : '#b45309';

  const doorPos = getDoorWorldPosition(wall, door);
  const p1 = doorPos.startPoint;
  const p2 = doorPos.endPoint;
  const wallNormal = getWallNormal(p1, p2);

  const swing = door.swingDirection || 'inside_left';
  const isInside = swing.startsWith('inside');
  const isLeft = swing.endsWith('left');

  // Normal multiplier based on inside/outside
  const normalMult = isInside ? 1 : -1;
  const hingePoint = isLeft ? p1 : p2;
  const latchPoint = isLeft ? p2 : p1;

  // Door leaf endpoint when 90-deg open
  const doorLeafEnd = {
    x: hingePoint.x + wallNormal.x * door.width * normalMult,
    y: hingePoint.y + wallNormal.y * door.width * normalMult,
  };

  // Jamb tick marks
  const jambSize = (wall.thickness || 9) / 2;
  const jamb1A = { x: p1.x + wallNormal.x * jambSize, y: p1.y + wallNormal.y * jambSize };
  const jamb1B = { x: p1.x - wallNormal.x * jambSize, y: p1.y - wallNormal.y * jambSize };
  const jamb2A = { x: p2.x + wallNormal.x * jambSize, y: p2.y + wallNormal.y * jambSize };
  const jamb2B = { x: p2.x - wallNormal.x * jambSize, y: p2.y - wallNormal.y * jambSize };

  // Calculate swing arc angle
  const hingeToLeafAngle =
    (Math.atan2(doorLeafEnd.y - hingePoint.y, doorLeafEnd.x - hingePoint.x) * 180) / Math.PI;
  const hingeToLatchAngle =
    (Math.atan2(latchPoint.y - hingePoint.y, latchPoint.x - hingePoint.x) * 180) / Math.PI;

  const startArcDeg = isLeft
    ? (isInside ? hingeToLatchAngle : hingeToLeafAngle)
    : (isInside ? hingeToLeafAngle : hingeToLatchAngle);

  const { zoom, project, updateElement } = useStore();

  const dragHandlers = useDraggableObject({
    element: door,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => {
      if (pos.x === 0 && pos.y === 0) return;
      const newPos = {
        x: doorPos.center.x + pos.x,
        y: doorPos.center.y + pos.y,
      };
      const currentProj = projectPointOntoSegment(newPos, wall.start, wall.end);
      const wallLen = getWallLength(wall);

      if (currentProj.distance > 28 / zoom) {
        let nearestWall: WallElement | null = null;
        let minD = Infinity;
        let bestOffset = 0;
        for (const el of project.elements) {
          if (el.type === 'wall' && !el.locked && !el.hidden) {
            const p = projectPointOntoSegment(newPos, el.start, el.end);
            if (p.distance < minD) {
              minD = p.distance;
              nearestWall = el;
              bestOffset = p.offset;
            }
          }
        }
        if (nearestWall && minD < 48 / zoom) {
          const tLen = getWallLength(nearestWall);
          const safeOffset = clampOffset(bestOffset - door.width / 2, door.width, tLen);
          updateElement(door.id, { wallId: nearestWall.id, offset: safeOffset }, true);
          return;
        }
      }
      const safeOffset = clampOffset(currentProj.offset - door.width / 2, door.width, wallLen);
      updateElement(door.id, { offset: safeOffset }, true);
    },
  });

  return (
    <Group id={door.id} {...dragHandlers}>
      {/* Invisible broad hit area line for reliable selection */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="transparent"
        strokeWidth={Math.max(28, (wall.thickness || 9) + 12)}
        hitStrokeWidth={36}
      />

      {/* Wall cut jamb lines */}
      <Line points={[jamb1A.x, jamb1A.y, jamb1B.x, jamb1B.y]} stroke={doorColor} strokeWidth={2} />
      <Line points={[jamb2A.x, jamb2A.y, jamb2B.x, jamb2B.y]} stroke={doorColor} strokeWidth={2} />

      {/* Door panel / leaf */}
      <Line
        points={[hingePoint.x, hingePoint.y, doorLeafEnd.x, doorLeafEnd.y]}
        stroke={doorColor}
        strokeWidth={isSelected ? 3.5 : 2.5}
      />

      {/* Door hinge point */}
      <Circle
        x={hingePoint.x}
        y={hingePoint.y}
        radius={2.5}
        fill={doorColor}
      />

      {/* Door swing arc */}
      <Arc
        x={hingePoint.x}
        y={hingePoint.y}
        innerRadius={door.width - 0.5}
        outerRadius={door.width + 0.5}
        angle={90}
        rotation={startArcDeg}
        stroke={arcColor}
        strokeWidth={1}
        dash={[3, 3]}
        opacity={0.85}
      />

      {/* Dimension Label */}
      {showDimensions && (
        <Text
          x={doorPos.center.x + wallNormal.x * (normalMult * (door.width / 2 + 8))}
          y={doorPos.center.y + wallNormal.y * (normalMult * (door.width / 2 + 8))}
          text={`${formatLength(door.width, unitSystem)}`}
          fontSize={10}
          fill={isSelected ? '#38bdf8' : arcColor}
          fontStyle="bold"
          fontFamily="monospace"
          align="center"
          offsetX={16}
          offsetY={5}
        />
      )}

      {/* Interactive Drag Handles when selected */}
      {isSelected && !door.locked && (
        <DoorWindowHandles
          element={door}
          wall={wall}
          onLiveInfo={onLiveInfo}
        />
      )}
    </Group>
  );
};
