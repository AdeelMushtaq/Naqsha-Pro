/**
 * 3D Room Floor Slab Renderer for Naqsha CAD.
 * Generates floor slab surfaces from detected closed wall loops.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DetectedRoom } from '../models/types';

interface RoomFloor3DProps {
  rooms: DetectedRoom[];
  baseElevation: number;
  floorThickness: number;
  wireframe: boolean;
  selectedIds: string[];
  onSelectElement: (id: string) => void;
}

export const RoomFloor3D: React.FC<RoomFloor3DProps> = ({
  rooms,
  baseElevation,
  floorThickness = 5,
  wireframe,
  selectedIds,
  onSelectElement,
}) => {
  return (
    <group>
      {rooms.map((room) => {
        if (!room.points || room.points.length < 3) return null;
        const isSelected = selectedIds.includes(room.id);

        const shape = new THREE.Shape();
        const p0 = room.points[0];
        shape.moveTo(p0.x, p0.y);

        for (let i = 1; i < room.points.length; i++) {
          shape.lineTo(room.points[i].x, room.points[i].y);
        }
        shape.closePath();

        const extrudeSettings = {
          steps: 1,
          depth: floorThickness,
          bevelEnabled: false,
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        return (
          <group
            key={room.id}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, baseElevation, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(room.id);
            }}
          >
            <mesh geometry={geom} receiveShadow>
              <meshStandardMaterial
                color={isSelected ? '#38bdf8' : '#f8fafc'}
                roughness={0.8}
                metalness={0.05}
                wireframe={wireframe}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
