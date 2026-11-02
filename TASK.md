# belt-conveyor-power-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) for simplified belt conveyor drive power estimation.

Inputs: --capacity Q (t/h, required), --speed v (m/s, required), --length L (m, required), --lift H (m, default 0, may be negative for decline), --friction f (default 0.03, in (0,1)), --belt-mass mb (kg/m per belt side, default 0), --efficiency e (default 0.9, in (0,1]), g = 9.81.
Formulas:
- Mass flow qm = Q/3.6 (kg/s); material load per metre m' = Q/(3.6·v) (kg/m).
- Lift power P_H = qm·g·H (W); material friction power P_f = f·g·qm·L (W); empty belt power P_e = f·g·(2·mb)·L·v (W).
- Shaft power P = P_H + P_f + P_e (if P <= 0 print a note that the conveyor is regenerative, motor recommendation 0.37 kW minimum).
- Motor power = P/e; recommend the smallest IEC standard motor >= that from: 0.37,0.55,0.75,1.1,1.5,2.2,3,4,5.5,7.5,11,15,18.5,22,30,37,45,55,75,90,110,132,160,200 kW (error if above 200).
- Validate finite numbers, positive where required; errors to stderr with exit 1.
- Table output by default, --json, --help. README with examples and a note that this is a simplified estimate (not a full CEMA/DIN 22101 calculation), MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log .npm-cache/.
- npm test must build and pass. No secrets, no personal info.

Check values (must be in tests):
- Q100 v1.5 L50 H5 f0.03 mb10 e0.9 → m' 18.519 kg/m, P_H 1362.5 W, P_f 408.75 W, P_e 441.45 W, P 2212.7 W, motor 2458.6 W → 3 kW.
- Q50 v1 L20 H0 mb0 → P 81.75 W, motor 90.83 W → 0.37 kW.
- speed 0 → exit 1; efficiency 1.2 → exit 1.
