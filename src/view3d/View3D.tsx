/**
 * 3D Viewport Main Container for Naqsha CAD.
 * Integrates Three.js (@react-three/fiber), Toolbar3D, Scene3D, and GLB/OBJ/PNG export.
 */

import React, { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import { OBJExporter } from 'three-stdlib';
import { useStore } from '../store/useStore';
import { Scene3D } from './Scene3D';
import { Toolbar3D } from './Toolbar3D';

interface View3DProps {
  onClose?: () => void;
}

export const View3D: React.FC<View3DProps> = ({ onClose }) => {
  const { theme, project } = useStore();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preset view positioning
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([400, 350, 600]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([280, 50, 240]);

  const handlePresetView = (preset: 'top' | 'front' | 'side' | 'isometric' | 'perspective') => {
    switch (preset) {
      case 'top':
        setCameraPosition([280, 850, 240]);
        setCameraTarget([280, 0, 240]);
        break;
      case 'front':
        setCameraPosition([280, 100, 750]);
        setCameraTarget([280, 60, 240]);
        break;
      case 'side':
        setCameraPosition([900, 100, 240]);
        setCameraTarget([280, 60, 240]);
        break;
      case 'isometric':
        setCameraPosition([600, 500, 600]);
        setCameraTarget([280, 60, 240]);
        break;
      case 'perspective':
        setCameraPosition([400, 300, 550]);
        setCameraTarget([280, 60, 240]);
        break;
    }
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project.name || 'naqsha'}-3D-view.png`;
      a.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  };

  const handleExportGLB = () => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name || 'naqsha'}-model.glb`;
        a.click();
        URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('GLTF Export error:', error);
      },
      { binary: true }
    );
  };

  const handleExportOBJ = () => {
    if (!sceneRef.current) return;
    const exporter = new OBJExporter();
    const result = exporter.parse(sceneRef.current);
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'naqsha'}-model.obj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* 3D Toolbar */}
      <Toolbar3D
        onPresetView={handlePresetView}
        onExportPNG={handleExportPNG}
        onExportGLB={handleExportGLB}
        onExportOBJ={handleExportOBJ}
        onZoomToFit={() => handlePresetView('isometric')}
      />

      {/* 3D WebGL Canvas */}
      <Canvas
        ref={canvasRef}
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{
          position: cameraPosition,
          fov: 45,
          near: 5,
          far: 5000,
        }}
      >
        <Suspense fallback={null}>
          <Scene3D onSceneReady={(s) => { sceneRef.current = s; }} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default View3D;
