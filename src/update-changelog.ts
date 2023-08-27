import fs from 'fs';
import path from 'path';

import { ReleaseInfo } from './get-release-info';
import { Context } from './shared/context';

const CHANGELOG_PATH = 'CHANGELOG.md';

export async function updateChangelog(ctx: Context, release: ReleaseInfo) {
  const originChangelog = await safeRead(path.join(ctx.cwd, CHANGELOG_PATH));
  ctx.writeFile(
    CHANGELOG_PATH,
    `${`${release.changelog}\n\n${originChangelog}`.trim()}\n`,
  );
}

function safeRead(changelogPath: string) {
  if (!fs.existsSync(changelogPath)) {
    return '';
  }
  return fs.promises.readFile(changelogPath, 'utf-8');
}
