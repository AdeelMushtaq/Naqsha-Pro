/**
 * Vehicle and Heavy Equipment presets for Naqsha Entry Check.
 * All spatial measurements are stored internally in INCHES.
 */

import { Vehicle } from './types';

export const VEHICLE_PRESETS: Record<string, Omit<Vehicle, 'id'>> = {
  car: {
    name: 'Standard Car (Sedan / Hatchback)',
    nameUrdu: 'Gari / Car',
    length: 175, // ~14.5 ft
    width: 70, // ~5.8 ft
    height: 58, // ~4.8 ft
    wheelbase: 106, // ~8.8 ft
    frontOverhang: 35,
    rearOverhang: 34,
    minTurningRadius: 200, // ~16.6 ft
    mirrorExtraWidth: 8, // each side
    color: '#38bdf8',
  },
  bolan: {
    name: 'Suzuki Bolan / Ravi Pickup',
    nameUrdu: 'Suzuki Bolan / Carry Dabba / Pickup',
    length: 130, // ~10.8 ft
    width: 55, // ~4.6 ft
    height: 73, // ~6.1 ft
    wheelbase: 73, // ~6.1 ft
    frontOverhang: 25,
    rearOverhang: 32,
    minTurningRadius: 160, // ~13.3 ft
    mirrorExtraWidth: 6,
    color: '#fbbf24',
  },
  hilux: {
    name: 'Toyota Hilux / Revo / Double Cabin',
    nameUrdu: 'Hilux / Revo / Double Cabin Dala',
    length: 210, // ~17.5 ft
    width: 73, // ~6.1 ft
    height: 71, // ~5.9 ft
    wheelbase: 122, // ~10.2 ft
    frontOverhang: 37,
    rearOverhang: 51,
    minTurningRadius: 250, // ~20.8 ft
    mirrorExtraWidth: 8,
    color: '#34d399',
  },
  shehzore: {
    name: 'Hyundai Shehzore / Mini Truck (1-Ton)',
    nameUrdu: 'Shehzore / Chhota Mazda / Mini Truck',
    length: 200, // ~16.7 ft
    width: 69, // ~5.75 ft
    height: 78, // ~6.5 ft
    wheelbase: 104, // ~8.7 ft
    frontOverhang: 40,
    rearOverhang: 56,
    minTurningRadius: 230, // ~19.2 ft
    mirrorExtraWidth: 8,
    color: '#f87171',
  },
  truck_6wheel: {
    name: '6-Wheeler Mazda Truck',
    nameUrdu: '6-Wheeler Mazda Truck',
    length: 280, // ~23.3 ft
    width: 96, // 8 ft
    height: 120, // 10 ft
    wheelbase: 170, // ~14.2 ft
    frontOverhang: 45,
    rearOverhang: 65,
    minTurningRadius: 360, // 30 ft
    mirrorExtraWidth: 10,
    color: '#f97316',
  },
  truck_10wheel: {
    name: '10-Wheeler Heavy Truck / Bedford',
    nameUrdu: '10-Wheeler Bara Truck',
    length: 360, // 30 ft
    width: 98, // ~8.2 ft
    height: 135, // 11.25 ft
    wheelbase: 220, // ~18.3 ft
    frontOverhang: 50,
    rearOverhang: 90,
    minTurningRadius: 480, // 40 ft
    mirrorExtraWidth: 10,
    color: '#ef4444',
  },
  container_20ft: {
    name: 'Trailer / 20ft Container Truck',
    nameUrdu: '20-Foot Container Trailer',
    length: 420, // 35 ft
    width: 102, // 8.5 ft
    height: 156, // 13 ft
    wheelbase: 260, // ~21.7 ft
    frontOverhang: 50,
    rearOverhang: 110,
    minTurningRadius: 550, // ~45.8 ft
    mirrorExtraWidth: 10,
    color: '#a855f7',
  },
  container_40ft: {
    name: 'Trailer / 40ft Long Container',
    nameUrdu: '40-Foot Bara Container Trailer',
    length: 660, // 55 ft
    width: 102, // 8.5 ft
    height: 162, // 13.5 ft
    wheelbase: 440, // ~36.7 ft
    frontOverhang: 50,
    rearOverhang: 170,
    minTurningRadius: 720, // 60 ft
    mirrorExtraWidth: 10,
    color: '#9333ea',
  },
  concrete_mixer: {
    name: 'Concrete Transit Mixer Truck',
    nameUrdu: 'Concrete Mixer Gari / Lenter Machine',
    length: 320, // ~26.7 ft
    width: 98, // ~8.2 ft
    height: 144, // 12 ft
    wheelbase: 190, // ~15.8 ft
    frontOverhang: 50,
    rearOverhang: 80,
    minTurningRadius: 420, // 35 ft
    mirrorExtraWidth: 10,
    color: '#eab308',
  },
  crane: {
    name: 'Mobile Crane Truck',
    nameUrdu: 'Mobile Crane Truck',
    length: 400, // ~33.3 ft
    width: 102, // 8.5 ft
    height: 150, // 12.5 ft
    wheelbase: 240, // 20 ft
    frontOverhang: 60,
    rearOverhang: 100,
    minTurningRadius: 500, // ~41.7 ft
    mirrorExtraWidth: 10,
    color: '#f59e0b',
  },
  tractor_trolley: {
    name: 'Tractor Trolley (Mitti / Rait / Bajri)',
    nameUrdu: 'Tractor Trolley (Mitti/Bajri)',
    length: 300, // 25 ft
    width: 84, // 7 ft
    height: 90, // 7.5 ft
    wheelbase: 160, // ~13.3 ft
    frontOverhang: 35,
    rearOverhang: 105,
    minTurningRadius: 280, // ~23.3 ft
    mirrorExtraWidth: 6,
    color: '#10b981',
  },
  custom: {
    name: 'Custom Vehicle / Large Equipment',
    nameUrdu: 'Custom Gari / Machine',
    length: 240, // 20 ft
    width: 90, // 7.5 ft
    height: 108, // 9 ft
    wheelbase: 150,
    frontOverhang: 40,
    rearOverhang: 50,
    minTurningRadius: 300,
    mirrorExtraWidth: 8,
    color: '#06b6d4',
    isCustom: true,
  },
};

export function createVehicleFromPreset(presetKey: string, customOverrides?: Partial<Vehicle>): Vehicle {
  const base = VEHICLE_PRESETS[presetKey] || VEHICLE_PRESETS.car;
  return {
    id: `veh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    ...base,
    ...customOverrides,
  };
}
