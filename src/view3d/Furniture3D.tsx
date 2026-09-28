/**
 * Parametric 3D Architectural Furniture & Fixtures for Naqsha CAD.
 * Builds beds, sofas, tables, kitchen counters, bathtubs, stairs with steps,
 * columns, and beams.
 */

import React from 'react';
import { FurnitureElement } from '../models/types';

interface Furniture3DProps {
  furniture: FurnitureElement[];
  baseElevation: number;
  wireframe: boolean;
  selectedIds: string[];
  onSelectElement: (id: string) => void;
}

export const Furniture3D: React.FC<Furniture3DProps> = ({
  furniture,
  baseElevation,
  wireframe,
  selectedIds,
  onSelectElement,
}) => {
  return (
    <group>
      {furniture.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        const { width, height, category, rotation = 0 } = item;
        const centerX = item.x + width / 2;
        const centerZ = item.y + height / 2;
        const elev = baseElevation + (item.elevation || 0);

        const highlightColor = '#38bdf8';

        return (
          <group
            key={item.id}
            position={[centerX, elev, centerZ]}
            rotation={[0, -rotation * (Math.PI / 180), 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(item.id);
            }}
          >
            {/* BED */}
            {category === 'bed' && (
              <group>
                {/* Bed Frame */}
                <mesh position={[0, 5, 0]} castShadow>
                  <boxGeometry args={[width, 10, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#52525b'} wireframe={wireframe} />
                </mesh>
                {/* Mattress */}
                <mesh position={[0, 14, 0]} castShadow>
                  <boxGeometry args={[width - 4, 10, height - 4]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#f4f4f5'} wireframe={wireframe} />
                </mesh>
                {/* Headboard */}
                <mesh position={[0, 22, -height / 2 + 2]} castShadow>
                  <boxGeometry args={[width, 26, 4]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#3f3f46'} wireframe={wireframe} />
                </mesh>
                {/* Pillows */}
                <mesh position={[-width / 4, 21, -height / 3]} castShadow>
                  <boxGeometry args={[width / 2.5, 4, height / 4]} />
                  <meshStandardMaterial color="#e4e4e7" />
                </mesh>
                <mesh position={[width / 4, 21, -height / 3]} castShadow>
                  <boxGeometry args={[width / 2.5, 4, height / 4]} />
                  <meshStandardMaterial color="#e4e4e7" />
                </mesh>
              </group>
            )}

            {/* SOFA */}
            {category === 'sofa' && (
              <group>
                {/* Seat Cushion */}
                <mesh position={[0, 9, 2]} castShadow>
                  <boxGeometry args={[width, 14, height - 8]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#3b82f6'} wireframe={wireframe} />
                </mesh>
                {/* Backrest */}
                <mesh position={[0, 20, -height / 2 + 4]} castShadow>
                  <boxGeometry args={[width, 24, 8]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#1d4ed8'} wireframe={wireframe} />
                </mesh>
                {/* Armrest Left */}
                <mesh position={[-width / 2 + 3, 16, 0]} castShadow>
                  <boxGeometry args={[6, 18, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#1e40af'} wireframe={wireframe} />
                </mesh>
                {/* Armrest Right */}
                <mesh position={[width / 2 - 3, 16, 0]} castShadow>
                  <boxGeometry args={[6, 18, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#1e40af'} wireframe={wireframe} />
                </mesh>
              </group>
            )}

            {/* TABLE */}
            {category === 'table' && (
              <group>
                {/* Table Top */}
                <mesh position={[0, 29, 0]} castShadow>
                  <boxGeometry args={[width, 2.5, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#78350f'} wireframe={wireframe} />
                </mesh>
                {/* 4 Legs */}
                {[
                  [-width / 2 + 3, -height / 2 + 3],
                  [width / 2 - 3, -height / 2 + 3],
                  [-width / 2 + 3, height / 2 - 3],
                  [width / 2 - 3, height / 2 - 3],
                ].map(([lx, lz], i) => (
                  <mesh key={i} position={[lx, 14, lz]} castShadow>
                    <boxGeometry args={[3, 28, 3]} />
                    <meshStandardMaterial color="#451a03" />
                  </mesh>
                ))}
              </group>
            )}

            {/* COUNTER */}
            {category === 'counter' && (
              <group>
                {/* Cabinet Base */}
                <mesh position={[0, 17, 0]} castShadow>
                  <boxGeometry args={[width, 34, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#475569'} wireframe={wireframe} />
                </mesh>
                {/* Polished Countertop */}
                <mesh position={[0, 35, 0]} castShadow>
                  <boxGeometry args={[width + 2, 2, height + 2]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.1} />
                </mesh>
              </group>
            )}

            {/* BATH */}
            {category === 'bath' && (
              <group>
                {/* Bathtub shell */}
                <mesh position={[0, 11, 0]} castShadow>
                  <boxGeometry args={[width, 22, height]} />
                  <meshStandardMaterial color={isSelected ? highlightColor : '#f8fafc'} wireframe={wireframe} />
                </mesh>
                {/* Inner tub basin cutout approximation */}
                <mesh position={[0, 12, 0]}>
                  <boxGeometry args={[width - 8, 20, height - 8]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.1} />
                </mesh>
              </group>
            )}

            {/* STAIRS */}
            {category === 'stairs' && (
              <group>
                {Array.from({ length: 12 }).map((_, stepIdx) => {
                  const stepCount = 12;
                  const stepHeight = 120 / stepCount; // 10" riser
                  const stepDepth = height / stepCount;
                  const stepY = stepHeight * (stepIdx + 0.5);
                  const stepZ = -height / 2 + stepDepth * (stepIdx + 0.5);

                  return (
                    <mesh key={stepIdx} position={[0, stepY, stepZ]} castShadow>
                      <boxGeometry args={[width, stepHeight, stepDepth]} />
                      <meshStandardMaterial color={isSelected ? highlightColor : '#71717a'} wireframe={wireframe} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {/* COLUMN */}
            {category === 'column' && (
              <mesh position={[0, 60, 0]} castShadow>
                <cylinderGeometry args={[Math.min(width, height) / 2, Math.min(width, height) / 2, 120, 24]} />
                <meshStandardMaterial color={isSelected ? highlightColor : '#94a3b8'} wireframe={wireframe} />
              </mesh>
            )}

            {/* BEAM */}
            {category === 'beam' && (
              <mesh position={[0, 114, 0]} castShadow>
                <boxGeometry args={[width, 12, height]} />
                <meshStandardMaterial color={isSelected ? highlightColor : '#64748b'} wireframe={wireframe} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
