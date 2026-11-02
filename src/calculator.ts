export interface Inputs {
  capacity: number;
  speed: number;
  length: number;
  lift?: number;
  friction?: number;
  beltMass?: number;
  efficiency?: number;
}

export const IEC_MOTORS_KW = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5,
  7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200] as const;

export function calculate(input: Inputs) {
  const inputs = {
    ...input,
    lift: input.lift ?? 0,
    friction: input.friction ?? 0.03,
    beltMass: input.beltMass ?? 0,
    efficiency: input.efficiency ?? 0.9,
  };
  for (const [name, value] of Object.entries(inputs)) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  }
  for (const name of ['capacity', 'speed', 'length'] as const) {
    if (!(inputs[name] > 0)) throw new Error(`${name} must be positive`);
  }
  if (!(inputs.friction > 0 && inputs.friction < 1)) throw new Error('friction must be in (0, 1)');
  if (!(inputs.efficiency > 0 && inputs.efficiency <= 1)) throw new Error('efficiency must be in (0, 1]');
  if (inputs.beltMass < 0) throw new Error('belt-mass must be nonnegative');

  const massFlowKgPerS = inputs.capacity / 3.6;
  const materialLoadKgPerM = massFlowKgPerS / inputs.speed;
  const liftPowerW = massFlowKgPerS * 9.81 * inputs.lift;
  const materialFrictionPowerW = inputs.friction * 9.81 * massFlowKgPerS * inputs.length;
  const emptyBeltPowerW = inputs.friction * 9.81 * (2 * inputs.beltMass) * inputs.length * inputs.speed;
  const shaftPowerW = liftPowerW + materialFrictionPowerW + emptyBeltPowerW;
  const motorPowerW = shaftPowerW / inputs.efficiency;
  const regenerative = shaftPowerW <= 0;
  const derived = { massFlowKgPerS, materialLoadKgPerM, liftPowerW,
    materialFrictionPowerW, emptyBeltPowerW, shaftPowerW, motorPowerW };
  if (Object.values(derived).some(value => !Number.isFinite(value))) {
    throw new Error('calculation exceeds finite numeric range');
  }
  const recommendedMotorKw = IEC_MOTORS_KW.find(kw => kw * 1000 >= motorPowerW);
  if (recommendedMotorKw === undefined) throw new Error('required motor power exceeds 200 kW');
  return { inputs, ...derived, regenerative, recommendedMotorKw,
    ...(regenerative ? { note: 'Conveyor is regenerative; motor recommendation is 0.37 kW minimum.' } : {}) };
}
