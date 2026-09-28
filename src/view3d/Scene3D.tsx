/**
 * 3D Three.js Scene Component for Naqsha CAD.
 * Handles lighting, shadows, camera controls, floor stacking, and element rendering.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import {
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  BoxElement,
  CircleElement,
  FurnitureElement,
  PlotElement,
  StairElement,
  RoadElement,
  GateElement,
  ObstacleElement,
} from '../models/types';
import { PlotGround3D } from './PlotGround3D';
import { Wall3D } from './Wall3D';
import { RoomFloor3D } from './RoomFloor3D';
import { Shapes3D } from './Shapes3D';
import { Furniture3D } from './Furniture3D';
import { Stairs3D } from './Stairs3D';
import { Vehicle3D } from './Vehicle3D';
import { WalkthroughControls } from './WalkthroughControls';
import { calculateFloorElevation } from '../utils/geometry3d';

interface Scene3DProps {
  onSceneReady?: (scene: THREE.Scene) => void;
}

export const Scene3D: React.FC<Scene3DProps> = ({ onSceneReady }) => {
  const { scene, gl } = useThree();
  const orbitRef = useRef<any>(null);

  const {
    project,
    selectedIds,
    theme,
    cameraMode3d,
    floorViewMode3d,
    sunTimeOfDay,
    sectionCutHeight,
    wireframe3d,
    activeVehicleCheckId,
    vehicleCheckPlaybackProgress,
    manualDrivePose,
    selectElement,
  } = useStore();

  useEffect(() => {
    if (onSceneReady) {
      onSceneReady(scene);
    }
  }, [scene, onSceneReady]);

  // Section cut clipping plane
  useEffect(() => {
    if (sectionCutHeight < 300) {
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionCutHeight);
      gl.clippingPlanes = [plane];
      gl.localClippingEnabled = true;
    } else {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    }
  }, [sectionCutHeight, gl]);

  // Sun position calculation based on time of day (0-24 hrs)
  const sunPos = useMemo(() => {
    const angle = ((sunTimeOfDay - 6) / 12) * Math.PI;
    const x = Math.cos(angle) * 800;
    const y = Math.max(100, Math.sin(angle) * 700);
    const z = 400;
    return [x, y, z] as [number, number, number];
  }, [sunTimeOfDay]);

  const plot = project.elements.find((e): e is PlotElement => e.type === 'plot');
  const floors = project.floors || [
    { id: 'floor-ground', name: 'Ground Floor', level: 0, elements: project.elements },
  ];

  const activeSession =
    project.vehicleChecks?.find((c) => c.id === activeVehicleCheckId) ||
    project.vehicleChecks?.[0];

  const roads = project.elements.filter((e): e is RoadElement => e.type === 'road');
  const gates = project.elements.filter((e): e is GateElement => e.type === 'gate');
  const obstacles = project.elements.filter((e): e is ObstacleElement => e.type === 'obstacle');
  const allWalls = project.elements.filter((e): e is WallElement => e.type === 'wall');

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={theme === 'dark' ? 0.6 : 0.8} />
      <directionalLight
        position={sunPos}
        intensity={theme === 'dark' ? 1.4 : 1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={2500}
        shadow-camera-left={-800}
        shadow-camera-right={800}
        shadow-camera-top={800}
        shadow-camera-bottom={-800}
        shadow-bias={-0.0005}
      />
      <hemisphereLight
        args={[
          theme === 'dark' ? '#38bdf8' : '#e0f2fe',
          theme === 'dark' ? '#0f172a' : '#f1f5f9',
          0.4,
        ]}
      />

      {/* Camera Controls */}
      {cameraMode3d === 'orbit' ? (
        <OrbitControls
          ref={orbitRef}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.05} // Do not go below ground
          minDistance={20}
          maxDistance={2500}
        />
      ) : (
        <WalkthroughControls eyeHeight={66} speed={200} />
      )}

      {/* Ground & Plot Boundary */}
      <PlotGround3D plot={plot} theme={theme} />

      {/* Vehicle Check 3D Environment (Roads, Gates, Obstacles, Animated Vehicle) */}
      <Vehicle3D
        session={activeSession}
        playbackProgress={vehicleCheckPlaybackProgress}
        manualPose={manualDrivePose}
        roads={roads}
        gates={gates}
        obstacles={obstacles}
        walls={allWalls}
      />

      {/* Stacked Floors Rendering */}
      {floors.map((floor) => {
        const { elevation, isVisible } = calculateFloorElevation(
          floors,
          floor.id,
          floorViewMode3d,
          project.activeFloorId
        );

        if (!isVisible) return null;

        const flElements = floor.elements || [];
        const walls = flElements.filter(
          (e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall'
        );
        const doors = flElements.filter((e): e is DoorElement => e.type === 'door');
        const windows = flElements.filter((e): e is WindowElement => e.type === 'window');
        const boxes = flElements.filter((e): e is BoxElement => e.type === 'box');
        const circles = flElements.filter((e): e is CircleElement => e.type === 'circle');
        const furniture = flElements.filter((e): e is FurnitureElement => e.type === 'furniture');
        const stairs = flElements.filter((e): e is StairElement => e.type === 'stair');

        return (
          <group key={floor.id}>
            {/* Room Floor Slabs */}
            <RoomFloor3D
              rooms={project.elements ? useStore.getState().detectedRooms : []}
              baseElevation={elevation}
              floorThickness={floor.floorThickness || 5}
              wireframe={wireframe3d}
              selectedIds={selectedIds}
              onSelectElement={(id) => selectElement(id, false)}
            />

            {/* Extruded Walls with Openings */}
            {walls.map((w) => {
              const wallDoors = doors.filter((d) => d.wallId === w.id);
              const wallWindows = windows.filter((win) => win.wallId === w.id);

              return (
                <Wall3D
                  key={w.id}
                  wall={w}
                  doors={wallDoors}
                  windows={wallWindows}
                  baseElevation={elevation}
                  isSelected={selectedIds.includes(w.id)}
                  wireframe={wireframe3d}
                  selectedIds={selectedIds}
                  onSelectElement={(id) => selectElement(id, false)}
                />
              );
            })}

            {/* Box & Circle Extruded Shapes */}
            <Shapes3D
              boxes={boxes}
              circles={circles}
              baseElevation={elevation}
              wireframe={wireframe3d}
              selectedIds={selectedIds}
              onSelectElement={(id) => selectElement(id, false)}
            />

            {/* Parametric 3D Furniture */}
            <Furniture3D
              furniture={furniture}
              baseElevation={elevation}
              wireframe={wireframe3d}
              selectedIds={selectedIds}
              onSelectElement={(id) => selectElement(id, false)}
            />

            {/* Parametric 3D Stairs */}
            <Stairs3D
              stairs={stairs}
              baseElevation={elevation}
              wireframe={wireframe3d}
              selectedIds={selectedIds}
              onSelectElement={(id) => selectElement(id, false)}
            />
          </group>
        );
      })}
    </>
  );
};
