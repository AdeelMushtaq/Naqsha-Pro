/**
 * Central draggable object hook for Naqsha CAD.
 * Handles drag and drop for all 2D plan elements:
 * Box, Circle, Wall, Door, Window, Furniture, Dimension, Plot, and Text.
 *
 * Enforces:
 * - Active tool decision (only draggable in 'select' mode)
 * - Locked or hidden objects NEVER move
 * - Snapping to grid and nodes during drag; Alt key disables snapping
 * - Exactly ONE undo history step committed on drag end
 * - Minimum 20px hit area
 */

import { useRef, useCallback } from 'react';
import Konva from 'konva';
import { useStore } from '../../store/useStore';
import { PlanElement, Point2D } from '../../models/types';
import { snapToGrid, snapToEndpoints } from '../../utils/snapping';

interface UseDraggableObjectOptions {
  element: PlanElement;
  isSelected: boolean;
  onSelect?: (e: any) => void;
  onCustomDragEnd?: (pos: Point2D) => void;
}

export function useDraggableObject({
  element,
  isSelected,
  onSelect,
  onCustomDragEnd,
}: UseDraggableObjectOptions) {
  const {
    activeTool,
    zoom,
    gridSize,
    snapToGrid: enableGridSnap,
    snapToObjects: enableObjectSnap,
    project,
    setActiveTool,
    selectElement,
    updateElement,
    commitHistoryStep,
  } = useStore();

  const isLocked = Boolean(element.locked);
  const isHidden = Boolean(element.hidden);
  const canDrag = activeTool === 'select' && !isLocked && !isHidden;

  const dragStartPosRef = useRef<Point2D | null>(null);

  const handleClick = useCallback(
    (e: any) => {
      // Prevent stage deselect
      e.cancelBubble = true;

      if (activeTool !== 'select') {
        // Double check if drawing tool was active - single click selects in select tool
        return;
      }

      if (onSelect) {
        onSelect(e);
      } else {
        const isMulti = e.evt?.shiftKey;
        selectElement(element.id, isMulti);
      }
    },
    [activeTool, element.id, onSelect, selectElement]
  );

  const handleDblClick = useCallback(
    (e: any) => {
      e.cancelBubble = true;
      // Double click always switches to select tool and selects this object
      if (activeTool !== 'select') {
        setActiveTool('select');
      }
      selectElement(element.id, false);
    },
    [activeTool, element.id, setActiveTool, selectElement]
  );

  const handleDragStart = useCallback(
    (e: any) => {
      e.cancelBubble = true;
      if (!canDrag) {
        e.target.stopDrag();
        return;
      }
      dragStartPosRef.current = {
        x: e.target.x(),
        y: e.target.y(),
      };
      if (!isSelected) {
        selectElement(element.id, e.evt?.shiftKey);
      }
    },
    [canDrag, isSelected, element.id, selectElement]
  );

  const handleDragMove = useCallback(
    (e: any) => {
      e.cancelBubble = true;
      if (!canDrag) return;

      const node = e.target;
      const isAltPressed = Boolean(e.evt?.altKey);

      if (!isAltPressed) {
        let p: Point2D = { x: node.x(), y: node.y() };

        if (enableObjectSnap) {
          const objSnap = snapToEndpoints(p, project.elements, 10 / zoom, element.id);
          if (objSnap.snapped) {
            p = objSnap.point;
          }
        }

        if (enableGridSnap) {
          const gridSnap = snapToGrid(p, gridSize, 6 / zoom);
          if (gridSnap.snapped) {
            p = gridSnap.point;
          }
        }

        node.position({ x: p.x, y: p.y });
      }
    },
    [canDrag, enableObjectSnap, enableGridSnap, project.elements, zoom, element.id, gridSize]
  );

  const handleDragEnd = useCallback(
    (e: any) => {
      e.cancelBubble = true;
      if (!canDrag) return;

      const finalPos: Point2D = {
        x: Math.round(e.target.x() * 10) / 10,
        y: Math.round(e.target.y() * 10) / 10,
      };

      if (onCustomDragEnd) {
        onCustomDragEnd(finalPos);
        // Reset node position so parent coordinate system stays clean
        e.target.position({ x: 0, y: 0 });
      } else if ('x' in element && 'y' in element) {
        // Exactly ONE undo step committed here
        updateElement(element.id, { x: finalPos.x, y: finalPos.y }, true);
      }
      dragStartPosRef.current = null;
    },
    [canDrag, element, onCustomDragEnd, updateElement]
  );

  return {
    draggable: canDrag,
    onClick: handleClick,
    onTap: handleClick,
    onDblClick: handleDblClick,
    onDblTap: handleDblClick,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  };
}
