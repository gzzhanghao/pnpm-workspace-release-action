import fs from 'fs';
import path from 'path';

import { PackageInfo, getPackages } from './get-packages';
import { ReleaseInfo } from './get-release-info';
import { Context } from './shared/context';

export async function updatePackages(ctx: Context, release: ReleaseInfo) {
  const packages = await getPackages(ctx);

  const stabilizeWorkspaceVersion = (deps?: Record<string, string>) => {
    if (!deps) {
      return;
    }
    for (const pkg of packages) {
      if (!deps[pkg.name]?.startsWith('workspace:')) {
        continue;
      }
      const type = deps[pkg.name].slice('workspace:'.length);
      deps[pkg.name] = `${type}${release.version}`;
    }
  };

  const updatePackageJson = async (pkg: PackageInfo) => {
    const pkgPath = path.join(pkg.path, 'package.json');
    const pkgJson = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'));

    pkgJson.version = release.version;
    const depsList = [
      pkgJson.dependencies,
      pkgJson.devDependencies,
      pkgJson.peerDependencies,
    ];
    for (const deps of depsList) {
      stabilizeWorkspaceVersion(deps);
    }

    await ctx.writeFile(
      path.relative(ctx.cwd, pkgPath),
      `${JSON.stringify(pkgJson, null, 2)}\n`,
    );
  };

  await Promise.all(packages.map(async (pkg) => updatePackageJson(pkg)));
}
