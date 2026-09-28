import React, { useRef, useState, useEffect } from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import { Point2D, UnitSystem } from '../models/types';
import { distance, angleDeg, getWallNormal } from '../utils/geometry';
import { formatLength } from '../utils/units';

interface DimensionLineProps {
  start: Point2D;
  end: Point2D;
  unitSystem: UnitSystem;
  offset?: number; // perpendicular offset distance from element (inches), positive = one side, negative = opposite side
  color?: string;
  textColor?: string;
  fontSize?: number;
  labelOverride?: string;
  isDraggable?: boolean;
  onOffsetChange?: (newOffset: number) => void;
}

export const DimensionLine: React.FC<DimensionLineProps> = ({
  start,
  end,
  unitSystem,
  offset = 18,
  color = '#64748b',
  textColor = '#cbd5e1',
  fontSize = 10.5,
  labelOverride,
  isDraggable = false,
  onOffsetChange,
}) => {
  const len = distance(start, end);
  if (len < 6) return null; // Don't crowd tiny dimensions

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localOffset, setLocalOffset] = useState<number | null>(null);

  // Drag tracking refs
  const dragStartOffsetRef = useRef<number>(offset);
  const dragStartPointerRef = useRef<Point2D | null>(null);
  const stageRef = useRef<any>(null);

  const normal = getWallNormal(start, end);

  // Active offset: uses localOffset during real-time dragging, otherwise fallback to prop offset
  const currentOffset = localOffset !== null ? localOffset : offset;

  // Exact corner points with zero overshoot so corners are razor sharp
  const p1: Point2D = {
    x: start.x + normal.x * currentOffset,
    y: start.y + normal.y * currentOffset,
  };
  const p2: Point2D = {
    x: end.x + normal.x * currentOffset,
    y: end.y + normal.y * currentOffset,
  };

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  let deg = angleDeg(p1, p2);
  if (deg > 90 && deg < 270) {
    deg += 180;
  }

  const label = labelOverride || formatLength(len, unitSystem, 'architectural');
  const badgeWidth = Math.max(38, label.length * 7.5 + 14);
  const badgeHeight = 18;

  // Real-time drag listeners attached to window/stage
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = () => {
      const stage = stageRef.current;
      if (!stage || !dragStartPointerRef.current) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const currentPointer = transform.point(pointer);

      const dx = currentPointer.x - dragStartPointerRef.current.x;
      const dy = currentPointer.y - dragStartPointerRef.current.y;

      // Project mouse delta onto perpendicular normal vector
      const deltaOffset = dx * normal.x + dy * normal.y;
      let nextOffset = Math.round(dragStartOffsetRef.current + deltaOffset);

      // Snap offset to clean 2" increments for crisp drafting alignment
      nextOffset = Math.round(nextOffset / 2) * 2;

      // Minimum 8" away from wall center so it never gets buried inside the wall
      if (Math.abs(nextOffset) < 10) {
        nextOffset = nextOffset >= 0 ? 10 : -10;
      }

      setLocalOffset(nextOffset);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      if (localOffset !== null && onOffsetChange) {
        onOffsetChange(localOffset);
      }
      setLocalOffset(null);
      dragStartPointerRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, localOffset, normal.x, normal.y, onOffsetChange]);

  const handlePointerDown = (e: any) => {
    if (!isDraggable && !onOffsetChange) return;
    e.cancelBubble = true;

    const stage = e.target.getStage();
    if (!stage) return;
    stageRef.current = stage;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    dragStartPointerRef.current = transform.point(pointer);
    dragStartOffsetRef.current = currentOffset;
    setIsDragging(true);
  };

  const isHighlighted = isHovered || isDragging;
  const strokeColor = isHighlighted ? '#38bdf8' : color;

  return (
    <Group listening={isDraggable || Boolean(onOffsetChange)}>
      {/* 
        Continuous Completely Dashed Measurement Line with 100% Sharp Miter Corners
        Trajectory: start (wall) -> p1 (sharp corner) -> p2 (sharp corner) -> end (wall)
      */}
      <Line
        points={[start.x, start.y, p1.x, p1.y, p2.x, p2.y, end.x, end.y]}
        stroke={strokeColor}
        strokeWidth={isHighlighted ? 1.5 : 1}
        dash={[5, 4]}
        lineCap="butt"
        lineJoin="miter"
        miterLimit={4}
        opacity={isHighlighted ? 1 : 0.65}
        listening={false}
      />

      {/* Dimension Measurement Badge (Interactive & Draggable without teleporting) */}
      <Group
        x={midX}
        y={midY}
        rotation={deg}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseEnter={(e) => {
          setIsHovered(true);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          const stage = e.target.getStage();
          if (stage && !isDragging) stage.container().style.cursor = 'default';
        }}
      >
        {/* Invisible wider hit area for easy grabbing on touch and mouse */}
        <Rect
          x={-badgeWidth / 2 - 6}
          y={-badgeHeight / 2 - 6}
          width={badgeWidth + 12}
          height={badgeHeight + 12}
          fill="transparent"
        />

        {/* Clean pill background badge */}
        <Rect
          x={-badgeWidth / 2}
          y={-badgeHeight / 2}
          width={badgeWidth}
          height={badgeHeight}
          cornerRadius={4}
          fill={isHighlighted ? '#0b192c' : '#0f172a'}
          stroke={isHighlighted ? '#38bdf8' : '#334155'}
          strokeWidth={isHighlighted ? 1.4 : 0.8}
          shadowColor="#000000"
          shadowBlur={isHighlighted ? 6 : 2}
          shadowOpacity={0.5}
        />

        {/* Crisp measurement text */}
        <Text
          x={-badgeWidth / 2}
          y={-badgeHeight / 2 + 3}
          width={badgeWidth}
          text={label}
          fontSize={fontSize}
          fill={isHighlighted ? '#38bdf8' : textColor}
          fontStyle="600"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          align="center"
          verticalAlign="middle"
        />
      </Group>
    </Group>
  );
};
