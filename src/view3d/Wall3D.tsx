/**
 * 3D Wall Renderer for Naqsha CAD.
 * Generates solid wall segments around real door and window openings
 * without boolean CSG operations for maximum performance and stability.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
} from '../models/types';
import { getWallLength, distance, angleDeg } from '../utils/geometry';
import { buildWall3DOpenings } from '../utils/geometry3d';

interface Wall3DProps {
  wall: WallElement | CurveWallElement;
  doors: DoorElement[];
  windows: WindowElement[];
  baseElevation: number;
  isSelected: boolean;
  wireframe: boolean;
  selectedIds: string[];
  onSelectElement: (id: string) => void;
}

export const Wall3D: React.FC<Wall3DProps> = ({
  wall,
  doors,
  windows,
  baseElevation,
  isSelected,
  wireframe,
  selectedIds,
  onSelectElement,
}) => {
  const wallLen = getWallLength(wall);
  const thickness = wall.thickness || 9;
  const wallHeight = wall.height || 120;

  // Build openings & solid segments
  const openingsResult = useMemo(() => {
    return buildWall3DOpenings(wall, doors, windows, wallHeight);
  }, [wall, doors, windows, wallHeight]);

  // Wall angle and direction in XZ plane
  const angleRad = useMemo(() => {
    return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  }, [wall.start, wall.end]);

  const dirX = wallLen > 0 ? (wall.end.x - wall.start.x) / wallLen : 1;
  const dirY = wallLen > 0 ? (wall.end.y - wall.start.y) / wallLen : 0;

  const wallColor = isSelected ? '#38bdf8' : '#e2e8f0';

  return (
    <group>
      {/* 1. Wall Solid Segments, Sills, and Lintels */}
      {openingsResult.segments.map((seg, idx) => {
        const segLen = seg.endOffset - seg.startOffset;
        if (segLen <= 0.1) return null;

        const segHeight = seg.topElevation - seg.bottomElevation;
        if (segHeight <= 0.1) return null;

        const centerOffset = seg.startOffset + segLen / 2;
        const posX = wall.start.x + dirX * centerOffset;
        const posZ = wall.start.y + dirY * centerOffset;
        const posY = baseElevation + seg.bottomElevation + segHeight / 2;

        return (
          <mesh
            key={`seg-${idx}`}
            position={[posX, posY, posZ]}
            rotation={[0, -angleRad, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(wall.id);
            }}
          >
            <boxGeometry args={[segLen, segHeight, thickness]} />
            <meshStandardMaterial
              color={wallColor}
              roughness={0.7}
              metalness={0.05}
              wireframe={wireframe}
            />
          </mesh>
        );
      })}

      {/* 2. Window Openings: Frames and Glass Panes */}
      {openingsResult.windowFrames.map((wf, idx) => {
        const winElem = windows.find((w) => w.offset === wf.offset);
        const isWinSelected = winElem ? selectedIds.includes(winElem.id) : false;
        const centerOffset = wf.offset + wf.width / 2;
        const posX = wall.start.x + dirX * centerOffset;
        const posZ = wall.start.y + dirY * centerOffset;
        const posY = baseElevation + wf.sillHeight + wf.height / 2;

        return (
          <group
            key={`win-${idx}`}
            position={[posX, posY, posZ]}
            rotation={[0, -angleRad, 0]}
            onClick={(e) => {
              if (winElem) {
                e.stopPropagation();
                onSelectElement(winElem.id);
              }
            }}
          >
            {/* Window Frame border */}
            <mesh castShadow>
              <boxGeometry args={[wf.width, wf.height, wf.depth + 1]} />
              <meshStandardMaterial
                color={isWinSelected ? '#38bdf8' : '#334155'}
                roughness={0.5}
                wireframe={wireframe}
              />
            </mesh>

            {/* Inner Glass Pane */}
            <mesh>
              <boxGeometry args={[wf.width - 3, wf.height - 3, 1]} />
              <meshPhysicalMaterial
                color="#7dd3fc"
                transparent
                opacity={0.4}
                roughness={0.1}
                transmission={0.8}
                thickness={1}
              />
            </mesh>
          </group>
        );
      })}

      {/* 3. Door Openings: Panels (open or closed) */}
      {openingsResult.doorPanels.map((dp, idx) => {
        const doorElem = doors.find((d) => d.offset === dp.offset);
        const isDoorSelected = doorElem ? selectedIds.includes(doorElem.id) : false;
        const centerOffset = dp.offset + dp.width / 2;
        const posX = wall.start.x + dirX * centerOffset;
        const posZ = wall.start.y + dirY * centerOffset;
        const posY = baseElevation + dp.height / 2;

        const doorAngle = dp.isOpen ? Math.PI / 2.5 : 0;

        return (
          <group
            key={`door-${idx}`}
            position={[posX, posY, posZ]}
            rotation={[0, -angleRad + doorAngle, 0]}
            onClick={(e) => {
              if (doorElem) {
                e.stopPropagation();
                onSelectElement(doorElem.id);
              }
            }}
          >
            {/* Door Leaf Panel */}
            <mesh castShadow>
              <boxGeometry args={[dp.width, dp.height, dp.thickness]} />
              <meshStandardMaterial
                color={isDoorSelected ? '#38bdf8' : '#d97706'}
                roughness={0.4}
                wireframe={wireframe}
              />
            </mesh>

            {/* Door Handle */}
            <mesh position={[dp.width / 2 - 4, 0, dp.thickness / 2 + 1]}>
              <cylinderGeometry args={[0.8, 0.8, 3, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
