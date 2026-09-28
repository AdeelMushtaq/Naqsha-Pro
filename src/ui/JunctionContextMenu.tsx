/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStore } from '../store/useStore';
import { Point2D, WallElement, CurveWallElement } from '../models/types';
import { canJoinWalls } from '../utils/wallSplitJoin';
import { translations } from '../i18n';
import { Scissors, GitMerge, Link2, Unlink, Sparkles } from 'lucide-react';

export interface ContextMenuState {
  isOpen: boolean;
  x: number; // screen coordinate
  y: number; // screen coordinate
  worldPos: Point2D;
  targetWallId?: string;
  targetNodeId?: string;
  closeNodeId?: string;
}

interface JunctionContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
}

export const JunctionContextMenu: React.FC<JunctionContextMenuProps> = ({ menuState, onClose }) => {
  const {
    project,
    selectedIds,
    splitWallAtPointAction,
    joinSelectedWalls,
    mergeCloseNodes,
    disconnectWallAtNode,
    language,
    theme,
  } = useStore();

  const t = translations[language];
  const isDark = theme === 'dark';

  if (!menuState.isOpen) return null;

  const targetWall = menuState.targetWallId
    ? (project.elements.find((e) => e.id === menuState.targetWallId) as WallElement | CurveWallElement | undefined)
    : undefined;

  // Check if join is available: either 2 walls are selected, or target node connects 2 collinear walls
  let canJoin = false;
  const selectedWalls = project.elements.filter(
    (e): e is WallElement => selectedIds.includes(e.id) && e.type === 'wall'
  );
  if (selectedWalls.length === 2) {
    const allWalls = project.elements.filter((e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall');
    canJoin = canJoinWalls(selectedWalls[0], selectedWalls[1], allWalls).canJoin;
  } else if (menuState.targetNodeId) {
    const wallsAtNode = project.elements.filter(
      (e): e is WallElement => e.type === 'wall' && (e.startNodeId === menuState.targetNodeId || e.endNodeId === menuState.targetNodeId)
    );
    if (wallsAtNode.length === 2) {
      const allWalls = project.elements.filter((e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall');
      canJoin = canJoinWalls(wallsAtNode[0], wallsAtNode[1], allWalls).canJoin;
    }
  }

  // Check if node has multiple walls (can disconnect)
  const wallsAtNode = menuState.targetNodeId
    ? project.elements.filter(
        (e): e is WallElement | CurveWallElement =>
          (e.type === 'wall' || e.type === 'curve_wall') &&
          (e.startNodeId === menuState.targetNodeId || e.endNodeId === menuState.targetNodeId)
      )
    : [];
  const canDisconnect = wallsAtNode.length > 1;

  const handleSplitHere = () => {
    if (menuState.targetWallId) {
      splitWallAtPointAction(menuState.targetWallId, menuState.worldPos);
    }
    onClose();
  };

  const handleJoinWalls = () => {
    joinSelectedWalls();
    onClose();
  };

  const handleMergeNodes = () => {
    if (menuState.targetNodeId && menuState.closeNodeId) {
      mergeCloseNodes(menuState.targetNodeId, menuState.closeNodeId);
    }
    onClose();
  };

  const handleDisconnect = () => {
    if (menuState.targetNodeId && (menuState.targetWallId || wallsAtNode[0]?.id)) {
      const wallId = menuState.targetWallId || wallsAtNode[0].id;
      disconnectWallAtNode(wallId, menuState.targetNodeId);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop click listener */}
      <div className="fixed inset-0 z-50 cursor-default" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />

      {/* Menu popup */}
      <div
        data-testid="junction-context-menu"
        className={`fixed z-50 w-52 py-1 rounded-lg border shadow-xl backdrop-blur-md text-xs select-none transition-all duration-100 animate-in fade-in zoom-in-95 ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-black/60'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'
        }`}
        style={{
          left: `${Math.min(window.innerWidth - 220, Math.max(10, menuState.x))}px`,
          top: `${Math.min(window.innerHeight - 200, Math.max(10, menuState.y))}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Split here action */}
        {targetWall && !targetWall.locked && (
          <button
            type="button"
            data-testid="menu-split-here"
            onClick={handleSplitHere}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">{t.junctions.splitWallHere}</span>
          </button>
        )}

        {/* Join walls action */}
        {canJoin && (
          <button
            type="button"
            data-testid="menu-join-walls"
            onClick={handleJoinWalls}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
          >
            <GitMerge className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">{t.junctions.joinWalls}</span>
          </button>
        )}

        {/* Merge nodes action */}
        {menuState.targetNodeId && menuState.closeNodeId && (
          <button
            type="button"
            data-testid="menu-merge-nodes"
            onClick={handleMergeNodes}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">{t.junctions.mergeNodes}</span>
          </button>
        )}

        {/* Disconnect at node action */}
        {canDisconnect && (
          <button
            type="button"
            data-testid="menu-disconnect-node"
            onClick={handleDisconnect}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium">{t.junctions.disconnectAtNode}</span>
          </button>
        )}
      </div>
    </>
  );
};
