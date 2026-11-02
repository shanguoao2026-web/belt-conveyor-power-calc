import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculate, IEC_MOTORS_KW } from '../dist/calculator.js';

const base = { capacity: 100, speed: 1.5, length: 50 };
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
// File-backed stdio also works in sandboxes that prohibit subprocess pipes.
const cli = (...args) => {
  const dir = mkdtempSync(join(tmpdir(), 'belt-calc-test-'));
  const out = openSync(join(dir, 'stdout'), 'w');
  const err = openSync(join(dir, 'stderr'), 'w');
  try {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
      stdio: ['ignore', out, err],
    });
    assert.ifError(result.error);
    return { status: result.status,
      stdout: readFileSync(join(dir, 'stdout'), 'utf8'),
      stderr: readFileSync(join(dir, 'stderr'), 'utf8') };
  } finally {
    closeSync(out);
    closeSync(err);
    rmSync(dir, { recursive: true, force: true });
  }
};
const required = ['--capacity', '100', '--speed', '1.5', '--length', '50'];

test('specified loaded conveyor example', () => {
  const r = calculate({ ...base, lift: 5, friction: 0.03, beltMass: 10, efficiency: 0.9 });
  near(r.materialLoadKgPerM, 18.519, 0.0005);
  near(r.liftPowerW, 1362.5);
  near(r.materialFrictionPowerW, 408.75);
  near(r.emptyBeltPowerW, 441.45);
  near(r.shaftPowerW, 2212.7);
  near(r.motorPowerW, 2458.6, 0.05);
  assert.equal(r.recommendedMotorKw, 3);
});

test('specified small conveyor example and defaults', () => {
  const r = calculate({ capacity: 50, speed: 1, length: 20 });
  near(r.shaftPowerW, 81.75);
  near(r.motorPowerW, 90.83, 0.005);
  assert.equal(r.recommendedMotorKw, 0.37);
  assert.equal(r.inputs.lift, 0);
  assert.equal(r.inputs.friction, 0.03);
  assert.equal(r.inputs.beltMass, 0);
  assert.equal(r.inputs.efficiency, 0.9);
});

test('decline and zero shaft power are regenerative', () => {
  for (const lift of [-10]) {
    const r = calculate({ ...base, lift });
    assert.equal(r.regenerative, true);
    assert.equal(r.recommendedMotorKw, 0.37);
    assert.match(r.note, /regenerative/);
  }
  const zero = calculate({ capacity: 3.6, speed: 1, length: 1, friction: 0.5, lift: -0.5 });
  assert.equal(zero.shaftPowerW, 0);
  assert.equal(zero.regenerative, true);
  assert.equal(zero.recommendedMotorKw, 0.37);
  const r = cli(...required, '--lift', '-10');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /regenerative/);
});

test('IEC sizing boundaries and upper limit', () => {
  for (const kw of IEC_MOTORS_KW) {
    // A lift-only equivalent with friction retained gives P = Q/3.6 * 9.81.
    const capacity = kw * 1000 * 3.6 / 9.81;
    const r = calculate({ capacity, speed: 1, length: 1, lift: 0.5, friction: 0.5, efficiency: 1 });
    near(r.motorPowerW, kw * 1000);
    // Avoid rounding artifacts at a floating-point boundary by testing just below it.
    const below = calculate({ capacity: capacity * (1 - 1e-12), speed: 1, length: 1, lift: 0.5, friction: 0.5, efficiency: 1 });
    assert.equal(below.recommendedMotorKw, kw);
  }
  assert.throws(() => calculate({ ...base, lift: 10000 }), /200 kW/);
});

test('invalid inputs fail validation', () => {
  for (const [key, values] of Object.entries({
    capacity: [0, -1, NaN, Infinity], speed: [0, -1, Infinity],
    length: [0, -1], lift: [NaN, Infinity], friction: [0, 1, -0.1],
    beltMass: [-1, Infinity], efficiency: [0, -1, 1.2, NaN],
  })) for (const value of values) assert.throws(() => calculate({ ...base, [key]: value }));
  assert.throws(() => calculate({ ...base, capacity: Number.MAX_VALUE, lift: 10 }), /finite numeric range/);
});

test('CLI JSON and table expose results with units', () => {
  const r = cli(...required, '--lift', '5', '--belt-mass', '10', '--json');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  const data = JSON.parse(r.stdout);
  near(data.shaftPowerW, 2212.7);
  assert.equal(data.recommendedMotorKw, 3);
  const table = cli(...required, '--lift', '5', '--belt-mass', '10');
  assert.equal(table.status, 0);
  assert.match(table.stdout, /18\.519\s+kg\/m/);
  assert.match(table.stdout, /2212\.70\s+W/);
  assert.match(table.stdout, /3\.00\s+kW/);
});

test('CLI errors go to stderr with exit 1', () => {
  for (const extra of [
    ['--speed', '0'], ['--efficiency', '1.2'], ['--friction', '1'],
    ['--belt-mass', '-1'], ['--lift', 'Infinity'], ['--lift', 'NaN'],
    ['--lift', ''], ['--lift', '1e309'], ['--lift', 'abc'],
    ['--unknown'], ['toString', '1'], ['--lift'], ['--lift', '100000'],
  ]) {
    const args = extra[0] === '--speed' ? ['--capacity', '100', '--length', '50', ...extra] : [...required, ...extra];
    const r = cli(...args);
    assert.equal(r.status, 1, args.join(' '));
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /Error:/);
  }
  for (const args of [[], ['--capacity', '1'], [...required, '--speed', '2']]) {
    assert.equal(cli(...args).status, 1);
  }
});

test('help works without required inputs', () => {
  const r = cli('--help');
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
  assert.match(r.stdout, /Usage:/);
  assert.match(r.stdout, /--efficiency/);
});
