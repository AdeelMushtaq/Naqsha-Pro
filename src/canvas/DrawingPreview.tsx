import React from 'react';
import { Group, Line, Rect, Circle, Text, Shape } from 'react-konva';
import { Point2D, ToolType, UnitSystem, ThemeMode, SnapFeedback } from '../models/types';
import { distance, angleDeg, getWallNormal } from '../utils/geometry';
import { formatLength } from '../utils/units';

interface DrawingPreviewProps {
  tool: ToolType;
  startPoint: Point2D | null;
  currentPoint: Point2D | null;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  snapGuide?: SnapFeedback | Point2D | null;
}

export const DrawingPreview: React.FC<DrawingPreviewProps> = ({
  tool,
  startPoint,
  currentPoint,
  unitSystem,
  theme,
  snapGuide,
}) => {
  const isDark = theme === 'dark';
  const previewColor = '#38bdf8'; // Sky cyan

  // Normalize snap guide feedback
  const snapObj: SnapFeedback | null = snapGuide
    ? 'type' in snapGuide
      ? (snapGuide as SnapFeedback)
      : { point: snapGuide as Point2D, type: 'corner', label: 'Corner Connected' }
    : null;

  return (
    <Group listening={false}>
      {/* Prominent Magnetic Corner Snap Indicator & Badge */}
      {snapObj && (
        <Group x={snapObj.point.x} y={snapObj.point.y}>
          {snapObj.type === 'grid' ? (
            /* Subtle Grid Snap Cursor (No misleading Corner Connected badge) */
            <Group>
              <Circle radius={3} fill="#38bdf8" opacity={0.6} />
              <Line points={[-8, 0, 8, 0]} stroke="#38bdf8" strokeWidth={1} opacity={0.4} />
              <Line points={[0, -8, 0, 8]} stroke="#38bdf8" strokeWidth={1} opacity={0.4} />
            </Group>
          ) : snapObj.type === 't_junction' ? (
            /* Compact T-Junction Marker (8-10px) with soft ring, thin dashed guides, no heavy glow */
            <Group>
              <Circle
                radius={5}
                stroke="#38bdf8"
                strokeWidth={1}
                opacity={0.8}
              />
              <Circle radius={2} fill="#38bdf8" />
              <Line
                points={[-8, 0, 8, 0]}
                stroke="#38bdf8"
                strokeWidth={1}
                dash={[2, 2]}
                opacity={0.8}
              />
              <Line
                points={[0, -8, 0, 8]}
                stroke="#38bdf8"
                strokeWidth={1}
                dash={[2, 2]}
                opacity={0.8}
              />
            </Group>
          ) : snapObj.type === 'midpoint' ? (
            /* Wall Midpoint */
            <Group>
              <Circle
                radius={13}
                fill="rgba(217, 119, 6, 0.2)"
                stroke="#d97706"
                strokeWidth={2}
                shadowColor="#d97706"
                shadowBlur={8}
              />
              <Circle radius={4} fill="#f59e0b" />
              <Group y={-30}>
                <Rect
                  x={-44}
                  y={-10}
                  width={88}
                  height={20}
                  cornerRadius={5}
                  fill="#451a03"
                  stroke="#d97706"
                  strokeWidth={1.2}
                  shadowColor="#000000"
                  shadowBlur={6}
                />
                <Text
                  x={-44}
                  y={-6}
                  width={88}
                  text="△ Midpoint"
                  align="center"
                  fill="#fbbf24"
                  fontSize={10}
                  fontStyle="bold"
                />
              </Group>
            </Group>
          ) : (
            /* Verified Corner / Endpoint Snap */
            <Group>
              {/* Glowing Target Ring */}
              <Circle
                radius={15}
                fill="rgba(16, 185, 129, 0.2)"
                stroke="#10b981"
                strokeWidth={2.5}
                shadowColor="#10b981"
                shadowBlur={10}
              />
              {/* Inner pulse center */}
              <Circle radius={5} fill="#10b981" />
              {/* Extended Crosshairs */}
              <Line points={[-24, 0, 24, 0]} stroke="#10b981" strokeWidth={2} />
              <Line points={[0, -24, 0, 24]} stroke="#10b981" strokeWidth={2} />
              {/* Corner Connected Badge */}
              <Group y={-32}>
                <Rect
                  x={-58}
                  y={-10}
                  width={116}
                  height={20}
                  cornerRadius={5}
                  fill="#022c22"
                  stroke="#10b981"
                  strokeWidth={1.2}
                  shadowColor="#000000"
                  shadowBlur={6}
                />
                <Text
                  x={-58}
                  y={-6}
                  width={116}
                  text="✓ Corner Connected"
                  align="center"
                  fill="#34d399"
                  fontSize={10}
                  fontStyle="bold"
                />
              </Group>
            </Group>
          )}
        </Group>
      )}

      {/* Drawing in progress preview */}
      {startPoint && currentPoint && (
        <>
          {/* Straight Wall Preview */}
          {tool === 'wall' && (
            <Group>
              {(() => {
                const len = distance(startPoint, currentPoint);
                const normal = getWallNormal(startPoint, currentPoint);
                const halfThick = 4.5; // 9" default wall
                const nx = normal.x * halfThick;
                const ny = normal.y * halfThick;
                const poly = [
                  startPoint.x + nx, startPoint.y + ny,
                  currentPoint.x + nx, currentPoint.y + ny,
                  currentPoint.x - nx, currentPoint.y - ny,
                  startPoint.x - nx, startPoint.y - ny,
                ];

                const midX = (startPoint.x + currentPoint.x) / 2;
                const midY = (startPoint.y + currentPoint.y) / 2;

                return (
                  <>
                    <Line points={poly} closed fill="rgba(56, 189, 248, 0.25)" stroke={previewColor} strokeWidth={1.5} />
                    <Line points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]} stroke={previewColor} strokeWidth={1} dash={[4, 4]} />
                    {/* Live dimension label */}
                    <Text
                      x={midX + normal.x * 14}
                      y={midY + normal.y * 14}
                      text={formatLength(len, unitSystem)}
                      fontSize={11}
                      fontStyle="bold"
                      fill={previewColor}
                      align="center"
                      offsetX={18}
                      offsetY={6}
                    />
                  </>
                );
              })()}
            </Group>
          )}

          {/* Curved Wall Preview */}
          {tool === 'curve_wall' && (
            <Group>
              {(() => {
                const chordLen = distance(startPoint, currentPoint);
                const normal = getWallNormal(startPoint, currentPoint);
                const defaultBulge = chordLen * 0.2;
                const midX = (startPoint.x + currentPoint.x) / 2;
                const midY = (startPoint.y + currentPoint.y) / 2;
                const ctrlX = midX + normal.x * defaultBulge;
                const ctrlY = midY + normal.y * defaultBulge;

                return (
                  <>
                    <Shape
                      sceneFunc={(ctx, shape) => {
                        ctx.beginPath();
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.quadraticCurveTo(ctrlX, ctrlY, currentPoint.x, currentPoint.y);
                        ctx.fillStrokeShape(shape);
                      }}
                      stroke={previewColor}
                      strokeWidth={9}
                      lineCap="round"
                      opacity={0.6}
                    />
                    <Text
                      x={ctrlX + normal.x * 12}
                      y={ctrlY + normal.y * 12}
                      text={`Curve: ${formatLength(chordLen, unitSystem)}`}
                      fontSize={11}
                      fontStyle="bold"
                      fill={previewColor}
                    />
                  </>
                );
              })()}
            </Group>
          )}

          {/* Box / Room Preview */}
          {tool === 'box' && (
            <Group>
              {(() => {
                const x = Math.min(startPoint.x, currentPoint.x);
                const y = Math.min(startPoint.y, currentPoint.y);
                const w = Math.abs(currentPoint.x - startPoint.x);
                const h = Math.abs(currentPoint.y - startPoint.y);

                return (
                  <>
                    <Rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="rgba(56, 189, 248, 0.15)"
                      stroke={previewColor}
                      strokeWidth={1.5}
                      dash={[4, 4]}
                    />
                    {/* Live width x height dimension */}
                    <Text
                      x={x + w / 2}
                      y={y + h / 2}
                      text={`${formatLength(w, unitSystem)} × ${formatLength(h, unitSystem)}`}
                      fontSize={11}
                      fontStyle="bold"
                      fill={previewColor}
                      align="center"
                      offsetX={36}
                      offsetY={6}
                    />
                  </>
                );
              })()}
            </Group>
          )}

          {/* Circle Preview */}
          {tool === 'circle' && (
            <Group>
              {(() => {
                const r = distance(startPoint, currentPoint);
                return (
                  <>
                    <Circle
                      x={startPoint.x}
                      y={startPoint.y}
                      radius={r}
                      fill="rgba(168, 85, 247, 0.15)"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      dash={[4, 4]}
                    />
                    <Line
                      points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]}
                      stroke="#a855f7"
                      strokeWidth={1}
                    />
                    <Text
                      x={(startPoint.x + currentPoint.x) / 2}
                      y={(startPoint.y + currentPoint.y) / 2 - 12}
                      text={`R: ${formatLength(r, unitSystem)}`}
                      fontSize={11}
                      fontStyle="bold"
                      fill="#c084fc"
                    />
                  </>
                );
              })()}
            </Group>
          )}

          {/* Measuring Tape Preview */}
          {tool === 'measure' && (
            <Group>
              {(() => {
                const d = distance(startPoint, currentPoint);
                const midX = (startPoint.x + currentPoint.x) / 2;
                const midY = (startPoint.y + currentPoint.y) / 2;
                return (
                  <>
                    <Line
                      points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                    <Circle x={startPoint.x} y={startPoint.y} radius={4} fill="#f59e0b" />
                    <Circle x={currentPoint.x} y={currentPoint.y} radius={4} fill="#f59e0b" />
                    <Rect
                      x={midX - 35}
                      y={midY - 14}
                      width={70}
                      height={20}
                      fill="#0f172a"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      cornerRadius={4}
                    />
                    <Text
                      x={midX}
                      y={midY}
                      text={formatLength(d, unitSystem)}
                      fontSize={11}
                      fontStyle="bold"
                      fill="#fbbf24"
                      align="center"
                      offsetX={28}
                      offsetY={5}
                    />
                  </>
                );
              })()}
            </Group>
          )}
        </>
      )}
    </Group>
  );
};
