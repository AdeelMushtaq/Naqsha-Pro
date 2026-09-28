/**
 * 3D Ground & Plot Boundary plane for Naqsha CAD.
 */

import React from 'react';
import * as THREE from 'three';
import { PlotElement, ThemeMode } from '../models/types';

interface PlotGround3DProps {
  plot?: PlotElement;
  theme: ThemeMode;
}

export const PlotGround3D: React.FC<PlotGround3DProps> = ({ plot, theme }) => {
  const isDark = theme === 'dark';

  // If a plot boundary is specified, use its bounds; otherwise standard site grid ground
  const width = plot?.width || 1200;
  const height = plot?.height || 1200;
  const centerX = plot ? plot.x + width / 2 : 300;
  const centerZ = plot ? plot.y + height / 2 : 300;

  const groundColor = isDark ? '#0b1120' : '#f1f5f9';
  const gridColor = isDark ? '#1e293b' : '#cbd5e1';
  const borderColor = '#eab308'; // Amber boundary line

  return (
    <group position={[centerX, -0.5, centerZ]}>
      {/* Ground plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.5, height * 1.5]} />
        <meshStandardMaterial color={groundColor} roughness={0.9} />
      </mesh>

      {/* Plot boundary marker border */}
      {plot && (
        <group position={[0, 0.6, 0]}>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(width, 1, height)]} />
            <lineBasicMaterial color={borderColor} linewidth={2} />
          </lineSegments>
        </group>
      )}

      {/* Coordinate grid lines on ground */}
      <gridHelper
        args={[Math.max(width, height) * 1.5, 30, gridColor, gridColor]}
        position={[0, 0.1, 0]}
      />
    </group>
  );
};
