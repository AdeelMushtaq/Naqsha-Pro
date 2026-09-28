/**
 * 3D Box and Circle Element Renderer for Naqsha CAD.
 * Supports solid block or hollow room mode.
 */

import React from 'react';
import { BoxElement, CircleElement } from '../models/types';

interface Shapes3DProps {
  boxes: BoxElement[];
  circles: CircleElement[];
  baseElevation: number;
  wireframe: boolean;
  selectedIds: string[];
  onSelectElement: (id: string) => void;
}

export const Shapes3D: React.FC<Shapes3DProps> = ({
  boxes,
  circles,
  baseElevation,
  wireframe,
  selectedIds,
  onSelectElement,
}) => {
  return (
    <group>
      {/* Box elements */}
      {boxes.map((b) => {
        const isSelected = selectedIds.includes(b.id);
        const height = b.height3d || 120;
        const centerX = b.x + b.width / 2;
        const centerZ = b.y + b.height / 2;
        const posY = baseElevation + height / 2;

        return (
          <group key={b.id} position={[centerX, posY, centerZ]} rotation={[0, -(b.rotation || 0) * (Math.PI / 180), 0]}>
            <mesh
              castShadow
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(b.id);
              }}
            >
              <boxGeometry args={[b.width, height, b.height]} />
              <meshStandardMaterial
                color={isSelected ? '#38bdf8' : b.strokeColor || '#94a3b8'}
                transparent
                opacity={b.isHollow ? 0.3 : 0.85}
                roughness={0.6}
                wireframe={wireframe}
              />
            </mesh>
          </group>
        );
      })}

      {/* Circle elements */}
      {circles.map((c) => {
        const isSelected = selectedIds.includes(c.id);
        const height = c.height3d || 120;
        const posY = baseElevation + height / 2;

        return (
          <group key={c.id} position={[c.x, posY, c.y]}>
            <mesh
              castShadow
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(c.id);
              }}
            >
              <cylinderGeometry args={[c.radius, c.radius, height, 32]} />
              <meshStandardMaterial
                color={isSelected ? '#38bdf8' : c.strokeColor || '#a855f7'}
                transparent
                opacity={c.isHollow ? 0.3 : 0.85}
                roughness={0.6}
                wireframe={wireframe}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
