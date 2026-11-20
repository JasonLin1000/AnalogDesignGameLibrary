export interface RunResult {
  exitCode: number;
  elapsedMs: number;
  stdout: string;
  stderr: string;
  files: Record<string, string | null>;
}
export function runNgspice(
  netlist: string,
  opts?: { files?: Record<string, string>; outputs?: string[]; wasm?: ArrayBuffer | Uint8Array },
): Promise<RunResult>;
export function parseWrdata(text: string): number[][];
