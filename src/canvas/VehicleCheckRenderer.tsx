import React, { useRef } from 'react';
import { Group, Line, Rect, Circle, Text, Arrow } from 'react-konva';
import { VehicleCheckSession, UnitSystem, ThemeMode, Point2D, VehiclePose } from '../models/types';
import { formatLength } from '../utils/units';

interface VehicleCheckRendererProps {
  session: VehicleCheckSession;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  playbackProgress: number;
  manualPose?: { x: number; y: number; heading: number; steerAngle: number };
  onWaypointDrag?: (index: number, newPos: Point2D) => void;
  onWaypointAdd?: (pos: Point2D) => void;
  onManualDriveMove?: (pose: { x: number; y: number; heading: number; steerAngle: number }) => void;
}

export const VehicleCheckRenderer: React.FC<VehicleCheckRendererProps> = ({
  session,
  unitSystem,
  theme,
  playbackProgress,
  manualPose,
  onWaypointDrag,
  onWaypointAdd,
  onManualDriveMove,
}) => {
  const isDark = theme === 'dark';
  const { vehicle, waypoints, result } = session;

  // Find active pose based on manual mode or playback progress
  let activePose: VehiclePose | null = null;
  if (manualPose) {
    activePose = {
      x: manualPose.x,
      y: manualPose.y,
      heading: manualPose.heading,
      steerAngle: manualPose.steerAngle,
      isReverse: false,
      corners: [],
      t: 0,
    };
  } else if (result && result.simulatedPoses.length > 0) {
    const poses = result.simulatedPoses;
    const targetIdx = Math.min(
      poses.length - 1,
      Math.max(0, Math.floor(playbackProgress * (poses.length - 1)))
    );
    activePose = poses[targetIdx];
  } else if (waypoints.length > 0) {
    activePose = {
      x: waypoints[0].x,
      y: waypoints[0].y,
      heading: 0,
      steerAngle: 0,
      isReverse: false,
      corners: [],
      t: 0,
    };
  }

  // Draw vehicle body top-view
  const renderVehicleTopView = (pose: VehiclePose) => {
    const { x, y, heading, steerAngle = 0 } = pose;
    const { length, width, wheelbase, frontOverhang, rearOverhang, mirrorExtraWidth = 8, color } = vehicle;

    const angleDeg = (heading * 180) / Math.PI;
    const steerDeg = (steerAngle * 180) / Math.PI;

    const halfW = width / 2;
    const wheelW = Math.max(8, width * 0.14);
    const wheelL = Math.max(16, length * 0.12);

    return (
      <Group x={x} y={y} rotation={angleDeg}>
        {/* Headlight illumination beams */}
        <Line
          points={[
            wheelbase + frontOverhang,
            -halfW * 0.7,
            wheelbase + frontOverhang + 90,
            -halfW * 1.8,
            wheelbase + frontOverhang + 90,
            halfW * 1.8,
            wheelbase + frontOverhang,
            halfW * 0.7,
          ]}
          closed
          fill="rgba(254, 240, 138, 0.12)"
          opacity={0.8}
        />

        {/* Vehicle Body Box */}
        <Rect
          x={-rearOverhang}
          y={-halfW}
          width={length}
          height={width}
          fill={color || '#38bdf8'}
          stroke="#0f172a"
          strokeWidth={2}
          cornerRadius={6}
          opacity={0.95}
        />

        {/* Cabin Windshield & Roof */}
        <Rect
          x={wheelbase * 0.2}
          y={-halfW * 0.8}
          width={length * 0.45}
          height={width * 1.6 * 0.5}
          fill="rgba(15, 23, 42, 0.75)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={1}
          cornerRadius={3}
        />

        {/* Side Mirrors */}
        {/* Left Mirror */}
        <Rect
          x={wheelbase * 0.75}
          y={-halfW - mirrorExtraWidth}
          width={10}
          height={mirrorExtraWidth}
          fill="#0284c7"
          stroke="#0f172a"
          strokeWidth={1}
          cornerRadius={2}
        />
        {/* Right Mirror */}
        <Rect
          x={wheelbase * 0.75}
          y={halfW}
          width={10}
          height={mirrorExtraWidth}
          fill="#0284c7"
          stroke="#0f172a"
          strokeWidth={1}
          cornerRadius={2}
        />

        {/* 4 Wheels */}
        {/* Rear Left */}
        <Rect
          x={-wheelL / 2}
          y={-halfW - wheelW / 2}
          width={wheelL}
          height={wheelW}
          fill="#1e293b"
          stroke="#0f172a"
          strokeWidth={1}
          cornerRadius={2}
        />
        {/* Rear Right */}
        <Rect
          x={-wheelL / 2}
          y={halfW - wheelW / 2}
          width={wheelL}
          height={wheelW}
          fill="#1e293b"
          stroke="#0f172a"
          strokeWidth={1}
          cornerRadius={2}
        />

        {/* Front Left (Steered) */}
        <Group x={wheelbase} y={-halfW}>
          <Rect
            x={-wheelL / 2}
            y={-wheelW / 2}
            width={wheelL}
            height={wheelW}
            rotation={steerDeg}
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth={1}
            cornerRadius={2}
          />
        </Group>
        {/* Front Right (Steered) */}
        <Group x={wheelbase} y={halfW}>
          <Rect
            x={-wheelL / 2}
            y={-wheelW / 2}
            width={wheelL}
            height={wheelW}
            rotation={steerDeg}
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth={1}
            cornerRadius={2}
          />
        </Group>

        {/* Vehicle Name Tag */}
        <Text
          x={wheelbase * 0.3}
          y={-5}
          text={vehicle.name.split(' ')[0]}
          fontSize={8}
          fontStyle="bold"
          fill="#ffffff"
        />

        {/* Manual Steering Drag Handle */}
        {onManualDriveMove && (
          <Circle
            x={wheelbase + frontOverhang + 30}
            y={0}
            radius={8}
            fill="#eab308"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              const dx = e.target.x();
              const dy = e.target.y();
              const newHeading = heading + Math.atan2(dy, dx);
              const newSteer = Math.max(-0.6, Math.min(0.6, Math.atan2(dy, dx)));
              onManualDriveMove({
                x,
                y,
                heading: newHeading,
                steerAngle: newSteer,
              });
              e.target.position({ x: wheelbase + frontOverhang + 30, y: 0 });
            }}
          />
        )}
      </Group>
    );
  };

  return (
    <Group id="vehicle-check-layer">
      {/* Swept Path Ribbon */}
      {result &&
        result.sweptPolygon &&
        result.sweptPolygon.map((poly, idx) => {
          const flatPoints = poly.flatMap((p) => [p.x, p.y]);
          return (
            <Line
              key={`swept-${idx}`}
              points={flatPoints}
              closed
              fill="rgba(56, 189, 248, 0.22)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dash={[6, 4]}
              opacity={0.8}
            />
          );
        })}

      {/* Path Waypoints & Connecting Lines */}
      {waypoints.map((wp, idx) => {
        const next = waypoints[idx + 1];
        return (
          <Group key={wp.id}>
            {next && (
              <Line
                points={[wp.x, wp.y, next.x, next.y]}
                stroke={next.isReverse ? '#f59e0b' : '#0284c7'}
                strokeWidth={2}
                dash={next.isReverse ? [6, 4] : undefined}
              />
            )}
            <Circle
              x={wp.x}
              y={wp.y}
              radius={8}
              fill={wp.isReverse ? '#f59e0b' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth={2}
              draggable={!!onWaypointDrag}
              onDragMove={(e) => {
                if (onWaypointDrag) {
                  onWaypointDrag(idx, { x: e.target.x(), y: e.target.y() });
                }
              }}
            />
            <Text
              x={wp.x - 4}
              y={wp.y - 4}
              text={`${idx + 1}`}
              fontSize={8}
              fontStyle="bold"
              fill="#ffffff"
            />
          </Group>
        );
      })}

      {/* Active Vehicle Model */}
      {activePose && renderVehicleTopView(activePose)}

      {/* Collision Highlights with Markers */}
      {result &&
        result.collisions.map((col, idx) => (
          <Group key={`col-${idx}`} x={col.x} y={col.y}>
            <Circle radius={18} fill="rgba(239, 68, 68, 0.3)" />
            <Circle radius={10} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
            <Text x={-4} y={-5} text="!" fontSize={10} fontStyle="bold" fill="#ffffff" />
            <Group y={-24}>
              <Rect
                x={-60}
                y={-6}
                width={120}
                height={16}
                fill="rgba(15, 23, 42, 0.9)"
                stroke="#ef4444"
                strokeWidth={1}
                cornerRadius={3}
              />
              <Text
                x={-58}
                y={-4}
                width={116}
                align="center"
                text={col.obstacleName}
                fontSize={8}
                fontStyle="bold"
                fill="#f87171"
                ellipsis
              />
            </Group>
          </Group>
        ))}

      {/* Clearance Markers on Canvas */}
      {result && result.minGateClearancePoint && (
        <Group x={result.minGateClearancePoint.x} y={result.minGateClearancePoint.y}>
          <Circle radius={5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />
          <Group y={12}>
            <Rect
              x={-40}
              y={0}
              width={80}
              height={14}
              fill="rgba(15, 23, 42, 0.85)"
              stroke="#10b981"
              strokeWidth={1}
              cornerRadius={2}
            />
            <Text
              x={-38}
              y={2}
              width={76}
              align="center"
              text={`Gate Cl: ${formatLength(result.minGateClearance, unitSystem)}`}
              fontSize={7.5}
              fontStyle="bold"
              fill="#34d399"
            />
          </Group>
        </Group>
      )}
    </Group>
  );
};
