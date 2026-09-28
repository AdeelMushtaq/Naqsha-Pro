import React from 'react';
import { Group, Line, Text } from 'react-konva';
import {
  WindowElement,
  WallElement,
  CurveWallElement,
  UnitSystem,
  ThemeMode,
} from '../models/types';
import {
  getWindowWorldPosition,
  getWallNormal,
  projectPointOntoSegment,
  clampOffset,
  getWallLength,
} from '../utils/geometry';
import { useStore } from '../store/useStore';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';
import { DoorWindowHandles } from './interaction/DoorWindowHandles';

interface WindowRendererProps {
  windowElem: WindowElement;
  wall: WallElement | CurveWallElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions: boolean;
  onSelect: (e: any) => void;
  onOffsetChange?: (newOffset: number) => void;
  onLiveInfo?: (info: string | null) => void;
}

export const WindowRenderer: React.FC<WindowRendererProps> = ({
  windowElem,
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
  const winPos = getWindowWorldPosition(wall, windowElem);
  const p1 = winPos.startPoint;
  const p2 = winPos.endPoint;
  const wallNormal = getWallNormal(p1, p2);

  const halfThick = (wall.thickness || 9) / 2;
  const frameColor = isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b';
  const glassColor = isSelected ? '#38bdf8' : '#38bdf8'; // Sky blue glass line

  // Outer sill points
  const sill1A = { x: p1.x + wallNormal.x * halfThick, y: p1.y + wallNormal.y * halfThick };
  const sill1B = { x: p1.x - wallNormal.x * halfThick, y: p1.y - wallNormal.y * halfThick };
  const sill2A = { x: p2.x + wallNormal.x * halfThick, y: p2.y + wallNormal.y * halfThick };
  const sill2B = { x: p2.x - wallNormal.x * halfThick, y: p2.y - wallNormal.y * halfThick };

  const { zoom, project, updateElement } = useStore();

  const dragHandlers = useDraggableObject({
    element: windowElem,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => {
      if (pos.x === 0 && pos.y === 0) return;
      const newPos = {
        x: winPos.center.x + pos.x,
        y: winPos.center.y + pos.y,
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
          const safeOffset = clampOffset(bestOffset - windowElem.width / 2, windowElem.width, tLen);
          updateElement(windowElem.id, { wallId: nearestWall.id, offset: safeOffset }, true);
          return;
        }
      }
      const safeOffset = clampOffset(currentProj.offset - windowElem.width / 2, windowElem.width, wallLen);
      updateElement(windowElem.id, { offset: safeOffset }, true);
    },
  });

  return (
    <Group id={windowElem.id} {...dragHandlers}>
      {/* Invisible broad hit area line for reliable selection */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="transparent"
        strokeWidth={Math.max(28, (wall.thickness || 9) + 12)}
        hitStrokeWidth={36}
      />

      {/* End jamb caps */}
      <Line points={[sill1A.x, sill1A.y, sill1B.x, sill1B.y]} stroke={frameColor} strokeWidth={2} />
      <Line points={[sill2A.x, sill2A.y, sill2B.x, sill2B.y]} stroke={frameColor} strokeWidth={2} />

      {/* Outer and inner sill lines */}
      <Line points={[sill1A.x, sill1A.y, sill2A.x, sill2A.y]} stroke={frameColor} strokeWidth={1.5} />
      <Line points={[sill1B.x, sill1B.y, sill2B.x, sill2B.y]} stroke={frameColor} strokeWidth={1.5} />

      {/* Center glass panes (standard 2 lines) */}
      <Line
        points={[
          p1.x + wallNormal.x * 1.5,
          p1.y + wallNormal.y * 1.5,
          p2.x + wallNormal.x * 1.5,
          p2.y + wallNormal.y * 1.5,
        ]}
        stroke={glassColor}
        strokeWidth={1.2}
      />
      <Line
        points={[
          p1.x - wallNormal.x * 1.5,
          p1.y - wallNormal.y * 1.5,
          p2.x - wallNormal.x * 1.5,
          p2.y - wallNormal.y * 1.5,
        ]}
        stroke={glassColor}
        strokeWidth={1.2}
      />

      {/* Dimension Label */}
      {showDimensions && (
        <Text
          x={winPos.center.x + wallNormal.x * (halfThick + 10)}
          y={winPos.center.y + wallNormal.y * (halfThick + 10)}
          text={`${formatLength(windowElem.width, unitSystem)}`}
          fontSize={10}
          fill={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b'}
          fontStyle="bold"
          fontFamily="monospace"
          align="center"
          offsetX={16}
          offsetY={5}
        />
      )}

      {/* Interactive Drag Handles when selected */}
      {isSelected && !windowElem.locked && (
        <DoorWindowHandles
          element={windowElem}
          wall={wall}
          onLiveInfo={onLiveInfo}
        />
      )}
    </Group>
  );
};
