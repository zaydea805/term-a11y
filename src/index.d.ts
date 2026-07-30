export interface AccessibleOptions {
  /** Force accessible/normal mode, bypassing auto-detection. */
  accessible?: boolean;
  /** Override the output stream (defaults to process.stdout). */
  stream?: NodeJS.WritableStream;
}

export function isScreenReaderMode(overrides?: { accessible?: boolean }): boolean;
export function hasAccessibilityFlag(argv?: string[]): boolean;

export interface Spinner {
  start(): Spinner;
  update(label: string): Spinner;
  succeed(text?: string): Spinner;
  fail(text?: string): Spinner;
  stop(text?: string): Spinner;
  readonly accessible: boolean;
}

export interface SpinnerOptions extends AccessibleOptions {
  /** How often (ms) to print a "still working" heartbeat in accessible mode. Default: 8000. */
  heartbeatMs?: number;
}

export function createSpinner(label: string, options?: SpinnerOptions): Spinner;

export interface ProgressBar {
  update(value: number): void;
  increment(step?: number): void;
  done(): void;
  readonly accessible: boolean;
}

export interface ProgressBarOptions extends AccessibleOptions {
  label?: string;
  /** Announce every N percent in accessible mode instead of every tick. Default: 10. */
  stepPercent?: number;
  /** Bar width in characters, non-accessible mode only. Default: 30. */
  width?: number;
}

export function createProgressBar(total: number, options?: ProgressBarOptions): ProgressBar;

export interface TableOptions extends AccessibleOptions {
  columns?: string[];
}

export function renderTable(
  rows: Array<Record<string, unknown>>,
  options?: TableOptions
): void;
