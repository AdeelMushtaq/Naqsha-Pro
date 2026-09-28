/**
 * Kinematic Vehicle Swept Path Generator for Naqsha CAD.
 * Simulates body envelopes, steering angle limits, and mirror clearances.
 * All units are in INCHES internally.
 */

import { Point2D, Vehicle, PathWaypoint, VehiclePose } from '../models/types';

/**
 * Calculates oriented polygon for the vehicle body including mirrors at given pose
 */
export function getVehicleBodyPolygon(
  pose: { x: number; y: number; heading: number },
  vehicle: Vehicle
): Point2D[] {
  const { x, y, heading } = pose;
  const {
    length,
    width,
    wheelbase,
    frontOverhang,
    rearOverhang,
    mirrorExtraWidth = 8,
  } = vehicle;

  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);
  const perpX = -sinH;
  const perpY = cosH;

  const halfW = width / 2;
  const totalHalfW = halfW + mirrorExtraWidth;

  const frontDist = wheelbase + frontOverhang;
  const rearDist = -rearOverhang;
  const mirrorDist = wheelbase * 0.8; // mirrors location near A-pillar

  // 8-point contour: Rear corners, cabin mirrors, front corners
  const pRearLeft: Point2D = {
    x: x + rearDist * cosH - halfW * perpX,
    y: y + rearDist * sinH - halfW * perpY,
  };
  const pRearRight: Point2D = {
    x: x + rearDist * cosH + halfW * perpX,
    y: y + rearDist * sinH + halfW * perpY,
  };
  const pMirrorRightRear: Point2D = {
    x: x + (mirrorDist - 10) * cosH + totalHalfW * perpX,
    y: y + (mirrorDist - 10) * sinH + totalHalfW * perpY,
  };
  const pMirrorRightFront: Point2D = {
    x: x + (mirrorDist + 10) * cosH + totalHalfW * perpX,
    y: y + (mirrorDist + 10) * sinH + totalHalfW * perpY,
  };
  const pFrontRight: Point2D = {
    x: x + frontDist * cosH + halfW * perpX,
    y: y + frontDist * sinH + halfW * perpY,
  };
  const pFrontLeft: Point2D = {
    x: x + frontDist * cosH - halfW * perpX,
    y: y + frontDist * sinH - halfW * perpY,
  };
  const pMirrorLeftFront: Point2D = {
    x: x + (mirrorDist + 10) * cosH - totalHalfW * perpX,
    y: y + (mirrorDist + 10) * sinH - totalHalfW * perpY,
  };
  const pMirrorLeftRear: Point2D = {
    x: x + (mirrorDist - 10) * cosH - totalHalfW * perpX,
    y: y + (mirrorDist - 10) * sinH - totalHalfW * perpY,
  };

  return [
    pRearLeft,
    pMirrorLeftRear,
    pMirrorLeftFront,
    pFrontLeft,
    pFrontRight,
    pMirrorRightFront,
    pMirrorRightRear,
    pRearRight,
  ];
}

/**
 * Simulates vehicle trajectory along waypoints using a kinematic bicycle model.
 * Constrains turning rate to vehicle's minimum turning radius.
 */
export function simulateVehiclePath(
  vehicle: Vehicle,
  waypoints: PathWaypoint[],
  stepSizeInches: number = 8.0
): { poses: VehiclePose[]; sweptPolygon: Point2D[][] } {
  if (waypoints.length < 2) {
    return { poses: [], sweptPolygon: [] };
  }

  const poses: VehiclePose[] = [];
  const leftEdge: Point2D[] = [];
  const rightEdge: Point2D[] = [];

  const L = Math.max(20, vehicle.wheelbase);
  const Rmin = Math.max(L * 1.1, vehicle.minTurningRadius);
  const maxSteer = Math.atan(L / Rmin);

  // Compute total path segments
  for (let s = 0; s < waypoints.length - 1; s++) {
    const pStart = waypoints[s];
    const pEnd = waypoints[s + 1];
    const isReverse = pEnd.isReverse ?? false;

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const segDist = Math.hypot(dx, dy);
    if (segDist < 1.0) continue;

    const segHeading = isReverse ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
    const numSubSteps = Math.max(4, Math.ceil(segDist / stepSizeInches));

    let currentHeading = poses.length > 0 ? poses[poses.length - 1].heading : segHeading;

    for (let i = 0; i <= numSubSteps; i++) {
      const alpha = i / numSubSteps;
      const curX = pStart.x + dx * alpha;
      const curY = pStart.y + dy * alpha;

      // Desired heading towards target
      let targetHeading = segHeading;
      if (i < numSubSteps) {
        targetHeading = Math.atan2(pEnd.y - curY, pEnd.x - curX);
        if (isReverse) targetHeading += Math.PI;
      }

      // Smooth heading with steering limit
      let headingDiff = targetHeading - currentHeading;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

      // Rate of heading change dHeading / ds <= tan(steer) / L
      const maxHeadingDelta = (Math.tan(maxSteer) / L) * stepSizeInches;
      const clampedDelta = Math.max(-maxHeadingDelta, Math.min(maxHeadingDelta, headingDiff));
      currentHeading += clampedDelta;

      const steerAngle = Math.atan((clampedDelta / stepSizeInches) * L);

      const pose = { x: curX, y: curY, heading: currentHeading };
      const bodyPolygon = getVehicleBodyPolygon(pose, vehicle);

      // Track left-most and right-most points for the swept corridor
      // Body polygon points: index 1,2 are left mirror, 5,6 are right mirror
      const pLeft = bodyPolygon[2] || bodyPolygon[0];
      const pRight = bodyPolygon[5] || bodyPolygon[4];
      leftEdge.push(pLeft);
      rightEdge.push(pRight);

      poses.push({
        x: curX,
        y: curY,
        heading: currentHeading,
        steerAngle,
        isReverse,
        corners: bodyPolygon,
        t: (s + alpha) / (waypoints.length - 1),
      });
    }
  }

  // Build swept corridor contour
  const sweptPolygon: Point2D[][] = [];
  if (leftEdge.length > 1 && rightEdge.length > 1) {
    const contour: Point2D[] = [...leftEdge, ...rightEdge.reverse()];
    sweptPolygon.push(contour);
  }

  return { poses, sweptPolygon };
}

/**
 * Generates an automated entry path from a road starting point into a gate.
 * Computes a smooth turn arc respecting the vehicle's minimum turning radius.
 */
export function generateAutoPath(
  roadPoint: Point2D,
  roadDirectionAngle: number,
  gateCenter: Point2D,
  gateNormalAngle: number, // direction into the plot (perpendicular to wall)
  vehicle: Vehicle
): PathWaypoint[] {
  const waypoints: PathWaypoint[] = [];
  const Rmin = Math.max(vehicle.wheelbase * 1.2, vehicle.minTurningRadius);

  // 1. Initial point on road aligned with road direction
  waypoints.push({
    id: 'wp-start',
    x: roadPoint.x,
    y: roadPoint.y,
  });

  // 2. Approach point before turning
  const approachDist = Math.max(Rmin * 0.8, 120);
  const pApproach: Point2D = {
    x: roadPoint.x + Math.cos(roadDirectionAngle) * approachDist,
    y: roadPoint.y + Math.sin(roadDirectionAngle) * approachDist,
  };
  waypoints.push({
    id: 'wp-approach',
    x: pApproach.x,
    y: pApproach.y,
  });

  // 3. Smooth transition arc point between road and gate normal
  const midAngle = (roadDirectionAngle + gateNormalAngle) / 2;
  const turnApex: Point2D = {
    x: (pApproach.x + gateCenter.x) / 2 + Math.cos(midAngle) * (Rmin * 0.2),
    y: (pApproach.y + gateCenter.y) / 2 + Math.sin(midAngle) * (Rmin * 0.2),
  };
  waypoints.push({
    id: 'wp-turn',
    x: turnApex.x,
    y: turnApex.y,
  });

  // 4. Gate center entry threshold
  waypoints.push({
    id: 'wp-gate',
    x: gateCenter.x,
    y: gateCenter.y,
  });

  // 5. Final parking/courtyard stop inside the plot along gate normal
  const insideDist = Math.max(vehicle.length + 36, 180);
  const pInside: Point2D = {
    x: gateCenter.x + Math.cos(gateNormalAngle) * insideDist,
    y: gateCenter.y + Math.sin(gateNormalAngle) * insideDist,
  };
  waypoints.push({
    id: 'wp-inside',
    x: pInside.x,
    y: pInside.y,
  });

  return waypoints;
}
