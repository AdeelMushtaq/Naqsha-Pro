import { Project, PlanElement } from '../models/types';
import { getWallPolygon, getCurveWallArc, getDoorWorldPosition } from './geometry';

/**
 * Generates an AutoCAD compatible ASCII DXF (Release 12 / AC1009) string.
 */
export function generateDXF(project: Project): string {
  const lines: string[] = [];

  const add = (...args: (string | number)[]) => {
    args.forEach((a) => lines.push(String(a)));
  };

  // 1. Header Section
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009'); // Standard universal compatibility
  add(9, '$INSUNITS');
  add(70, 1); // 1 = Inches
  add(0, 'ENDSEC');

  // 2. Tables Section (Layers)
  add(0, 'SECTION');
  add(2, 'TABLES');
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 6);

  const layerDefs = [
    { name: 'WALLS', color: 7 }, // White/black
    { name: 'DOORS', color: 1 }, // Red
    { name: 'WINDOWS', color: 4 }, // Cyan
    { name: 'FURNITURE', color: 6 }, // Magenta
    { name: 'DIMENSIONS', color: 3 }, // Green
    { name: 'PLOT', color: 2 }, // Yellow
    { name: 'NOTES', color: 7 },
    { name: 'STAIRS', color: 5 }, // Blue
    { name: 'ROADS', color: 8 }, // Grey
  ];

  for (const lyr of layerDefs) {
    add(0, 'LAYER');
    add(2, lyr.name);
    add(70, 0);
    add(62, lyr.color);
    add(6, 'CONTINUOUS');
  }
  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // 3. Entities Section
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  // Helper to add line
  const addDXFLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    layer = 'WALLS'
  ) => {
    // In CAD y coordinates are inverted compared to web canvas (Y up)
    const cadY1 = -y1;
    const cadY2 = -y2;
    add(0, 'LINE');
    add(8, layer);
    add(10, Math.round(x1 * 100) / 100);
    add(20, Math.round(cadY1 * 100) / 100);
    add(30, 0.0);
    add(11, Math.round(x2 * 100) / 100);
    add(21, Math.round(cadY2 * 100) / 100);
    add(31, 0.0);
  };

  // Helper to add circle
  const addDXFCircle = (cx: number, cy: number, radius: number, layer = 'FURNITURE') => {
    add(0, 'CIRCLE');
    add(8, layer);
    add(10, Math.round(cx * 100) / 100);
    add(20, Math.round(-cy * 100) / 100);
    add(30, 0.0);
    add(40, Math.round(radius * 100) / 100);
  };

  // Helper to add text
  const addDXFText = (
    x: number,
    y: number,
    text: string,
    height = 8,
    layer = 'NOTES'
  ) => {
    if (!text) return;
    add(0, 'TEXT');
    add(8, layer);
    add(10, Math.round(x * 100) / 100);
    add(20, Math.round(-y * 100) / 100);
    add(30, 0.0);
    add(40, height);
    add(1, text);
  };

  // Iterate over elements and render DXF equivalents
  project.elements.forEach((el) => {
    if (el.hidden) return;

    if (el.type === 'wall') {
      // Wall centerline
      addDXFLine(el.start.x, el.start.y, el.end.x, el.end.y, 'WALLS');

      // Thick wall outline polygon
      const poly = getWallPolygon(el);
      for (let i = 0; i < 4; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % 4];
        addDXFLine(p1.x, p1.y, p2.x, p2.y, 'WALLS');
      }
    } else if (el.type === 'curve_wall') {
      const arc = getCurveWallArc(el);
      // Approximate curve wall with straight segments
      const segs = 16;
      let prevPt = el.start;
      const angleRange = arc.counterClockwise
        ? (arc.endAngle - arc.startAngle + Math.PI * 2) % (Math.PI * 2)
        : (arc.startAngle - arc.endAngle + Math.PI * 2) % (Math.PI * 2);

      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const curAngle =
          arc.startAngle + (arc.counterClockwise ? 1 : -1) * t * angleRange;
        const pt = {
          x: arc.center.x + Math.cos(curAngle) * arc.radius,
          y: arc.center.y + Math.sin(curAngle) * arc.radius,
        };
        addDXFLine(prevPt.x, prevPt.y, pt.x, pt.y, 'WALLS');
        prevPt = pt;
      }
    } else if (el.type === 'door') {
      const hostWall = project.elements.find((w) => w.id === el.wallId);
      if (hostWall && (hostWall.type === 'wall' || hostWall.type === 'curve_wall')) {
        const doorPos = getDoorWorldPosition(hostWall, el);
        addDXFLine(
          doorPos.startPoint.x,
          doorPos.startPoint.y,
          doorPos.endPoint.x,
          doorPos.endPoint.y,
          'DOORS'
        );
      }
    } else if (el.type === 'window') {
      const hostWall = project.elements.find((w) => w.id === el.wallId);
      if (hostWall && (hostWall.type === 'wall' || hostWall.type === 'curve_wall')) {
        const p1 = hostWall.start;
        addDXFLine(p1.x, p1.y, p1.x + el.width, p1.y, 'WINDOWS');
      }
    } else if (el.type === 'box') {
      const { x, y, width, height } = el;
      addDXFLine(x, y, x + width, y, 'FURNITURE');
      addDXFLine(x + width, y, x + width, y + height, 'FURNITURE');
      addDXFLine(x + width, y + height, x, y + height, 'FURNITURE');
      addDXFLine(x, y + height, x, y, 'FURNITURE');
      if (el.label) {
        addDXFText(x + width / 2, y + height / 2, el.label, 10, 'NOTES');
      }
    } else if (el.type === 'circle') {
      addDXFCircle(el.x, el.y, el.radius, 'FURNITURE');
      if (el.label) {
        addDXFText(el.x, el.y, el.label, 8, 'NOTES');
      }
    } else if (el.type === 'plot') {
      const { x, y, width, height } = el;
      addDXFLine(x, y, x + width, y, 'PLOT');
      addDXFLine(x + width, y, x + width, y + height, 'PLOT');
      addDXFLine(x + width, y + height, x, y + height, 'PLOT');
      addDXFLine(x, y + height, x, y, 'PLOT');
      addDXFText(x + 20, y + 20, el.label || 'PLOT BOUNDARY', 12, 'PLOT');
    } else if (el.type === 'dimension') {
      addDXFLine(el.start.x, el.start.y, el.end.x, el.end.y, 'DIMENSIONS');
    } else if (el.type === 'text') {
      addDXFText(el.x, el.y, el.text, el.fontSize || 10, 'NOTES');
    } else if (el.type === 'stair') {
      const { x, y, width, length, rotation = 0, numSteps = 16, label } = el;
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const toWorld = (lx: number, ly: number) => ({
        x: x + lx * cos - ly * sin,
        y: y + lx * sin + ly * cos,
      });

      // Stair outer boundary box
      const p1 = toWorld(0, 0);
      const p2 = toWorld(length, 0);
      const p3 = toWorld(length, width);
      const p4 = toWorld(0, width);
      addDXFLine(p1.x, p1.y, p2.x, p2.y, 'STAIRS');
      addDXFLine(p2.x, p2.y, p3.x, p3.y, 'STAIRS');
      addDXFLine(p3.x, p3.y, p4.x, p4.y, 'STAIRS');
      addDXFLine(p4.x, p4.y, p1.x, p1.y, 'STAIRS');

      // Tread lines
      const stepPitch = length / Math.max(1, numSteps);
      for (let s = 1; s < numSteps; s++) {
        const sp1 = toWorld(s * stepPitch, 0);
        const sp2 = toWorld(s * stepPitch, width);
        addDXFLine(sp1.x, sp1.y, sp2.x, sp2.y, 'STAIRS');
      }

      // Direction walkline arrow
      const walkStart = toWorld(10, width / 2);
      const walkEnd = toWorld(length - 10, width / 2);
      addDXFLine(walkStart.x, walkStart.y, walkEnd.x, walkEnd.y, 'STAIRS');
      addDXFText(toWorld(length / 2, width / 2 - 8).x, toWorld(length / 2, width / 2 - 8).y, `${label || 'STAIRS'} (UP)`, 8, 'STAIRS');
    } else if (el.type === 'road') {
      const { start, end, width = 240, name } = el;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        const nx = (-dy / len) * (width / 2);
        const ny = (dx / len) * (width / 2);

        // Center line
        addDXFLine(start.x, start.y, end.x, end.y, 'ROADS');
        // Left curb
        addDXFLine(start.x + nx, start.y + ny, end.x + nx, end.y + ny, 'ROADS');
        // Right curb
        addDXFLine(start.x - nx, start.y - ny, end.x - nx, end.y - ny, 'ROADS');

        if (name) {
          addDXFText((start.x + end.x) / 2, (start.y + end.y) / 2 + 12, name, 12, 'ROADS');
        }
      }
    } else if (el.type === 'gate') {
      const hostWall = project.elements.find((w) => w.id === el.wallId);
      if (hostWall && hostWall.type === 'wall') {
        const wallLen = Math.hypot(hostWall.end.x - hostWall.start.x, hostWall.end.y - hostWall.start.y);
        if (wallLen > 0) {
          const t1 = Math.max(0, Math.min(1, el.offset / wallLen));
          const t2 = Math.max(0, Math.min(1, (el.offset + el.width) / wallLen));
          const p1 = {
            x: hostWall.start.x + (hostWall.end.x - hostWall.start.x) * t1,
            y: hostWall.start.y + (hostWall.end.y - hostWall.start.y) * t1,
          };
          const p2 = {
            x: hostWall.start.x + (hostWall.end.x - hostWall.start.x) * t2,
            y: hostWall.start.y + (hostWall.end.y - hostWall.start.y) * t2,
          };
          addDXFLine(p1.x, p1.y, p2.x, p2.y, 'DOORS');
          addDXFText((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, `GATE: ${el.label || 'Main Gate'} (${Math.round(el.width / 12)}ft)`, 8, 'DOORS');
        }
      }
    } else if (el.type === 'obstacle') {
      const { x, y, width = 36, height = 36, label, height3d = 96 } = el;
      addDXFLine(x - width / 2, y - height / 2, x + width / 2, y - height / 2, 'NOTES');
      addDXFLine(x + width / 2, y - height / 2, x + width / 2, y + height / 2, 'NOTES');
      addDXFLine(x + width / 2, y + height / 2, x - width / 2, y + height / 2, 'NOTES');
      addDXFLine(x - width / 2, y + height / 2, x - width / 2, y - height / 2, 'NOTES');
      addDXFText(x, y, `${label || 'Obstacle'} (H:${Math.round(height3d / 12)}ft)`, 7, 'NOTES');
    }
  });

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\n');
}

/**
 * Initiates download of .dxf file in browser
 */
export function exportProjectToDXF(project: Project): void {
  const dxfContent = generateDXF(project);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha_cad';
  link.download = `${safeName}.dxf`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const generateDxfString = generateDXF;
