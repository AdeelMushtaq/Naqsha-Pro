import React from 'react';
import { Group, Line, Rect, Text, Circle, Arc } from 'react-konva';
import { GateElement, WallElement, CurveWallElement, UnitSystem, ThemeMode } from '../models/types';
import { getGateGeometry } from '../utils/collision';
import { formatLength } from '../utils/units';
import { getWallLength, clampOffset, projectPointOntoSegment } from '../utils/geometry';

interface GateRendererProps {
  gate: GateElement;
  wall: WallElement | CurveWallElement;
  isSelected: boolean;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  showDimensions?: boolean;
  onSelect: (e: any) => void;
  onOffsetChange?: (newOffset: number) => void;
  onLiveInfo?: (info: string | null) => void;
}

export const GateRenderer: React.FC<GateRendererProps> = ({
  gate,
  wall,
  isSelected,
  unitSystem,
  theme,
  showDimensions = true,
  onSelect,
  onOffsetChange,
  onLiveInfo,
}) => {
  const isDark = theme === 'dark';
  const gateGeom = getGateGeometry(gate, wall);
  if (!gateGeom) return null;

  const pillarFill = isDark ? '#475569' : '#94a3b8';
  const pillarStroke = isSelected ? '#38bdf8' : isDark ? '#94a3b8' : '#334155';
  const gateColor = isSelected ? '#38bdf8' : '#eab308'; // Amber gold

  const lpFlat = gateGeom.postLeft.flatMap((p) => [p.x, p.y]);
  const rpFlat = gateGeom.postRight.flatMap((p) => [p.x, p.y]);

  const p1 = gateGeom.leftPostInnerEdge;
  const p2 = gateGeom.rightPostInnerEdge;
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  const wallLen = getWallLength(wall);

  return (
    <Group id={gate.id} onClick={onSelect} onTap={onSelect}>
      {/* Clear Opening Gap on Wall */}
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke={isDark ? '#0f172a' : '#ffffff'}
        strokeWidth={(wall.thickness || 9) + 2}
      />

      {/* Left Pillar */}
      <Line
        points={lpFlat}
        closed
        fill={pillarFill}
        stroke={pillarStroke}
        strokeWidth={isSelected ? 2 : 1.2}
      />

      {/* Right Pillar */}
      <Line
        points={rpFlat}
        closed
        fill={pillarFill}
        stroke={pillarStroke}
        strokeWidth={isSelected ? 2 : 1.2}
      />

      {/* Gate leaves */}
      {gate.gateType === 'sliding' ? (
        // Sliding gate track line
        <Line
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={gateColor}
          strokeWidth={3}
          dash={[8, 4]}
        />
      ) : gate.gateType === 'swing' ? (
        // Double swing gate leaves
        <>
          <Line
            points={[p1.x, p1.y, midX, midY]}
            stroke={gateColor}
            strokeWidth={2.5}
          />
          <Line
            points={[p2.x, p2.y, midX, midY]}
            stroke={gateColor}
            strokeWidth={2.5}
          />
        </>
      ) : (
        // Open gate entry line
        <Line
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={gateColor}
          strokeWidth={1.5}
          dash={[4, 4]}
          opacity={0.6}
        />
      )}

      {/* Gate Title and Clear Opening Dimension Tag */}
      <Group x={midX} y={midY - 14}>
        <Rect
          x={-50}
          y={-8}
          width={100}
          height={16}
          fill="rgba(15, 23, 42, 0.85)"
          stroke={isSelected ? '#38bdf8' : '#475569'}
          strokeWidth={1}
          cornerRadius={3}
        />
        <Text
          x={-48}
          y={-5}
          width={96}
          align="center"
          text={`${gate.label || 'GATE'}: ${formatLength(gate.width, unitSystem)}`}
          fontSize={8}
          fontStyle="bold"
          fill="#fbbf24"
        />
      </Group>

      {/* Offset slider handle when selected */}
      {isSelected && onOffsetChange && (
        <Circle
          x={midX}
          y={midY}
          radius={7}
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            const rawPos = { x: e.target.x(), y: e.target.y() };
            const proj = projectPointOntoSegment(rawPos, wall.start, wall.end);
            const safeOffset = clampOffset(proj.offset - gate.width / 2, gate.width, wallLen);
            onOffsetChange(safeOffset);
            if (onLiveInfo) {
              onLiveInfo(`Gate Offset: ${formatLength(safeOffset, unitSystem)}`);
            }
          }}
          onDragEnd={() => {
            if (onLiveInfo) onLiveInfo(null);
          }}
        />
      )}
    </Group>
  );
};
