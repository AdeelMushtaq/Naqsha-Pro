/**
 * Interactive Handles for Doors and Windows in Naqsha CAD.
 * Supports:
 * - Sliding along host wall constrained to wall line
 * - Re-attaching to a different wall if dragged off current wall
 * - Width handles to resize door/window opening
 * - Large touch-friendly hit areas
 */

import React, { useState } from 'react';
import { Group, Circle, Line } from 'react-konva';
import { useStore } from '../../store/useStore';
import { DoorElement, WindowElement, WallElement, CurveWallElement, Point2D } from '../../models/types';
import {
  distance,
  getWallLength,
  getWallNormal,
  projectPointOntoSegment,
  clampOffset,
  getDoorWorldPosition,
} from '../../utils/geometry';
import { formatLength } from '../../utils/units';

interface DoorWindowHandlesProps {
  element: DoorElement | WindowElement;
  wall: WallElement | CurveWallElement;
  onLiveInfo?: (info: string | null) => void;
}

export const DoorWindowHandles: React.FC<DoorWindowHandlesProps> = ({
  element,
  wall,
  onLiveInfo,
}) => {
  const { zoom, unitSystem, project, updateElement } = useStore();

  const handleRadius = Math.max(6, 5 / zoom);
  const hitRadius = Math.max(22, 22 / zoom);

  const wallLen = getWallLength(wall);
  const curOffset = element.offset;
  const width = element.width;

  // Direction vector of wall
  const dirX = wallLen > 0 ? (wall.end.x - wall.start.x) / wallLen : 1;
  const dirY = wallLen > 0 ? (wall.end.y - wall.start.y) / wallLen : 0;

  const centerOffset = curOffset + width / 2;
  const centerPos: Point2D = {
    x: wall.start.x + dirX * centerOffset,
    y: wall.start.y + dirY * centerOffset,
  };

  const startPos: Point2D = {
    x: wall.start.x + dirX * curOffset,
    y: wall.start.y + dirY * curOffset,
  };

  const endPos: Point2D = {
    x: wall.start.x + dirX * (curOffset + width),
    y: wall.start.y + dirY * (curOffset + width),
  };

  // 1. Center slide handle: drag along wall or re-attach to nearest wall
  const handleSlideDragMove = (e: any) => {
    e.cancelBubble = true;
    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };

    // Projection on current wall
    const proj = projectPointOntoSegment(curPos, wall.start, wall.end);
    const newOffset = clampOffset(proj.offset - width / 2, width, wallLen);

    if (onLiveInfo) {
      onLiveInfo(`Offset: ${formatLength(newOffset, unitSystem)}`);
    }
  };

  const handleSlideDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);

    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };

    // Check if dragged far from current wall (> 28px screen)
    const currentProj = projectPointOntoSegment(curPos, wall.start, wall.end);
    if (currentProj.distance > 28 / zoom) {
      // Find nearest other wall
      let nearestWall: WallElement | null = null;
      let minD = Infinity;
      let bestOffset = 0;

      for (const el of project.elements) {
        if (el.type === 'wall' && !el.locked && !el.hidden) {
          const p = projectPointOntoSegment(curPos, el.start, el.end);
          if (p.distance < minD) {
            minD = p.distance;
            nearestWall = el;
            bestOffset = p.offset;
          }
        }
      }

      if (nearestWall && minD < 48 / zoom) {
        const targetLen = getWallLength(nearestWall);
        const safeOffset = clampOffset(bestOffset - width / 2, width, targetLen);
        updateElement(element.id, { wallId: nearestWall.id, offset: safeOffset }, true);
        return;
      }
    }

    // Otherwise stay on current wall
    const newOffset = clampOffset(currentProj.offset - width / 2, width, wallLen);
    updateElement(element.id, { offset: newOffset }, true);
    e.target.position({ x: centerPos.x, y: centerPos.y });
  };

  // 2. Width resize handle at start edge
  const handleWidthStartDragMove = (e: any) => {
    e.cancelBubble = true;
    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };
    const proj = projectPointOntoSegment(curPos, wall.start, wall.end);
    const endEdgeOffset = curOffset + width;
    const newWidth = Math.max(18, Math.round(endEdgeOffset - proj.offset));

    if (onLiveInfo) {
      onLiveInfo(`W: ${formatLength(newWidth, unitSystem)}`);
    }
  };

  const handleWidthStartDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);
    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };
    const proj = projectPointOntoSegment(curPos, wall.start, wall.end);
    const endEdgeOffset = curOffset + width;
    const clampedNewStart = Math.max(0, Math.min(endEdgeOffset - 18, proj.offset));
    const newWidth = Math.round(endEdgeOffset - clampedNewStart);

    updateElement(element.id, { offset: clampedNewStart, width: newWidth }, true);
    e.target.position({ x: startPos.x, y: startPos.y });
  };

  // 3. Width resize handle at end edge
  const handleWidthEndDragMove = (e: any) => {
    e.cancelBubble = true;
    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };
    const proj = projectPointOntoSegment(curPos, wall.start, wall.end);
    const newWidth = Math.max(18, Math.round(proj.offset - curOffset));

    if (onLiveInfo) {
      onLiveInfo(`W: ${formatLength(newWidth, unitSystem)}`);
    }
  };

  const handleWidthEndDragEnd = (e: any) => {
    e.cancelBubble = true;
    if (onLiveInfo) onLiveInfo(null);
    const curPos: Point2D = { x: e.target.x(), y: e.target.y() };
    const proj = projectPointOntoSegment(curPos, wall.start, wall.end);
    const clampedEnd = Math.min(wallLen, Math.max(curOffset + 18, proj.offset));
    const newWidth = Math.round(clampedEnd - curOffset);

    updateElement(element.id, { width: newWidth }, true);
    e.target.position({ x: endPos.x, y: endPos.y });
  };

  return (
    <Group>
      {/* Center Slide Along Wall Handle */}
      <Circle
        x={centerPos.x}
        y={centerPos.y}
        radius={handleRadius + 1}
        hitStrokeWidth={hitRadius}
        fill="#38bdf8"
        stroke="#0f172a"
        strokeWidth={2}
        draggable
        onDragMove={handleSlideDragMove}
        onDragEnd={handleSlideDragEnd}
      />

      {/* Start Edge Resize Handle */}
      <Circle
        x={startPos.x}
        y={startPos.y}
        radius={handleRadius * 0.85}
        hitStrokeWidth={hitRadius}
        fill="#f59e0b"
        stroke="#0f172a"
        strokeWidth={1.5}
        draggable
        onDragMove={handleWidthStartDragMove}
        onDragEnd={handleWidthStartDragEnd}
      />

      {/* End Edge Resize Handle */}
      <Circle
        x={endPos.x}
        y={endPos.y}
        radius={handleRadius * 0.85}
        hitStrokeWidth={hitRadius}
        fill="#f59e0b"
        stroke="#0f172a"
        strokeWidth={1.5}
        draggable
        onDragMove={handleWidthEndDragMove}
        onDragEnd={handleWidthEndDragEnd}
      />
    </Group>
  );
};
