# Belt conveyor power calculator

A small TypeScript CLI for Node.js 18+ with no runtime dependencies.
This is a simplified estimate, not a full CEMA/DIN 22101 calculation.

```sh
npm install
npm run build
node dist/cli.js --capacity 100 --speed 1.5 --length 50 --lift 5 --belt-mass 10
node dist/cli.js --capacity 50 --speed 1 --length 20 --json
node dist/cli.js --capacity 100 --speed 1.5 --length 50 --lift -10
node dist/cli.js --help
npm test
```

The first example gives material load 18.519 kg/m, lift power 1362.50 W,
material friction power 408.75 W, empty belt power 441.45 W, shaft power
2212.70 W, and motor power 2458.56 W, recommending a 3 kW IEC motor.
The second gives shaft power 81.75 W, motor power 90.83 W, and a 0.37 kW motor.

| Option | Unit | Constraint / default |
| --- | --- | --- |
| `--capacity` | t/h | Required, positive |
| `--speed` | m/s | Required, positive |
| `--length` | m | Required, positive |
| `--lift` | m | Default 0; negative for decline |
| `--friction` | dimensionless | Default 0.03; strictly between 0 and 1 |
| `--belt-mass` | kg/m per belt side | Default 0; nonnegative |
| `--efficiency` | dimensionless | Default 0.9; greater than 0, at most 1 |

All values must be finite. Decimal and scientific notation are accepted.
The default output is a table; `--json` emits unrounded results, resolved
inputs, a regenerative flag, and (when applicable) a regenerative note.
Result field names carry units, such as `shaftPowerW`, `materialLoadKgPerM`,
and `recommendedMotorKw`. Errors go to stderr with exit status 1.

With g = 9.81 m/s², mass flow qm = Q/3.6 kg/s and material load per metre
is qm/v kg/m. Lift power is qm·g·H, material friction power is f·g·qm·L,
and empty belt power is f·g·(2·mb)·L·v, all in watts. Shaft power is their
sum and motor power is shaft power divided by efficiency.

The smallest IEC motor at least as large as the calculated motor power is
selected from 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15,
18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, and 200 kW.
Requirements above 200 kW are errors. Nonpositive shaft power is marked
regenerative and recommends the minimum 0.37 kW; signed shaft and motor
power remain visible in the output.

Licensed under the MIT License; author: shanguoao2026-web.
