import fs from 'fs';
import path from 'path';

import changelogAngular from 'conventional-changelog-angular';
import changelogWriter from 'conventional-changelog-writer';
import commitsParser from 'conventional-commits-parser';
import * as semver from 'semver';

import { getCommits } from './get-commits';
import { GITHUB_ORIGIN, RELEASE_TITLE_REGEX } from './shared/constants';
import { Context } from './shared/context';

export interface ReleaseInfo {
  version: string;
  changelog: string;
}

interface BumpInfo {
  level: number;
  reason: string;
}

const BUMP_LEVEL: semver.ReleaseType[] = ['major', 'minor', 'patch'];

const parseArray: (
  commits: Partial<changelogWriter.TransformedCommit>[],
  context?: Partial<changelogWriter.Context>,
  options?: changelogWriter.Options,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => string = (changelogWriter as any).parseArray;

export async function getReleaseInfo(
  ctx: Context,
): Promise<ReleaseInfo | undefined> {
  const { parserOpts, writerOpts, recommendedBumpOpts } =
    await changelogAngular;

  const commits = await getCommits({}, { cwd: ctx.cwd });

  const lastReleaseIndex = commits.findIndex((commit) => {
    if (commit.tags.some((tag) => semver.valid(tag))) {
      return true;
    }
    const match = commit.body.split('\n')[0].match(RELEASE_TITLE_REGEX);
    return semver.valid(match?.groups?.version);
  });

  const newCommits =
    lastReleaseIndex >= 0 ? commits.slice(0, lastReleaseIndex) : commits;
  if (!newCommits.length) {
    return;
  }

  const conventionalCommits = newCommits
    .slice(0, lastReleaseIndex)
    .map((commit) => ({
      ...commitsParser.sync(commit.body, parserOpts),
      hash: commit.hash,
    }));

  const pkgJson = JSON.parse(
    await fs.promises.readFile(path.join(ctx.cwd, 'package.json'), 'utf-8'),
  );

  const bumpInfo: BumpInfo = recommendedBumpOpts.whatBump(conventionalCommits);
  const version = semver.inc(pkgJson.version, BUMP_LEVEL[bumpInfo.level])!;

  const changelog = parseArray(
    conventionalCommits as unknown as changelogWriter.TransformedCommit[],
    {
      version,
      host: GITHUB_ORIGIN,
      owner: ctx.repo.owner,
      repository: ctx.repo.repo,
      commit: 'commit',
    },
    writerOpts,
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (changelog.trim().split('\n').length === 1) {
    return;
  }

  return {
    version,
    changelog,
  };
}
