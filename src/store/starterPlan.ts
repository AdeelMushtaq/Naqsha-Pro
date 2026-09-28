import { PlanElement } from '../models/types';

/**
 * Modern 1-Bedroom Apartment / 5-Marla layout sample plan:
 * Main bedroom (14' x 12'), Living room / TV Lounge (16' x 14'),
 * Kitchen (10' x 8'), Attached Bathroom (8' x 6'),
 * Walls, standard 3' doors with swing arcs, and 4' windows.
 * All measurements in INCHES (1 ft = 12 in).
 */
export function getStarterPlan(): PlanElement[] {
  return [
    // Outer boundary walls: 360" (30 ft) x 264" (22 ft)
    {
      id: 'wall-north',
      type: 'wall',
      start: { x: 100, y: 100 },
      end: { x: 460, y: 100 }, // 360 inches = 30 ft
      thickness: 9,
      label: 'North Wall (30ft)',
    },
    {
      id: 'wall-east',
      type: 'wall',
      start: { x: 460, y: 100 },
      end: { x: 460, y: 364 }, // 264 inches = 22 ft
      thickness: 9,
      label: 'East Wall (22ft)',
    },
    {
      id: 'wall-south',
      type: 'wall',
      start: { x: 460, y: 364 },
      end: { x: 100, y: 364 },
      thickness: 9,
      label: 'South Wall (30ft)',
    },
    {
      id: 'wall-west',
      type: 'wall',
      start: { x: 100, y: 364 },
      end: { x: 100, y: 100 },
      thickness: 9,
      label: 'West Wall (22ft)',
    },

    // Interior dividing wall: separating Master Bedroom (left) from Living / Lounge (right)
    // At x = 268 (168 inches = 14 ft from west wall)
    {
      id: 'wall-div-vert',
      type: 'wall',
      start: { x: 268, y: 100 },
      end: { x: 268, y: 364 },
      thickness: 6, // interior 6" wall
      label: 'Bedroom Partition',
    },

    // Bathroom partition wall: 8 ft (96") x 6 ft (72") at bottom-left corner of bedroom
    {
      id: 'wall-bath-horiz',
      type: 'wall',
      start: { x: 100, y: 292 },
      end: { x: 196, y: 292 },
      thickness: 4.5,
      label: 'Bath Wall',
    },
    {
      id: 'wall-bath-vert',
      type: 'wall',
      start: { x: 196, y: 292 },
      end: { x: 196, y: 364 },
      thickness: 4.5,
      label: 'Bath Wall Vert',
    },

    // Curved decorative feature wall / bay window on east side living lounge
    {
      id: 'wall-curve-feature',
      type: 'curve_wall',
      start: { x: 460, y: 160 },
      end: { x: 460, y: 280 },
      bulge: 30, // 2.5 ft curve outward
      thickness: 9,
      label: 'Curved Bay Feature',
    },

    // Doors
    // Bedroom door on wall-div-vert
    {
      id: 'door-bedroom',
      type: 'door',
      wallId: 'wall-div-vert',
      offset: 36, // 3ft from north wall
      width: 36,  // 3ft width
      height: 84, // 7ft
      swingDirection: 'inside_left',
      openAngle: 90,
      label: 'Bedroom Door',
    },
    // Main entrance door on South wall
    {
      id: 'door-main',
      type: 'door',
      wallId: 'wall-south',
      offset: 60, // 5ft from south-east corner
      width: 42,  // 3.5ft entrance door
      height: 84,
      swingDirection: 'inside_right',
      openAngle: 90,
      label: 'Main Entry',
    },
    // Bathroom door on wall-bath-horiz
    {
      id: 'door-bath',
      type: 'door',
      wallId: 'wall-bath-horiz',
      offset: 24,
      width: 30,  // 2.5ft bath door
      height: 80,
      swingDirection: 'inside_left',
      openAngle: 90,
      label: 'Bath Door',
    },

    // Windows
    // Bedroom North Window
    {
      id: 'win-bedroom-north',
      type: 'window',
      wallId: 'wall-north',
      offset: 54, // centered on bedroom north wall
      width: 60,  // 5ft window
      height: 48,
      depth: 9,
      label: 'Bedroom Window',
    },
    // Living room North Window
    {
      id: 'win-lounge-north',
      type: 'window',
      wallId: 'wall-north',
      offset: 230,
      width: 72,  // 6ft wide picture window
      height: 60,
      depth: 9,
      label: 'Lounge Picture Window',
    },

    // Room Box representations for area & labels
    {
      id: 'box-master-bed',
      type: 'box',
      x: 109,
      y: 109,
      width: 150, // 12.5 ft
      height: 174, // 14.5 ft
      rotation: 0,
      fillColor: 'rgba(56, 189, 248, 0.05)',
      strokeColor: 'rgba(56, 189, 248, 0.3)',
      strokeWidth: 1,
      label: 'Master Bedroom',
    },
    {
      id: 'box-tv-lounge',
      type: 'box',
      x: 277,
      y: 109,
      width: 174, // 14.5 ft
      height: 246, // 20.5 ft
      rotation: 0,
      fillColor: 'rgba(245, 158, 11, 0.05)',
      strokeColor: 'rgba(245, 158, 11, 0.3)',
      strokeWidth: 1,
      label: 'Living / TV Lounge',
    },
    // Round coffee table / patio seating circle
    {
      id: 'circle-coffee-table',
      type: 'circle',
      x: 364,
      y: 232,
      radius: 24, // 2 ft radius = 4 ft diameter
      fillColor: 'rgba(168, 85, 247, 0.08)',
      strokeColor: 'rgba(168, 85, 247, 0.5)',
      strokeWidth: 1.5,
      label: 'Dining / Round Table',
    },
  ];
}
