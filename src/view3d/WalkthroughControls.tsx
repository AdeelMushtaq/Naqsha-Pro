/**
 * First-person Walkthrough Camera Controls for Naqsha CAD.
 * Eye height: 5.5 ft (66 inches).
 * WASD movement, mouse drag look.
 */

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WalkthroughControlsProps {
  eyeHeight?: number; // default 66 inches
  speed?: number;
}

export const WalkthroughControls: React.FC<WalkthroughControlsProps> = ({
  eyeHeight = 66,
  speed = 180, // inches per second
}) => {
  const { camera, gl } = useThree();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isMouseDown = useRef(false);
  const previousMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    // Initial camera position & height
    camera.position.y = eyeHeight;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const dom = gl.domElement;
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= dx * 0.003;
      euler.current.x -= dy * 0.003;
      euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera, eyeHeight, gl.domElement]);

  useFrame((_, delta) => {
    const keys = keysPressed.current;
    const moveDist = speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).negate().normalize();

    if (keys['KeyW'] || keys['ArrowUp']) {
      camera.position.addScaledVector(forward, moveDist);
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      camera.position.addScaledVector(forward, -moveDist);
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
      camera.position.addScaledVector(right, -moveDist);
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
      camera.position.addScaledVector(right, moveDist);
    }

    // Keep eye height locked
    camera.position.y = eyeHeight;
  });

  return null;
};
