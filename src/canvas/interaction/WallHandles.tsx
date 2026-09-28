/**
 * Interactive Endpoint and Midpoint Handles for Walls in Naqsha CAD.
 * Supports:
 * - Extending / shortening walls by dragging endpoints
 * - Snapping to nearby wall nodes and other walls (T-junction detection)
 * - Auto-merging into nodes on drop
 * - Moving connected walls together (stretch corners); Alt detaches
 * - Midpoint handle to bend curve or push perpendicular
 * - Live length and angle indicators
 * - Large touch-friendly hit areas (minimum 20px, 44px on touch)
 */

import React, { useState, useRef } from 'react';
import { Group, Circle, Line, Text, Rect } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../../store/useStore';
import { WallElement, CurveWallElement, Point2D, SnapFeedback } from '../../models/types';
import { distance, angleDeg, getWallLength, getWallNormal } from '../../utils/geometry';
import { snapAngle, snapToEndpoints, snapToMidpoints, snapToGrid } from '../../utils/snapping';
import { isPointOnWallInterior, getOrCreateWallNode } from '../../utils/wallJoin';
import { formatLength } from '../../utils/units';

interface WallHandlesProps {
  wall: WallElement | CurveWallElement;
  onLiveInfo?: (info: string | null) => void;
}

export const WallHandles: React.FC<WallHandlesProps> = ({ wall, onLiveInfo }) => {
  const {
    zoom,
    unitSystem,
    gridSize,
    snapToGrid: enableGridSnap,
    snapToObjects: enableObjectSnap,
    project,
    updateElement,
    moveWallNode,
    splitWallAt,
    healWalls,
  } = useStore();

  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | 'mid' | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<Point2D | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<SnapFeedback | null>(null);

  const startPt = wall.start;
  const endPt = wall.end;
  const midPt = {
    x: (startPt.x + endPt.x) / 2,
    y: (startPt.y + endPt.y) / 2,
  };

  const handleRadius = Math.max(4.5, Math.min(6.5, 5 / zoom));
  const hitRadius = Math.max(22, 22 / zoom);

  const processEndpointSnap = (
    rawPos: Point2D,
    originPt: Point2D,
    isAlt: boolean
  ): { pos: Point2D; snap: SnapFeedback | null } => {
    if (isAlt) {
      return { pos: rawPos, snap: null };
    }

    let p = { ...rawPos };

    // 1. Angle snap (0, 45, 90, 180)
    const angleRes = snapAngle(originPt, p, 45, 8);
    if (angleRes.snapped) {
      p = angleRes.point;
    }

    // 2. Object snap (nodes & endpoints) - HIGHEST PRIORITY
    if (enableObjectSnap) {
      const snapThreshold = Math.max(18, 22 / zoom);
      const endSnap = snapToEndpoints(p, project.elements, snapThreshold, wall.id);
      if (endSnap.snapped) {
        return {
          pos: endSnap.point,
          snap: {
            point: endSnap.point,
            type: 'corner',
            label: 'Corner Connected',
            targetElementId: endSnap.targetElementId,
          },
        };
      }

      // Check for T-junction on other wall bodies
      for (const otherEl of project.elements) {
        if (otherEl.id !== wall.id && otherEl.type === 'wall' && !otherEl.locked) {
          const interior = isPointOnWallInterior(p, otherEl as WallElement, Math.max(12, 16 / zoom), 8);
          if (interior.onInterior) {
            return {
              pos: interior.splitPoint,
              snap: {
                point: interior.splitPoint,
                type: 't_junction',
                label: 'T-Junction',
                targetElementId: otherEl.id,
              },
            };
          }
        }
      }

      // Check for midpoints
      const midSnap = snapToMidpoints(p, project.elements, Math.max(12, 14 / zoom), wall.id);
      if (midSnap.snapped) {
        return {
          pos: midSnap.point,
          snap: {
            point: midSnap.point,
            type: 'midpoint',
            label: 'Midpoint',
            targetElementId: midSnap.targetElementId,
          },
        };
      }
    }

    // 3. Grid snap - LOWEST PRIORITY (Subtle alignment, no false corner badge)
    if (enableGridSnap) {
      const gSnap = snapToGrid(p, gridSize, 6 / zoom);
      if (gSnap.snapped) {
        return {
          pos: gSnap.point,
          snap: {
            point: gSnap.point,
            type: 'grid',
            label: 'Grid',
          },
        };
      }
    }

    return { pos: p, snap: null };
  };

  const handleStartDragMove = (e: any) => {
    e.cancelBubble = true;
    const isAlt = Boolean(e.evt?.altKey);
    const rawPos = { x: e.target.x(), y: e.target.y() };
    const { pos, snap } = processEndpointSnap(rawPos, endPt, isAlt);

    e.target.position({ x: pos.x, y: pos.y });
    setDragCurrentPos(pos);
    setSnapIndicator(snap);

    const len = distance(pos, endPt);
    const ang = Math.round(angleDeg(endPt, pos));
    if (onLiveInfo) {
      onLiveInfo(`L: ${formatLength(len, unitSystem)} | ${ang}°`);
    }
  };

  const handleStartDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);
    setActiveHandle(null);
    setSnapIndicator(null);

    const isAlt = Boolean(e.evt?.altKey);
    const rawPos = { x: e.target.x(), y: e.target.y() };
    const { pos } = processEndpointSnap(rawPos, endPt, isAlt);

    // Check if endpoint lands on another wall interior (T-junction split & connect)
    let splitOccurred = false;
    for (const otherEl of project.elements) {
      if (otherEl.id !== wall.id && otherEl.type === 'wall' && !otherEl.locked) {
        const interior = isPointOnWallInterior(pos, otherEl, 10 / zoom, 12 / zoom);
        if (interior.onInterior) {
          splitWallAt(otherEl.id, interior.splitPoint, wall.id, 'start');
          splitOccurred = true;
          break;
        }
      }
    }

    if (!splitOccurred) {
      if (wall.startNodeId) {
        moveWallNode(wall.startNodeId, pos, isAlt, true);
      } else {
        updateElement(wall.id, { start: pos }, true);
      }
    }
    healWalls();
  };

  const handleEndDragMove = (e: any) => {
    e.cancelBubble = true;
    const isAlt = Boolean(e.evt?.altKey);
    const rawPos = { x: e.target.x(), y: e.target.y() };
    const { pos, snap } = processEndpointSnap(rawPos, startPt, isAlt);

    e.target.position({ x: pos.x, y: pos.y });
    setDragCurrentPos(pos);
    setSnapIndicator(snap);

    const len = distance(startPt, pos);
    const ang = Math.round(angleDeg(startPt, pos));
    if (onLiveInfo) {
      onLiveInfo(`L: ${formatLength(len, unitSystem)} | ${ang}°`);
    }
  };

  const handleEndDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);
    setActiveHandle(null);
    setSnapIndicator(null);

    const isAlt = Boolean(e.evt?.altKey);
    const rawPos = { x: e.target.x(), y: e.target.y() };
    const { pos } = processEndpointSnap(rawPos, startPt, isAlt);

    // Check if endpoint lands on another wall interior (T-junction split & connect)
    let splitOccurred = false;
    for (const otherEl of project.elements) {
      if (otherEl.id !== wall.id && otherEl.type === 'wall' && !otherEl.locked) {
        const interior = isPointOnWallInterior(pos, otherEl, 10 / zoom, 12 / zoom);
        if (interior.onInterior) {
          splitWallAt(otherEl.id, interior.splitPoint, wall.id, 'end');
          splitOccurred = true;
          break;
        }
      }
    }

    if (!splitOccurred) {
      if (wall.endNodeId) {
        moveWallNode(wall.endNodeId, pos, isAlt, true);
      } else {
        updateElement(wall.id, { end: pos }, true);
      }
    }
    healWalls();
  };

  // Midpoint handle drag: push perpendicular or bend curve
  const handleMidDragMove = (e: any) => {
    e.cancelBubble = true;
    const node = e.target;
    const curPos = { x: node.x(), y: node.y() };

    // Calculate bulge: perpendicular distance from chord midpoint
    const norm = getWallNormal(startPt, endPt);
    const dx = curPos.x - midPt.x;
    const dy = curPos.y - midPt.y;
    const bulgeDist = dx * norm.x + dy * norm.y;

    if (onLiveInfo) {
      onLiveInfo(`Curve Arc: ${formatLength(Math.abs(bulgeDist), unitSystem)}`);
    }
  };

  const handleMidDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);

    const node = e.target;
    const curPos = { x: node.x(), y: node.y() };
    const norm = getWallNormal(startPt, endPt);
    const dx = curPos.x - midPt.x;
    const dy = curPos.y - midPt.y;
    const bulgeDist = Math.round((dx * norm.x + dy * norm.y) * 10) / 10;

    if (Math.abs(bulgeDist) > 2) {
      if (wall.type === 'curve_wall') {
        updateElement(wall.id, { bulge: bulgeDist }, true);
      } else {
        // Convert to curve_wall with this bulge!
        updateElement(
          wall.id,
          {
            type: 'curve_wall',
            bulge: bulgeDist,
          } as any,
          true
        );
      }
    }
    // Reset handle position back to midPt
    node.position({ x: midPt.x, y: midPt.y });
  };

  return (
    <Group>
      {/* Prominent Magnetic Corner Snap Target & Connected Badge */}
      {snapIndicator && (
        <Group x={snapIndicator.point.x} y={snapIndicator.point.y} listening={false}>
          {snapIndicator.type === 'grid' ? (
            /* Subtle Grid Snap Cursor (No misleading Corner Connected badge) */
            <Group>
              <Circle radius={3 / zoom} fill="#38bdf8" opacity={0.6} />
              <Line points={[-8 / zoom, 0, 8 / zoom, 0]} stroke="#38bdf8" strokeWidth={1 / zoom} opacity={0.4} />
              <Line points={[0, -8 / zoom, 0, 8 / zoom]} stroke="#38bdf8" strokeWidth={1 / zoom} opacity={0.4} />
            </Group>
          ) : snapIndicator.type === 't_junction' ? (
            /* Compact T-Junction Marker (8-10px) with soft ring, thin dashed guides, no heavy glow */
            <Group>
              <Circle
                radius={5 / zoom}
                stroke="#38bdf8"
                strokeWidth={1 / zoom}
                opacity={0.8}
              />
              <Circle radius={2 / zoom} fill="#38bdf8" />
              <Line
                points={[-8 / zoom, 0, 8 / zoom, 0]}
                stroke="#38bdf8"
                strokeWidth={1 / zoom}
                dash={[2 / zoom, 2 / zoom]}
                opacity={0.8}
              />
              <Line
                points={[0, -8 / zoom, 0, 8 / zoom]}
                stroke="#38bdf8"
                strokeWidth={1 / zoom}
                dash={[2 / zoom, 2 / zoom]}
                opacity={0.8}
              />
            </Group>
          ) : snapIndicator.type === 'midpoint' ? (
            /* Wall Midpoint */
            <Group>
              <Circle
                radius={13 / zoom}
                fill="rgba(217, 119, 6, 0.2)"
                stroke="#d97706"
                strokeWidth={2 / zoom}
                shadowColor="#d97706"
                shadowBlur={8}
              />
              <Circle radius={4 / zoom} fill="#f59e0b" />
              <Group y={-30 / zoom}>
                <Rect
                  x={-44 / zoom}
                  y={-10 / zoom}
                  width={88 / zoom}
                  height={20 / zoom}
                  cornerRadius={5 / zoom}
                  fill="#451a03"
                  stroke="#d97706"
                  strokeWidth={1.2 / zoom}
                  shadowColor="#000000"
                  shadowBlur={6}
                />
                <Text
                  x={-44 / zoom}
                  y={-6 / zoom}
                  width={88 / zoom}
                  text="△ Midpoint"
                  align="center"
                  fill="#fbbf24"
                  fontSize={10 / zoom}
                  fontStyle="bold"
                />
              </Group>
            </Group>
          ) : (
            /* Verified Corner / Endpoint Snap */
            <Group>
              <Circle
                radius={15 / zoom}
                fill="rgba(16, 185, 129, 0.2)"
                stroke="#10b981"
                strokeWidth={2.5 / zoom}
                shadowColor="#10b981"
                shadowBlur={10}
              />
              <Circle radius={5 / zoom} fill="#10b981" />
              <Line points={[-24 / zoom, 0, 24 / zoom, 0]} stroke="#10b981" strokeWidth={2 / zoom} />
              <Line points={[0, -24 / zoom, 0, 24 / zoom]} stroke="#10b981" strokeWidth={2 / zoom} />
              <Group y={-32 / zoom}>
                <Rect
                  x={-58 / zoom}
                  y={-10 / zoom}
                  width={116 / zoom}
                  height={20 / zoom}
                  cornerRadius={5 / zoom}
                  fill="#022c22"
                  stroke="#10b981"
                  strokeWidth={1.2 / zoom}
                  shadowColor="#000000"
                  shadowBlur={6}
                />
                <Text
                  x={-58 / zoom}
                  y={-6 / zoom}
                  width={116 / zoom}
                  text="✓ Corner Connected"
                  align="center"
                  fill="#34d399"
                  fontSize={10 / zoom}
                  fontStyle="bold"
                />
              </Group>
            </Group>
          )}
        </Group>
      )}

      {/* Start Endpoint Handle */}
      <Group
        x={startPt.x}
        y={startPt.y}
        draggable
        onDragStart={() => setActiveHandle('start')}
        onDragMove={handleStartDragMove}
        onDragEnd={handleStartDragEnd}
      >
        <Circle
          radius={handleRadius}
          hitStrokeWidth={hitRadius}
          fill="#ffffff"
          stroke="#0284c7"
          strokeWidth={1.5}
          shadowColor="#0284c7"
          shadowBlur={3}
        />
        <Circle
          radius={handleRadius * 0.4}
          fill="#0284c7"
        />
      </Group>

      {/* End Endpoint Handle */}
      <Group
        x={endPt.x}
        y={endPt.y}
        draggable
        onDragStart={() => setActiveHandle('end')}
        onDragMove={handleEndDragMove}
        onDragEnd={handleEndDragEnd}
      >
        <Circle
          radius={handleRadius}
          hitStrokeWidth={hitRadius}
          fill="#ffffff"
          stroke="#0284c7"
          strokeWidth={1.5}
          shadowColor="#0284c7"
          shadowBlur={3}
        />
        <Circle
          radius={handleRadius * 0.4}
          fill="#0284c7"
        />
      </Group>

      {/* Midpoint Bend Handle */}
      <Group
        x={midPt.x}
        y={midPt.y}
        draggable
        onDragStart={() => setActiveHandle('mid')}
        onDragMove={handleMidDragMove}
        onDragEnd={handleMidDragEnd}
      >
        <Circle
          radius={handleRadius * 0.85}
          hitStrokeWidth={hitRadius}
          fill="#ffffff"
          stroke="#f59e0b"
          strokeWidth={1.5}
          shadowColor="#f59e0b"
          shadowBlur={3}
        />
        <Circle
          radius={handleRadius * 0.35}
          fill="#f59e0b"
        />
      </Group>
    </Group>
  );
};
