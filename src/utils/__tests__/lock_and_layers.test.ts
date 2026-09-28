import { describe, it, expect } from 'vitest';
import { useStore, DEFAULT_LAYERS } from '../../store/useStore';
import { BoxElement, WallElement } from '../../models/types';

describe('Lock Behavior and Layer Visibility', () => {
  it('initializes default layers with correct names and visibility', () => {
    expect(DEFAULT_LAYERS.walls.visible).toBe(true);
    expect(DEFAULT_LAYERS.doors_windows.visible).toBe(true);
    expect(DEFAULT_LAYERS.furniture.visible).toBe(true);
    expect(DEFAULT_LAYERS.dimensions.visible).toBe(true);
    expect(DEFAULT_LAYERS.plot.visible).toBe(true);
    expect(DEFAULT_LAYERS.notes.visible).toBe(true);

    // Initial lock state is false
    expect(DEFAULT_LAYERS.walls.locked).toBe(false);
  });

  it('handles lock and unlock operations on elements in store', () => {
    const store = useStore.getState();

    const testBox: BoxElement = {
      id: 'test-box-lock-1',
      type: 'box',
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      rotation: 0,
      fillColor: 'rgba(56, 189, 248, 0.05)',
      strokeColor: '#38bdf8',
      strokeWidth: 1.5,
      locked: false,
      hidden: false,
    };

    store.addElement(testBox);
    let currentElem = useStore.getState().project.elements.find((e) => e.id === 'test-box-lock-1');
    expect(currentElem?.locked).toBe(false);

    // Toggle lock
    store.toggleLock(['test-box-lock-1']);
    currentElem = useStore.getState().project.elements.find((e) => e.id === 'test-box-lock-1');
    expect(currentElem?.locked).toBe(true);

    // Locked elements cannot be deleted
    store.deleteElements(['test-box-lock-1']);
    currentElem = useStore.getState().project.elements.find((e) => e.id === 'test-box-lock-1');
    expect(currentElem).toBeDefined(); // Still exists because it is locked!

    // Unlock and delete
    store.toggleLock(['test-box-lock-1']);
    currentElem = useStore.getState().project.elements.find((e) => e.id === 'test-box-lock-1');
    expect(currentElem?.locked).toBe(false);

    store.deleteElements(['test-box-lock-1']);
    currentElem = useStore.getState().project.elements.find((e) => e.id === 'test-box-lock-1');
    expect(currentElem).toBeUndefined();
  });

  it('handles lockAll and unlockAll correctly', () => {
    const store = useStore.getState();

    // Lock all elements
    store.lockAll();
    const allLocked = useStore.getState().project.elements.every((e) => e.locked);
    expect(allLocked).toBe(true);

    // Unlock all elements
    store.unlockAll();
    const allUnlocked = useStore.getState().project.elements.every((e) => !e.locked);
    expect(allUnlocked).toBe(true);
  });

  it('toggles layer visibility and lock state in store', () => {
    const store = useStore.getState();

    expect(useStore.getState().layers.walls.visible).toBe(true);
    store.toggleLayerVisibility('walls');
    expect(useStore.getState().layers.walls.visible).toBe(false);

    store.toggleLayerVisibility('walls');
    expect(useStore.getState().layers.walls.visible).toBe(true);

    expect(useStore.getState().layers.walls.locked).toBe(false);
    store.toggleLayerLock('walls');
    expect(useStore.getState().layers.walls.locked).toBe(true);

    store.toggleLayerLock('walls');
    expect(useStore.getState().layers.walls.locked).toBe(false);
  });
});
