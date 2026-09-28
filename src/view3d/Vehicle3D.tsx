/**
 * 3D Vehicle & Access Check Environment Renderer for Naqsha CAD.
 * Renders animated vehicle, road network, gate posts with overhead arch, and obstacles.
 */

import React from 'react';
import * as THREE from 'three';
import {
  VehicleCheckSession,
  RoadElement,
  GateElement,
  ObstacleElement,
  WallElement,
} from '../models/types';
import { getGateGeometry } from '../utils/collision';

interface Vehicle3DProps {
  session?: VehicleCheckSession | null;
  playbackProgress: number;
  manualPose?: { x: number; y: number; heading: number; steerAngle: number };
  roads: RoadElement[];
  gates: GateElement[];
  obstacles: ObstacleElement[];
  walls: WallElement[];
}

export const Vehicle3D: React.FC<Vehicle3DProps> = ({
  session,
  playbackProgress,
  manualPose,
  roads,
  gates,
  obstacles,
  walls,
}) => {
  // Determine current vehicle pose
  let activePose: { x: number; y: number; heading: number; steerAngle: number } | null = null;
  if (manualPose) {
    activePose = manualPose;
  } else if (session && session.result && session.result.simulatedPoses.length > 0) {
    const poses = session.result.simulatedPoses;
    const idx = Math.min(
      poses.length - 1,
      Math.max(0, Math.floor(playbackProgress * (poses.length - 1)))
    );
    activePose = poses[idx];
  } else if (session && session.waypoints.length > 0) {
    activePose = {
      x: session.waypoints[0].x,
      y: session.waypoints[0].y,
      heading: 0,
      steerAngle: 0,
    };
  }

  const vehicle = session?.vehicle;

  return (
    <group>
      {/* 3D Access Roads */}
      {roads.map((road) => {
        const dx = road.end.x - road.start.x;
        const dy = road.end.y - road.start.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) return null;

        const midX = (road.start.x + road.end.x) / 2;
        const midZ = (road.start.y + road.end.y) / 2;
        const angle = -Math.atan2(dy, dx);

        return (
          <group key={road.id} position={[midX, 0.5, midZ]} rotation={[0, angle, 0]}>
            {/* Asphalt Surface */}
            <mesh receiveShadow>
              <boxGeometry args={[len, 1, road.width]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            {/* Center Yellow Stripe */}
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[len, 0.2, 4]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* 3D Gate Posts & Overhead Arch / Beam */}
      {gates.map((g) => {
        const hostWall = walls.find((w) => w.id === g.wallId);
        if (!hostWall) return null;
        const gg = getGateGeometry(g, hostWall);
        if (!gg) return null;

        const gateHeight = g.height || 120;
        const postThick = g.postThickness || 18;
        const p1 = gg.leftPostInnerEdge;
        const p2 = gg.rightPostInnerEdge;
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.y + p2.y) / 2;

        return (
          <group key={g.id}>
            {/* Left Post */}
            <mesh position={[p1.x - 9, gateHeight / 2, p1.y]} castShadow receiveShadow>
              <boxGeometry args={[postThick, gateHeight, postThick]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>
            {/* Right Post */}
            <mesh position={[p2.x + 9, gateHeight / 2, p2.y]} castShadow receiveShadow>
              <boxGeometry args={[postThick, gateHeight, postThick]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>
            {/* Overhead Arch / Beam */}
            <mesh position={[midX, gateHeight + 6, midZ]} castShadow>
              <boxGeometry args={[g.width + postThick * 2, 12, postThick]} />
              <meshStandardMaterial color="#475569" roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* 3D Environmental Obstacles */}
      {obstacles.map((obs) => {
        const height = obs.height3d || 96;
        const elevation = obs.elevation || 0;
        const centerY = elevation + height / 2;

        if (obs.obstacleType === 'tree') {
          return (
            <group key={obs.id} position={[obs.x, 0, obs.y]}>
              {/* Trunk */}
              <mesh position={[0, 40, 0]} castShadow>
                <cylinderGeometry args={[6, 8, 80, 12]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              {/* Canopy */}
              <mesh position={[0, 100, 0]} castShadow>
                <sphereGeometry args={[obs.width / 2, 16, 16]} />
                <meshStandardMaterial color="#15803d" roughness={0.6} />
              </mesh>
            </group>
          );
        }

        if (obs.obstacleType === 'hanging_wire') {
          return (
            <group key={obs.id} position={[obs.x, elevation, obs.y]}>
              {/* Hanging Overhead Cable */}
              <mesh castShadow>
                <boxGeometry args={[obs.width, 3, obs.height]} />
                <meshStandardMaterial color="#eab308" roughness={0.3} />
              </mesh>
            </group>
          );
        }

        if (obs.obstacleType === 'pole') {
          return (
            <group key={obs.id} position={[obs.x, height / 2, obs.y]}>
              {/* Concrete/Steel Utility Pole */}
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[4, 5, height, 16]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.5} />
              </mesh>
            </group>
          );
        }

        // Generic block / parked car / neighbor building
        return (
          <group
            key={obs.id}
            position={[obs.x, centerY, obs.y]}
            rotation={[0, -(obs.rotation || 0) * (Math.PI / 180), 0]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[obs.width, height, obs.height]} />
              <meshStandardMaterial
                color={obs.isOverhead ? '#f59e0b' : '#ef4444'}
                roughness={0.6}
                transparent={obs.isOverhead}
                opacity={obs.isOverhead ? 0.7 : 0.9}
              />
            </mesh>
          </group>
        );
      })}

      {/* Active Vehicle 3D Model */}
      {vehicle && activePose && (
        <group
          position={[activePose.x, 0, activePose.y]}
          rotation={[0, -activePose.heading, 0]}
        >
          {/* Main Vehicle Chassis & Body */}
          <mesh
            position={[
              (vehicle.length - vehicle.frontOverhang - vehicle.rearOverhang) / 2,
              vehicle.height / 2 + 4,
              0,
            ]}
            castShadow
          >
            <boxGeometry args={[vehicle.length, vehicle.height - 8, vehicle.width]} />
            <meshStandardMaterial
              color={vehicle.color || '#38bdf8'}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>

          {/* Cabin Windshield glass */}
          <mesh
            position={[
              vehicle.wheelbase * 0.4,
              vehicle.height * 0.75 + 4,
              0,
            ]}
          >
            <boxGeometry
              args={[vehicle.length * 0.35, vehicle.height * 0.4, vehicle.width * 0.9]}
            />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>

          {/* Headlights cone */}
          <pointLight
            position={[vehicle.wheelbase + vehicle.frontOverhang + 10, 20, 0]}
            intensity={15}
            distance={400}
            color="#fef08a"
          />

          {/* 4 Wheels */}
          {[
            [-vehicle.rearOverhang / 2, 8, -vehicle.width / 2 - 2],
            [-vehicle.rearOverhang / 2, 8, vehicle.width / 2 + 2],
            [vehicle.wheelbase, 8, -vehicle.width / 2 - 2],
            [vehicle.wheelbase, 8, vehicle.width / 2 + 2],
          ].map((wPos, wIdx) => (
            <mesh key={wIdx} position={wPos as [number, number, number]} castShadow>
              <cylinderGeometry args={[12, 12, 6, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
