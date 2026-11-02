#!/usr/bin/env node
import { calculate, type Inputs } from './calculator.js';

const help = `Usage: belt-conveyor-power-calc --capacity Q --speed v --length L [options]

Simplified belt conveyor drive power estimate (g = 9.81 m/s²).
  --capacity Q    Capacity in t/h (required, positive)
  --speed v       Belt speed in m/s (required, positive)
  --length L      Conveyor length in m (required, positive)
  --lift H        Vertical lift in m (default 0; negative for decline)
  --friction f    Friction factor in (0,1) (default 0.03)
  --belt-mass mb  Belt mass in kg/m per side (default 0, nonnegative)
  --efficiency e  Drive efficiency in (0,1] (default 0.9)
  --json          Output JSON with explicit unit suffixes on result fields
  --help          Show this help
`;

const names: Record<string, keyof Inputs> = {
  '--capacity': 'capacity', '--speed': 'speed', '--length': 'length',
  '--lift': 'lift', '--friction': 'friction', '--belt-mass': 'beltMass',
  '--efficiency': 'efficiency',
};

function main(args: string[]) {
  if (args.includes('--help')) { process.stdout.write(help); return; }
  const input: Partial<Inputs> = {};
  const seen = new Set<string>();
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (seen.has(arg)) throw new Error(`duplicate option: ${arg}`);
    seen.add(arg);
    if (arg === '--json') { json = true; continue; }
    const name = names[arg];
    if (!Object.hasOwn(names, arg)) throw new Error(`unknown option: ${arg}`);
    const raw = args[++i];
    if (raw === undefined || raw.trim() === '' || raw.startsWith('--')) {
      throw new Error(`missing value for ${arg}`);
    }
    // Accept decimal and scientific notation, excluding nonnumeric coercions.
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      throw new Error(`${arg} must be a finite number`);
    }
    input[name] = Number(raw);
  }
  for (const name of ['capacity', 'speed', 'length'] as const) {
    if (input[name] === undefined) throw new Error(`missing required option: --${name}`);
  }
  const result = calculate(input as Inputs);
  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  const rows: [string, number, string, number][] = [
    ['Mass flow', result.massFlowKgPerS, 'kg/s', 3],
    ['Material load per metre', result.materialLoadKgPerM, 'kg/m', 3],
    ['Lift power', result.liftPowerW, 'W', 2],
    ['Material friction power', result.materialFrictionPowerW, 'W', 2],
    ['Empty belt power', result.emptyBeltPowerW, 'W', 2],
    ['Shaft power', result.shaftPowerW, 'W', 2],
    ['Motor power', result.motorPowerW, 'W', 2],
    ['Recommended IEC motor', result.recommendedMotorKw, 'kW', 2],
  ];
  console.log(`${'Quantity'.padEnd(28)} ${'Value'.padStart(14)}  Unit`);
  for (const [label, value, unit, digits] of rows) {
    console.log(`${label.padEnd(28)} ${value.toFixed(digits).padStart(14)}  ${unit}`);
  }
  if (result.note) console.log(`Note: ${result.note}`);
}

try { main(process.argv.slice(2)); }
catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
