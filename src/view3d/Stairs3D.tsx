/**
 * 3D Parametric Stairs Renderer for Naqsha CAD.
 * Generates true 3D steps, landings, handrails, and spiral geometries.
 * All dimensions are in inches.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { StairElement } from '../models/types';
import { calculateStairParameters } from '../utils/stairs';

interface Stairs3DProps {
  stairs: StairElement[];
  baseElevation: number;
  wireframe: boolean;
  selectedIds: string[];
  onSelectElement: (id: string) => void;
}

export const Stairs3D: React.FC<Stairs3DProps> = ({
  stairs,
  baseElevation,
  wireframe,
  selectedIds,
  onSelectElement,
}) => {
  return (
    <group>
      {stairs.map((stair) => {
        const isSelected = selectedIds.includes(stair.id);
        const {
          stairType,
          width = 42,
          length = 120,
          flight2Length = 80,
          landingSize = 42,
          totalHeight = 120,
          targetRiser = 6.0,
          treadDepth = 10.0,
          handrail = true,
          rotation = 0,
        } = stair;

        const { numSteps, calculatedRiser } = calculateStairParameters(
          totalHeight,
          targetRiser,
          treadDepth
        );

        const stepMatColor = isSelected ? '#f43f5e' : '#cbd5e1';
        const railMatColor = '#f59e0b';
        const rad = -(rotation * Math.PI) / 180;

        return (
          <group
            key={stair.id}
            position={[stair.x, baseElevation, stair.y]}
            rotation={[0, rad, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(stair.id);
            }}
          >
            {/* Straight Flight */}
            {stairType === 'straight' && (
              <group>
                {Array.from({ length: numSteps }).map((_, i) => {
                  const stepX = (i + 0.5) * treadDepth;
                  const stepY = (i + 0.5) * calculatedRiser;
                  const stepZ = width / 2;

                  return (
                    <mesh
                      key={i}
                      position={[stepX, stepY, stepZ]}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[treadDepth, calculatedRiser, width]} />
                      <meshStandardMaterial
                        color={stepMatColor}
                        roughness={0.5}
                        wireframe={wireframe}
                      />
                    </mesh>
                  );
                })}

                {/* Handrail slope */}
                {handrail && (
                  <group>
                    <mesh
                      position={[
                        (numSteps * treadDepth) / 2,
                        (numSteps * calculatedRiser) / 2 + 34,
                        width - 2,
                      ]}
                      rotation={[
                        0,
                        0,
                        Math.atan2(
                          numSteps * calculatedRiser,
                          numSteps * treadDepth
                        ),
                      ]}
                    >
                      <boxGeometry
                        args={[
                          Math.hypot(
                            numSteps * treadDepth,
                            numSteps * calculatedRiser
                          ),
                          3,
                          3,
                        ]}
                      />
                      <meshStandardMaterial color={railMatColor} roughness={0.4} />
                    </mesh>
                  </group>
                )}
              </group>
            )}

            {/* L-Shape Flight with Landing */}
            {stairType === 'l_shape' && (() => {
              const flight1Steps = Math.ceil(numSteps / 2);
              const flight2Steps = numSteps - flight1Steps;
              const f1Run = flight1Steps * treadDepth;

              return (
                <group>
                  {/* Flight 1 Steps */}
                  {Array.from({ length: flight1Steps }).map((_, i) => (
                    <mesh
                      key={`f1-${i}`}
                      position={[
                        (i + 0.5) * treadDepth,
                        (i + 0.5) * calculatedRiser,
                        width / 2,
                      ]}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[treadDepth, calculatedRiser, width]} />
                      <meshStandardMaterial color={stepMatColor} roughness={0.5} wireframe={wireframe} />
                    </mesh>
                  ))}

                  {/* Landing Box */}
                  <mesh
                    position={[
                      f1Run + landingSize / 2,
                      flight1Steps * calculatedRiser - calculatedRiser / 2,
                      landingSize / 2,
                    ]}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[landingSize, calculatedRiser, landingSize]} />
                    <meshStandardMaterial color={stepMatColor} roughness={0.5} wireframe={wireframe} />
                  </mesh>

                  {/* Flight 2 Steps (Turned 90 degrees along Z) */}
                  {Array.from({ length: flight2Steps }).map((_, j) => (
                    <mesh
                      key={`f2-${j}`}
                      position={[
                        f1Run + landingSize - width / 2,
                        (flight1Steps + j + 0.5) * calculatedRiser,
                        landingSize + (j + 0.5) * treadDepth,
                      ]}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[width, calculatedRiser, treadDepth]} />
                      <meshStandardMaterial color={stepMatColor} roughness={0.5} wireframe={wireframe} />
                    </mesh>
                  ))}
                </group>
              );
            })()}

            {/* U-Shape / Dog-legged */}
            {stairType === 'u_shape' && (() => {
              const halfSteps = Math.ceil(numSteps / 2);
              const fRun = halfSteps * treadDepth;
              const gap = 8;

              return (
                <group>
                  {/* Flight 1 */}
                  {Array.from({ length: halfSteps }).map((_, i) => (
                    <mesh
                      key={`u1-${i}`}
                      position={[
                        (i + 0.5) * treadDepth,
                        (i + 0.5) * calculatedRiser,
                        width / 2,
                      ]}
                      castShadow
                    >
                      <boxGeometry args={[treadDepth, calculatedRiser, width]} />
                      <meshStandardMaterial color={stepMatColor} roughness={0.5} />
                    </mesh>
                  ))}

                  {/* Landing */}
                  <mesh
                    position={[
                      fRun + landingSize / 2,
                      halfSteps * calculatedRiser - calculatedRiser / 2,
                      (width * 2 + gap) / 2,
                    ]}
                    castShadow
                  >
                    <boxGeometry args={[landingSize, calculatedRiser, width * 2 + gap]} />
                    <meshStandardMaterial color={stepMatColor} roughness={0.5} />
                  </mesh>

                  {/* Flight 2 Returning */}
                  {Array.from({ length: halfSteps }).map((_, j) => (
                    <mesh
                      key={`u2-${j}`}
                      position={[
                        fRun - (j + 0.5) * treadDepth,
                        (halfSteps + j + 0.5) * calculatedRiser,
                        width + gap + width / 2,
                      ]}
                      castShadow
                    >
                      <boxGeometry args={[treadDepth, calculatedRiser, width]} />
                      <meshStandardMaterial color={stepMatColor} roughness={0.5} />
                    </mesh>
                  ))}
                </group>
              );
            })()}

            {/* Spiral Stairs */}
            {(stairType === 'spiral' || stairType === 'winder') && (
              <group>
                {/* Central Pole */}
                <mesh position={[width, totalHeight / 2, width]}>
                  <cylinderGeometry args={[4, 4, totalHeight, 16]} />
                  <meshStandardMaterial color="#64748b" roughness={0.4} />
                </mesh>

                {/* Spiral Wedge Steps */}
                {Array.from({ length: numSteps }).map((_, i) => {
                  const angle = (i * (stairType === 'spiral' ? 360 : 180) * (Math.PI / 180)) / numSteps;
                  const stepY = (i + 0.5) * calculatedRiser;

                  return (
                    <group
                      key={`sp-${i}`}
                      position={[width, stepY, width]}
                      rotation={[0, angle, 0]}
                    >
                      <mesh position={[width / 2, 0, 0]} castShadow>
                        <boxGeometry args={[width, calculatedRiser, 12]} />
                        <meshStandardMaterial color={stepMatColor} roughness={0.5} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};
