import React from 'react';
import { Group, Line } from 'react-konva';
import { WallJunction } from '../utils/wallJoin';
import { ThemeMode } from '../models/types';

interface WallJunctionRendererProps {
  junctions: WallJunction[];
  selectedIds: string[];
  theme: ThemeMode;
}

export const WallJunctionRenderer: React.FC<WallJunctionRendererProps> = ({
  junctions,
  selectedIds,
  theme,
}) => {
  const isDark = theme === 'dark';
  const defaultWallFill = isDark ? '#1e293b' : '#e2e8f0';
  const defaultWallStroke = isDark ? '#64748b' : '#475569';
  const selectedStroke = '#38bdf8';

  return (
    <Group id="wall-junctions-layer" listening={false}>
      {junctions.map((junc) => {
        // Only highlight the corner junction in cyan when ALL walls meeting at this junction are selected
        const isCornerSelected = junc.wallIds.length >= 2 && junc.wallIds.every((id) => selectedIds.includes(id));
        const strokeColor = isCornerSelected ? selectedStroke : defaultWallStroke;
        const strokeWidth = isCornerSelected ? 2 : 1.2;

        return (
          <Group key={junc.id}>
            {/* Seamless corner fill polygon matching wall masonry */}
            {junc.fillPoints.length >= 6 && (
              <Line
                points={junc.fillPoints}
                closed
                fill={defaultWallFill}
                strokeWidth={0}
              />
            )}

            {/* Continuous corner boundary strokes (outer and inner bends) */}
            {junc.strokeLines.map((line, idx) => (
              <Line
                key={`junc-line-${idx}`}
                points={line}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                lineCap="square"
                lineJoin="miter"
                miterLimit={3}
                shadowColor={isCornerSelected ? selectedStroke : 'transparent'}
                shadowBlur={isCornerSelected ? 6 : 0}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
};
