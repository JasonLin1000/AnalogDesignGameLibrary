// File loader for Node (tests): reads the model pack straight from ../engine.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FileLoader } from './engine';

const root = fileURLToPath(new URL('../../../engine/models/sky130/', import.meta.url));
export const nodeLoader: FileLoader = (p) => readFile(root + p, 'utf8');
