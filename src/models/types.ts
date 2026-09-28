/**
 * Core type definitions for Naqsha CAD floor plan application.
 * All spatial coordinates and lengths are stored internally in INCHES (float).
 */

export type UnitSystem = 'ft' | 'in';
export type AreaUnit = 'sqft' | 'sqyd' | 'marla' | 'kanal' | 'sqm';
export type Language = 'ur' | 'en'; // 'ur' = Roman Urdu, 'en' = English
export type ThemeMode = 'dark' | 'light';

export type LayerType =
  | 'walls'
  | 'doors_windows'
  | 'furniture'
  | 'dimensions'
  | 'plot'
  | 'notes'
  | 'stairs'
  | 'roads_access';

export type ToolType =
  | 'select'
  | 'pan'
  | 'box'
  | 'circle'
  | 'wall'
  | 'curve_wall'
  | 'door'
  | 'window'
  | 'dimension'
  | 'plot'
  | 'text'
  | 'furniture'
  | 'measure'
  | 'stair'
  | 'road'
  | 'gate'
  | 'obstacle'
  | 'vehicle_check';

export type DoorSwing =
  | 'inside_left'
  | 'inside_right'
  | 'outside_left'
  | 'outside_right';

export type FurnitureCategory =
  | 'bed'
  | 'sofa'
  | 'table'
  | 'counter'
  | 'bath'
  | 'stairs'
  | 'column'
  | 'beam';

export interface Point2D {
  x: number; // inches
  y: number; // inches
}

export interface SnapFeedback {
  point: Point2D;
  type: 'corner' | 't_junction' | 'midpoint' | 'grid';
  label?: string;
  labelUrdu?: string;
  targetElementId?: string;
}

export interface BaseElement {
  id: string;
  name?: string;
  locked?: boolean;
  hidden?: boolean;
  layer?: LayerType;
  groupId?: string;
}

export interface WallNode {
  id: string;
  x: number; // inches
  y: number; // inches
}

export interface BoxElement extends BaseElement {
  type: 'box';
  x: number; // top-left x in inches
  y: number; // top-left y in inches
  width: number; // inches
  height: number; // inches
  height3d?: number; // 3D height in inches (default 120" = 10ft)
  isHollow?: boolean; // render as hollow room or solid block
  rotation: number; // degrees (0 - 360)
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number; // inches
  label?: string;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  x: number; // center x in inches
  y: number; // center y in inches
  radius: number; // inches
  height3d?: number; // 3D height in inches (default 120" = 10ft)
  isHollow?: boolean;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number; // inches
  label?: string;
}

export interface WallElement extends BaseElement {
  type: 'wall';
  start: Point2D; // inches
  end: Point2D; // inches
  startNodeId?: string;
  endNodeId?: string;
  thickness: number; // inches (default 9", 4.5", 13.5")
  height?: number; // 3D height in inches (default 120" = 10ft)
  strokeColor?: string;
  fillColor?: string;
  label?: string;
  dimensionOffset?: number; // perpendicular distance from wall centerline (positive = outside, negative = inside)
}

export interface CurveWallElement extends BaseElement {
  type: 'curve_wall';
  start: Point2D; // inches
  end: Point2D; // inches
  startNodeId?: string;
  endNodeId?: string;
  // control point or arc bulge in inches (perpendicular offset from midpoint)
  bulge: number; // positive = curves one side, negative = opposite side
  thickness: number; // inches (default 9")
  height?: number; // 3D height in inches (default 120" = 10ft)
  strokeColor?: string;
  fillColor?: string;
  label?: string;
  dimensionOffset?: number;
}

export interface DoorElement extends BaseElement {
  type: 'door';
  wallId: string; // ID of host wall (WallElement or CurveWallElement)
  offset: number; // distance along wall from wall start (in inches)
  width: number; // door opening width in inches (default 36" = 3ft)
  height: number; // door height in inches (default 84" = 7ft)
  sillHeight?: number; // sill height in inches (default 0)
  isOpen?: boolean; // toggle door panel open or closed
  swingDirection?: DoorSwing;
  openAngle?: number; // swing angle in degrees (default 90)
  label?: string;
}

export interface WindowElement extends BaseElement {
  type: 'window';
  wallId: string; // ID of host wall
  offset: number; // distance along wall from wall start (in inches)
  width: number; // window width in inches (default 48" = 4ft)
  height: number; // window height in inches (default 48")
  sillHeight?: number; // sill height in inches (default 36" = 3ft)
  depth: number; // sill/frame depth in inches (default 9")
  label?: string;
}

export interface FurnitureElement extends BaseElement {
  type: 'furniture';
  category: FurnitureCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  height3d?: number; // 3D height in inches
  elevation?: number; // 3D vertical elevation from floor in inches
  rotation: number;
  label?: string;
  fillColor?: string;
  strokeColor?: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number; // in inches
  rotation: number;
  color?: string;
}

export interface DimensionElement extends BaseElement {
  type: 'dimension';
  start: Point2D;
  end: Point2D;
  offset: number;
  labelOverride?: string;
  autoWallId?: string;
}

export interface PlotElement extends BaseElement {
  type: 'plot';
  x: number;
  y: number;
  width: number;
  height: number;
  unitAreaMarla?: number;
  areaMarla?: number;
  label?: string;
}

export type StairType = 'straight' | 'l_shape' | 'u_shape' | 'spiral' | 'winder';

export interface StairElement extends BaseElement {
  type: 'stair';
  x: number; // inches
  y: number; // inches
  stairType: StairType;
  width: number; // inches (flight width, e.g. 42" = 3ft 6in)
  length: number; // inches (run length of primary flight, default 120" = 10ft)
  flight2Length?: number; // inches (for L-shape, U-shape second flight, default 80")
  landingSize?: number; // inches (landing depth/width, default 42")
  totalHeight: number; // inches (default taken from floor height, e.g. 120")
  targetRiser: number; // inches (default 6")
  treadDepth: number; // inches (default 10")
  calculatedRiser: number; // inches (auto-calculated totalHeight / numSteps)
  numSteps: number; // auto-calculated
  handrail: boolean; // default true
  handrailSide?: 'left' | 'right' | 'both';
  direction: 'up' | 'down'; // default 'up'
  rotation: number; // degrees
  startFloorId?: string;
  endFloorId?: string;
  createSlabOpening?: boolean; // automatically cut upper floor slab opening
  label?: string;
}

export interface RoadElement extends BaseElement {
  type: 'road';
  start: Point2D;
  end: Point2D;
  width: number; // inches (default 240" = 20ft)
  hasFootpath?: boolean;
  footpathWidth?: number; // inches (default 36" = 3ft)
  name?: string;
}

export type GateType = 'sliding' | 'swing' | 'open';

export interface GateElement extends BaseElement {
  type: 'gate';
  wallId: string; // attached wall ID
  offset: number; // distance along wall in inches
  width: number; // clear opening width in inches (default 144" = 12ft)
  height: number; // clear opening height in inches (default 120" = 10ft)
  gateType: GateType;
  postThickness: number; // gate post width/thickness in inches (default 18")
  label?: string;
}

export type ObstacleType =
  | 'parked_car'
  | 'pole'
  | 'tree'
  | 'transformer'
  | 'neighbor_building'
  | 'drain'
  | 'hanging_wire'
  | 'arch_beam'
  | 'balcony'
  | 'custom';

export interface ObstacleElement extends BaseElement {
  type: 'obstacle';
  obstacleType: ObstacleType;
  x: number; // inches
  y: number; // inches
  width: number; // inches
  height: number; // inches (length or depth)
  rotation: number; // degrees
  height3d: number; // vertical height / obstacle height in inches
  elevation?: number; // base vertical elevation (e.g. for hanging wire at 120", balcony at 108")
  isOverhead?: boolean; // if true, vehicles lower than elevation can pass under
  label?: string;
  fillColor?: string;
}

export type PlanElement =
  | BoxElement
  | CircleElement
  | WallElement
  | CurveWallElement
  | DoorElement
  | WindowElement
  | FurnitureElement
  | TextElement
  | DimensionElement
  | PlotElement
  | StairElement
  | RoadElement
  | GateElement
  | ObstacleElement;

export interface Vehicle {
  id: string;
  name: string;
  nameUrdu?: string;
  length: number; // inches
  width: number; // inches
  height: number; // inches
  wheelbase: number; // inches
  frontOverhang: number; // inches
  rearOverhang: number; // inches
  minTurningRadius: number; // inches
  mirrorExtraWidth: number; // inches (each side)
  color: string;
  isCustom?: boolean;
}

export interface PathWaypoint {
  id: string;
  x: number;
  y: number;
  isReverse?: boolean;
  speed?: number;
}

export interface CollisionDetail {
  x: number;
  y: number;
  obstacleId?: string;
  obstacleName: string;
  type: 'wall' | 'gate_post' | 'obstacle' | 'road_edge' | 'overhead';
  description: string;
  penetration?: number;
}

export interface VehiclePose {
  x: number; // rear axle center x
  y: number; // rear axle center y
  heading: number; // radians
  steerAngle: number; // radians
  isReverse: boolean;
  corners: Point2D[]; // 4 body corners + mirrors polygon
  t: number; // normalized progress 0 to 1
}

export interface VehicleCheckResult {
  verdict: 'pass' | 'tight' | 'fail'; // 'Ja sakti hai' | 'Tang hai, bohat kam jagah' | 'Nahi ja sakti'
  minSideClearance: number; // inches
  minSideClearancePoint?: Point2D;
  minGateClearance: number; // inches
  minGateClearancePoint?: Point2D;
  minOverheadClearance: number; // inches
  minOverheadClearancePoint?: Point2D;
  overheadObstacleName?: string;
  collisions: CollisionDetail[];
  suggestions: string[];
  sweptPolygon: Point2D[][]; // contours of swept path
  simulatedPoses: VehiclePose[];
}

export interface VehicleCheckSession {
  id: string;
  name: string;
  vehicle: Vehicle;
  waypoints: PathWaypoint[];
  allowFootpath: boolean;
  safetyMargin: number; // inches, default 12" (1 ft)
  playbackProgress: number; // 0 to 1
  isPlaying: boolean;
  speed: number; // 1x, 2x, 0.5x
  result?: VehicleCheckResult;
  manualMode?: boolean;
  manualPose?: { x: number; y: number; heading: number; steerAngle: number };
}

export interface Floor {
  id: string;
  name: string; // e.g., 'Ground Floor', 'First Floor', 'Basement'
  level: number;
  baseElevation?: number; // inches from ground (0, 120, etc.)
  floorThickness?: number; // slab thickness in inches (default 5")
  hasRoof?: boolean; // toggle roof slab
  elements: PlanElement[];
}

export type View3DMode = '2d' | '3d' | 'split';

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // inches
}

export interface DetectedRoom {
  id: string;
  name: string;
  points: Point2D[];
  centroid: Point2D;
  areaSqInches: number;
  perimeterInches: number;
}

export interface LayerConfig {
  id: LayerType;
  name: string;
  nameUrdu: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  ownerName?: string;
  elements: PlanElement[];
  wallNodes?: WallNode[];
  floors?: Floor[];
  activeFloorId?: string;
  guides?: GuideLine[];
  vehicleChecks?: VehicleCheckSession[];
  activeVehicleCheckId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  elementCount: number;
  updatedAt: number;
}

