// ============================================================
// Client service for the built-in server-side code runner.
// Used by the File Manager panel to execute Java / Python / Node /
// C / C++ / Go / Ruby / PHP / Bash programs on the ChatForge host
// (compilation + execution in an isolated temp dir with timeouts).
// ============================================================

export interface RunCodeFile {
  path: string;
  code: string;
}

export interface RunCodeResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Which phase failed when compile+run languages (java/c/cpp) are used */
  phase?: 'compile' | 'run';
  compileStderr?: string;
  durationMs?: number;
  /** Set when the required toolchain binary was not found on the host */
  toolMissing?: string | null;
}

export interface ToolStatus {
  available: boolean;
  version: string | null;
}

export type RunnerStatusMap = Record<string, ToolStatus>;

/** Execute files on the ChatForge host via /api/run-code */
export async function runOnServer(
  payload: {
    language: string;
    files: RunCodeFile[];
    mainFile?: string;
    timeoutMs?: number;
  },
  signal?: AbortSignal
): Promise<RunCodeResult> {
  const res = await fetch('/api/run-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}: runner request failed`;
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // ignore body parse failure
    }
    throw new Error(message);
  }

  return (await res.json()) as RunCodeResult;
}

/** Ask the host which language toolchains are available */
export async function fetchRunnerStatus(): Promise<RunnerStatusMap> {
  try {
    const res = await fetch('/api/runner-status');
    if (!res.ok) return {};
    return (await res.json()) as RunnerStatusMap;
  } catch {
    return {};
  }
}
