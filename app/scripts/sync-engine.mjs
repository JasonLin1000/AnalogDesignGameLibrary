// Copy the SKY130 model pack from ../engine into public/ so the app can fetch it.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../../engine/models/sky130', import.meta.url));
const dst = fileURLToPath(new URL('../public/models/sky130', import.meta.url));
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log('synced models ->', dst);
