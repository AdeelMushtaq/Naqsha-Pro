/**
 * Custom Selection Transformer for Naqsha CAD.
 * Attaches to Box, Circle, Furniture, Text, and Plot elements.
 * Converts transforms directly into INCHES and resets scale to 1.
 * Supports:
 * - Corner and edge handles
 * - Rotation handle
 * - Shift to constrain proportions
 * - Alt to resize from center
 * - Live size feedback during transform
 */

import React, { useRef, useEffect } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../../store/useStore';
import { PlanElement } from '../../models/types';

interface SelectionTransformerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  onLiveTransform?: (info: string | null) => void;
}

export const SelectionTransformer: React.FC<SelectionTransformerProps> = ({
  stageRef,
  onLiveTransform,
}) => {
  const trRef = useRef<Konva.Transformer>(null);
  const { selectedIds, project, updateElement, activeTool } = useStore();

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (activeTool !== 'select' || selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    // Attach only to elements that use standard 2D bounding boxes (box, circle, furniture, plot, text)
    // Wall elements use dedicated endpoint/midpoint handles
    const targetNodes: Konva.Node[] = [];

    for (const id of selectedIds) {
      const el = project.elements.find((e) => e.id === id);
      if (!el || el.locked || el.hidden) continue;

      if (
        el.type === 'box' ||
        el.type === 'circle' ||
        el.type === 'furniture' ||
        el.type === 'plot' ||
        el.type === 'text'
      ) {
        const node = stage.findOne(`#${id}`);
        if (node) {
          targetNodes.push(node);
        }
      }
    }

    tr.nodes(targetNodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, project.elements, activeTool, stageRef]);

  const handleTransform = () => {
    const tr = trRef.current;
    if (!tr || !onLiveTransform) return;
    const node = tr.nodes()[0];
    if (!node) {
      onLiveTransform(null);
      return;
    }

    const scaleX = Math.abs(node.scaleX());
    const scaleY = Math.abs(node.scaleY());
    const id = node.id();
    const el = project.elements.find((e) => e.id === id);

    if (el?.type === 'box' || el?.type === 'plot' || el?.type === 'furniture') {
      const curW = Math.round((el as any).width * scaleX);
      const curH = Math.round((el as any).height * scaleY);
      onLiveTransform(`${curW}" × ${curH}"`);
    } else if (el?.type === 'circle') {
      const curR = Math.round((el as any).radius * scaleX);
      onLiveTransform(`R: ${curR}" (Dia: ${curR * 2}")`);
    }
  };

  const handleTransformEnd = () => {
    if (onLiveTransform) onLiveTransform(null);

    const tr = trRef.current;
    if (!tr) return;

    const nodes = tr.nodes();
    for (const node of nodes) {
      const id = node.id();
      const el = project.elements.find((e) => e.id === id);
      if (!el) continue;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = Math.round(node.rotation() % 360);
      const newX = Math.round(node.x() * 10) / 10;
      const newY = Math.round(node.y() * 10) / 10;

      // Always reset scale back to 1.0
      node.scaleX(1);
      node.scaleY(1);

      if (el.type === 'box') {
        const newWidth = Math.max(6, Math.round(el.width * Math.abs(scaleX)));
        const newHeight = Math.max(6, Math.round(el.height * Math.abs(scaleY)));
        updateElement(
          id,
          {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            rotation: rotation < 0 ? rotation + 360 : rotation,
          },
          true
        );
      } else if (el.type === 'circle') {
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        const newRadius = Math.max(4, Math.round(el.radius * avgScale));
        updateElement(
          id,
          {
            x: newX,
            y: newY,
            radius: newRadius,
          },
          true
        );
      } else if (el.type === 'furniture') {
        const newWidth = Math.max(6, Math.round(el.width * Math.abs(scaleX)));
        const newHeight = Math.max(6, Math.round(el.height * Math.abs(scaleY)));
        updateElement(
          id,
          {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            rotation: rotation < 0 ? rotation + 360 : rotation,
          },
          true
        );
      } else if (el.type === 'plot') {
        const newWidth = Math.max(12, Math.round(el.width * Math.abs(scaleX)));
        const newHeight = Math.max(12, Math.round(el.height * Math.abs(scaleY)));
        updateElement(
          id,
          {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          },
          true
        );
      } else if (el.type === 'text') {
        const newFontSize = Math.max(8, Math.round((el.fontSize || 14) * Math.abs(scaleY)));
        updateElement(
          id,
          {
            x: newX,
            y: newY,
            fontSize: newFontSize,
            rotation: rotation < 0 ? rotation + 360 : rotation,
          },
          true
        );
      }
    }
  };

  const selectedEl = selectedIds.length === 1 ? project.elements.find((e) => e.id === selectedIds[0]) : null;
  const isCircle = selectedEl?.type === 'circle';

  return (
    <Transformer
      ref={trRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Enforce minimum dimension
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
      enabledAnchors={
        isCircle
          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
          : [
              'top-left',
              'top-center',
              'top-right',
              'middle-right',
              'bottom-right',
              'bottom-center',
              'bottom-left',
              'middle-left',
            ]
      }
      rotateEnabled={!isCircle}
      keepRatio={isCircle}
      borderStroke="#38bdf8"
      borderStrokeWidth={1.5}
      anchorFill="#0f172a"
      anchorStroke="#38bdf8"
      anchorStrokeWidth={2}
      anchorSize={9}
      anchorCornerRadius={2}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
    />
  );
};
