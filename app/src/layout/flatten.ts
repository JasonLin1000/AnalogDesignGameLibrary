import { expandInstance } from './pcell';
import type { Layout, Shape } from './types';

/** All shapes of a layout with PCell instances expanded. */
export function flatten(l: Layout): Shape[] {
  return [...l.shapes, ...l.instances.flatMap(expandInstance)];
}
