import { exec } from './shared/child-process';
import { Context } from './shared/context';

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  private: boolean;
  dependencies?: Record<string, PackageInfo>;
  devDependencies?: Record<string, PackageInfo>;
  unsavedDependencies?: Record<string, PackageInfo>;
}

export async function getPackages(ctx: Context) {
  const { stdout } = await exec('pnpm list -r --json --only-projects', {
    cwd: ctx.cwd,
  });
  return JSON.parse(stdout.toString()) as PackageInfo[];
}
