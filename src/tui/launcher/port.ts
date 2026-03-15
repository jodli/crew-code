export interface Launcher {
  readonly name: string;
  openTerminal(command: string[], cwd: string, label?: string): Promise<void>;
}
