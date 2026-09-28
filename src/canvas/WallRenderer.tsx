import React, { useRef } from 'react';
import { Group, Line, Shape, Circle, Text } from 'react-konva';
import {
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  UnitSystem,
  ThemeMode,
} from '../models/types';
import {
  getWallLength,
  getWallNormal,
  getCurveWallArc,
  distance,
} from '../utils/geometry';
import { DimensionLine } from './DimensionLine';
import { formatLength } from '../utils/units';
import { useDraggableObject } from './interaction/useDraggableObject';
import { WallHandles } from './interaction/WallHandles';

interface WallRendererProps {
  wall: WallElement | CurveWallElement;
  doors: DoorElement[];
  windows: WindowElement[];
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions: boolean;
  isStartConnected?: boolean;
  isEndConnected?: boolean;
  onSelect: (e: any) => void;
  onBulgeChange?: (newBulge: number) => void;
  onLiveInfo?: (info: string | null) => void;
  onMoveDelta?: (dx: number, dy: number) => void;
  onDimensionOffsetChange?: (offset: number) => void;
}

export const WallRenderer: React.FC<WallRendererProps> = ({
  wall,
  doors,
  windows,
  isSelected,
  unitSystem,
  theme,
  showDimensions,
  isStartConnected = false,
  isEndConnected = false,
  onSelect,
  onBulgeChange,
  onLiveInfo,
  onMoveDelta,
  onDimensionOffsetChange,
}) => {
  const isDark = theme === 'dark';
  const defaultWallFill = isDark ? '#1e293b' : '#e2e8f0';
  const defaultWallStroke = isDark ? '#64748b' : '#475569';
  const selectedStroke = '#38bdf8'; // Sky cyan highlight

  const dragHandlers = useDraggableObject({
    element: wall,
    isSelected,
    onSelect,
    onCustomDragEnd: (pos) => {
      if (onMoveDelta && (pos.x !== 0 || pos.y !== 0)) {
        onMoveDelta(pos.x, pos.y);
      }
    },
  });

  // Straight wall
  if (wall.type === 'wall') {
    const len = getWallLength(wall);
    const halfThick = wall.thickness / 2;
    const normal = getWallNormal(wall.start, wall.end);

    // Collect openings (doors & windows) sorted by offset
    const openings: { startOffset: number; endOffset: number }[] = [];
    doors.forEach((d) => {
      openings.push({
        startOffset: d.offset,
        endOffset: Math.min(len, d.offset + d.width),
      });
    });
    windows.forEach((w) => {
      openings.push({
        startOffset: w.offset,
        endOffset: Math.min(len, w.offset + w.width),
      });
    });
    openings.sort((a, b) => a.startOffset - b.startOffset);

    // Wall direction unit vector
    const dirX = len > 0 ? (wall.end.x - wall.start.x) / len : 0;
    const dirY = len > 0 ? (wall.end.y - wall.start.y) / len : 0;

    // Build segments between openings
    const segments: { startOffset: number; endOffset: number }[] = [];
    let currentOffset = 0;

    for (const op of openings) {
      if (op.startOffset > currentOffset) {
        segments.push({ startOffset: currentOffset, endOffset: op.startOffset });
      }
      currentOffset = Math.max(currentOffset, op.endOffset);
    }
    if (currentOffset < len) {
      segments.push({ startOffset: currentOffset, endOffset: len });
    }

    const nx = normal.x * halfThick;
    const ny = normal.y * halfThick;

    return (
      <Group id={wall.id} {...dragHandlers}>
        {/* Invisible wide hit area line for smooth mouse and touch selection */}
        <Line
          points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
          stroke="transparent"
          strokeWidth={Math.max(24, wall.thickness + 10)}
          hitStrokeWidth={36}
        />

        {/* Render each solid wall block segment */}
        {segments.map((seg, idx) => {
          const p1x = wall.start.x + dirX * seg.startOffset;
          const p1y = wall.start.y + dirY * seg.startOffset;
          const p2x = wall.start.x + dirX * seg.endOffset;
          const p2y = wall.start.y + dirY * seg.endOffset;

          const polyPoints = [
            p1x + nx, p1y + ny,
            p2x + nx, p2y + ny,
            p2x - nx, p2y - ny,
            p1x - nx, p1y - ny,
          ];

          const strokeColor = isSelected ? selectedStroke : wall.strokeColor || defaultWallStroke;
          const strokeWidth = isSelected ? 2 : 1.2;
          const shadowColor = isSelected ? selectedStroke : 'transparent';
          const shadowBlur = isSelected ? 6 : 0;

          // Only draw transverse end-cap lines if the end is free or at a door/window opening
          const drawStartCap = seg.startOffset > 0 || !isStartConnected;
          const drawEndCap = seg.endOffset < len || !isEndConnected;

          // Trim side border strokes at connected corner/junction so they don't poke inside the other wall
          const strokeStartOffset = seg.startOffset === 0 && isStartConnected ? Math.min(seg.endOffset, halfThick) : seg.startOffset;
          const strokeEndOffset = seg.endOffset === len && isEndConnected ? Math.max(seg.startOffset, len - halfThick) : seg.endOffset;

          const sp1x = wall.start.x + dirX * strokeStartOffset;
          const sp1y = wall.start.y + dirY * strokeStartOffset;
          const sp2x = wall.start.x + dirX * strokeEndOffset;
          const sp2y = wall.start.y + dirY * strokeEndOffset;

          return (
            <Group key={`wall-seg-${idx}`}>
              {/* Solid filled wall body without hard stroke on connected joints */}
              <Line
                points={polyPoints}
                closed
                fill={wall.fillColor || defaultWallFill}
                strokeWidth={0}
              />

              {/* Side 1 (outer / top edge) lengthwise stroke */}
              <Line
                points={[sp1x + nx, sp1y + ny, sp2x + nx, sp2y + ny]}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                lineCap="butt"
                shadowColor={shadowColor}
                shadowBlur={shadowBlur}
              />

              {/* Side 2 (inner / bottom edge) lengthwise stroke */}
              <Line
                points={[sp1x - nx, sp1y - ny, sp2x - nx, sp2y - ny]}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                lineCap="butt"
                shadowColor={shadowColor}
                shadowBlur={shadowBlur}
              />

              {/* Start transverse cap (only when disconnected or at opening) */}
              {drawStartCap && (
                <Line
                  points={[p1x + nx, p1y + ny, p1x - nx, p1y - ny]}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  lineCap="butt"
                />
              )}

              {/* End transverse cap (only when disconnected or at opening) */}
              {drawEndCap && (
                <Line
                  points={[p2x + nx, p2y + ny, p2x - nx, p2y - ny]}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  lineCap="butt"
                />
              )}
            </Group>
          );
        })}

        {/* Centerline indication for drafting clarity */}
        <Line
          points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
          stroke={isSelected ? selectedStroke : isDark ? '#475569' : '#94a3b8'}
          strokeWidth={0.8}
          dash={[4, 4]}
          opacity={0.6}
        />

        {/* Interactive Endpoint and Midpoint Handles when selected */}
        {isSelected && !wall.locked && (
          <WallHandles wall={wall} onLiveInfo={onLiveInfo} />
        )}

        {/* Dimension Line (Draggable inward/outward with clean architectural gray) */}
        {showDimensions && (
          <DimensionLine
            start={wall.start}
            end={wall.end}
            unitSystem={unitSystem}
            offset={wall.dimensionOffset ?? (halfThick + 16)}
            color={isSelected ? '#38bdf8' : isDark ? '#64748b' : '#94a3b8'}
            textColor={isSelected ? '#38bdf8' : '#cbd5e1'}
            isDraggable={true}
            onOffsetChange={onDimensionOffsetChange}
          />
        )}
      </Group>
    );
  }

  // Curved Wall (Arc)
  const curveWall = wall as CurveWallElement;
  const arc = getCurveWallArc(curveWall);
  const midX = (curveWall.start.x + curveWall.end.x) / 2;
  const midY = (curveWall.start.y + curveWall.end.y) / 2;
  const normal = getWallNormal(curveWall.start, curveWall.end);
  const bulgeControlPoint = {
    x: midX + normal.x * curveWall.bulge,
    y: midY + normal.y * curveWall.bulge,
  };

  return (
    <Group id={wall.id} {...dragHandlers}>
      {/* Invisible wide arc hit shape */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          if (arc.radius > 0) {
            context.arc(
              arc.center.x,
              arc.center.y,
              arc.radius,
              arc.startAngle,
              arc.endAngle,
              arc.counterClockwise
            );
          } else {
            context.moveTo(curveWall.start.x, curveWall.start.y);
            context.lineTo(curveWall.end.x, curveWall.end.y);
          }
          context.fillStrokeShape(shape);
        }}
        stroke="transparent"
        strokeWidth={Math.max(28, curveWall.thickness + 12)}
        hitStrokeWidth={36}
      />

      {/* Arc curve stroke */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          if (arc.radius > 0) {
            context.arc(
              arc.center.x,
              arc.center.y,
              arc.radius,
              arc.startAngle,
              arc.endAngle,
              arc.counterClockwise
            );
          } else {
            context.moveTo(curveWall.start.x, curveWall.start.y);
            context.lineTo(curveWall.end.x, curveWall.end.y);
          }
          context.fillStrokeShape(shape);
        }}
        stroke={isSelected ? selectedStroke : curveWall.strokeColor || defaultWallStroke}
        strokeWidth={curveWall.thickness}
        lineCap="butt"
        shadowColor={isSelected ? selectedStroke : 'transparent'}
        shadowBlur={isSelected ? 6 : 0}
      />

      {/* Centerline */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          if (arc.radius > 0) {
            context.arc(
              arc.center.x,
              arc.center.y,
              arc.radius,
              arc.startAngle,
              arc.endAngle,
              arc.counterClockwise
            );
          } else {
            context.moveTo(curveWall.start.x, curveWall.start.y);
            context.lineTo(curveWall.end.x, curveWall.end.y);
          }
          context.fillStrokeShape(shape);
        }}
        stroke={isSelected ? selectedStroke : '#64748b'}
        strokeWidth={0.8}
        dash={[3, 3]}
        opacity={0.7}
      />

      {/* Interactive Handles when selected */}
      {isSelected && !curveWall.locked && (
        <WallHandles wall={curveWall} onLiveInfo={onLiveInfo} />
      )}

      {/* Curve dimension / arc length label */}
      {(showDimensions || isSelected) && (
        <Text
          x={bulgeControlPoint.x + normal.x * (curveWall.thickness / 2 + 10)}
          y={bulgeControlPoint.y + normal.y * (curveWall.thickness / 2 + 10)}
          text={`Arc: ${formatLength(arc.length, unitSystem)} (R: ${formatLength(arc.radius, unitSystem)})`}
          fontSize={10}
          fill={isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#475569'}
          fontStyle="bold"
          align="center"
        />
      )}
    </Group>
  );
};
