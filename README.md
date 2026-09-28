# Naqsha (نقشہ) - 2D Floor Plan CAD Web Application

A modern, scalable, mobile-friendly 2D architectural floor plan drawing web application built with React, TypeScript, Konva.js (`react-konva`), Zustand, and Tailwind CSS. Measure rooms, walls, doors, windows, and curved walls with precision in feet and inches (`ft` / `in`), featuring bilingual Roman Urdu (default) and English support.

---

## 🏗️ Architecture & Core Rules

1. **Inches as Canonical Unit**: All spatial lengths, coordinates, thicknesses, and offsets are stored internally as floating-point numbers in **inches** (`number`). Unit conversion to fractional feet/inches (e.g. `10' 6"`, `10' 6 1/2"`) happens solely at the presentation and input layers via `src/utils/units.ts`.
2. **Discriminated Union Element Models**: Every architectural object implements a strongly-typed model with a unique ID (`BoxElement`, `CircleElement`, `WallElement`, `CurveWallElement`, `DoorElement`, `WindowElement`).
3. **Wall Attachment Invariants**: Doors and windows are anchored to host walls via `wallId` and `offset` (distance in inches from wall start). Moving or translating a wall automatically keeps its attached openings intact, and opening offsets are strictly validated against wall length.
4. **Offline-Ready Progressive Web App (PWA)**: Powered by `vite-plugin-pwa` with precached assets, service workers, install prompts, and offline data persistence in `localStorage`.
5. **Mobile-First & Capacitor Compatible**: Structured clean separation of canvas, state, and UI to allow wrapping with `@capacitor/core` for native Android & iOS distribution.

---

## 📁 Folder Structure

```
/
├── public/                 # Icons (PWA 192x192, 512x512, SVG, Apple touch icon)
├── src/
│   ├── canvas/             # Konva.js rendering engine
│   │   ├── FloorPlanCanvas.tsx    # Stage, zoom/pan, pointer & touch handlers
│   │   ├── GridLayer.tsx          # Dynamic 1ft major / minor CAD grid
│   │   ├── WallRenderer.tsx       # Straight & curved walls with openings cut
│   │   ├── DoorRenderer.tsx       # Wall cuts, door leaf & 90° swing arc
│   │   ├── WindowRenderer.tsx     # Double-pane architectural window symbols
│   │   ├── BoxRenderer.tsx        # Room rectangles, area & perimeter
│   │   ├── CircleRenderer.tsx     # Circular rooms & columns
│   │   ├── DimensionLine.tsx      # CAD dimension lines with tick marks
│   │   └── DrawingPreview.tsx     # Live interactive drafting guides & snap
│   ├── i18n/               # Localization strings
│   │   ├── translations.ts        # Roman Urdu (default) & English dictionaries
│   │   └── index.ts
│   ├── models/             # Domain data models
│   │   └── types.ts               # Discriminated union PlanElement definitions
│   ├── store/              # State management
│   │   ├── useStore.ts            # Zustand store with 100+ undo/redo steps
│   │   └── starterPlan.ts         # Sample 5-Marla Pakistani apartment blueprint
│   ├── ui/                 # Responsive UI components
│   │   ├── TopNav.tsx             # 3-Zone Top Bar Contract
│   │   ├── LeftToolbar.tsx        # Desktop CAD tool selector with shortcuts
│   │   ├── PropertiesPanel.tsx    # Numeric properties inspector & editor
│   │   ├── MobileBottomBar.tsx    # Ergonomic thumb zone (44px+ hit targets)
│   │   ├── MobilePropertiesSheet.tsx # Bottom drawer for mobile inspect
│   │   ├── ProjectsModal.tsx      # Create, switch, rename, export/import JSON
│   │   ├── ShortcutsModal.tsx     # Keyboard hotkey cheat sheet
│   │   ├── PWAInstallButton.tsx   # Install prompt for Desktop, Android & iOS
│   │   └── OfflineIndicator.tsx   # Network status toast
│   ├── utils/              # Pure mathematical utilities & test coverage
│   │   ├── units.ts               # Feet & inches input parsing & formatting
│   │   ├── geometry.ts            # Vectors, angles, polygon & arc calculations
│   │   ├── snapping.ts            # Grid, endpoint & orthogonal angle snapping
│   │   ├── export.ts              # High-res PNG & landscape PDF export
│   │   └── __tests__/             # Vitest test suites (25+ tests)
│   ├── App.tsx             # Workspace assembly & hotkey listeners
│   └── main.tsx
└── vite.config.ts          # Vite & PWA configuration
```

---

## 🚀 Scripts

- `npm run dev`: Start Vite development server on port 3000.
- `npm test`: Run Vitest unit tests (units, geometry, attachment, snapping).
- `npm run lint`: Run TypeScript type checking.
- `npm run build`: Compile and build production assets with service workers.

---

## 🧩 How to Add a New Object Type (e.g. Stairs, Column, Text Annotation)

The app is built with a discriminated union architecture so extending it with new elements is clean and modular:

### Step 1: Define Model in `src/models/types.ts`
```typescript
export interface StairsElement extends BaseElement {
  type: 'stairs';
  x: number;      // top-left x in inches
  y: number;      // top-left y in inches
  width: number;  // inches
  length: number; // inches
  steps: number;  // number of treads
  rotation: number;
  direction: 'up' | 'down';
}

// Add to discriminated union:
export type PlanElement =
  | BoxElement
  | CircleElement
  | WallElement
  | CurveWallElement
  | DoorElement
  | WindowElement
  | StairsElement; // <--- here
```

### Step 2: Create Renderer in `src/canvas/StairsRenderer.tsx`
Create a React Konva component that takes the model, renders treads via `<Line />` or `<Rect />`, and attaches selection handles.

### Step 3: Mount Renderer in `src/canvas/FloorPlanCanvas.tsx`
Filter elements by `el.type === 'stairs'` and map them onto the appropriate Konva `<Layer>`.

### Step 4: Add Tool & Translations
Add the new tool to `ToolType` in `types.ts`, add Roman Urdu & English labels in `src/i18n/translations.ts`, and add the tool icon in `src/ui/LeftToolbar.tsx` and `src/ui/MobileBottomBar.tsx`.

### Step 5: Add Properties Editor in `src/ui/PropertiesPanel.tsx`
Add a block for `selectedElement.type === 'stairs'` allowing the user to configure width, length, number of treads, and flight direction in feet and inches.
