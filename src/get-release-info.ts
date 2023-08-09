import fs from 'fs';
import path from 'path';

import changelogAngular from 'conventional-changelog-angular';
import changelogWriter from 'conventional-changelog-writer';
import commitsParser from 'conventional-commits-parser';
import * as semver from 'semver';

import { GITHUB_ORIGIN, RELEASE_TITLE_REGEX } from './shared/constants';
import { Context } from './shared/context';
import { createLogger } from './shared/logger';

export interface ReleaseInfo {
  version: string;
  changelog: string;
  preVersion?: string;
}

interface BumpInfo {
  level: number;
  reason: string;
}

const BUMP_LEVEL = ['major', 'minor', 'patch'] as const;

const parseArray: (
  commits: Partial<changelogWriter.TransformedCommit>[],
  context?: Partial<changelogWriter.Context>,
  options?: changelogWriter.Options,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => string = (changelogWriter as any).parseArray;

const logger = createLogger('release-info');

export async function getReleaseInfo(
  ctx: Context,
): Promise<ReleaseInfo | undefined> {
  const { parserOpts, writerOpts, recommendedBumpOpts } =
    await changelogAngular;

  logger.info(`Fetching commits for '${ctx.options.branch}'`);

  const commitsRes = await ctx.octokit.repos.listCommits({
    ...ctx.repo,
    sha: ctx.options.branch,
  });

  const commits = commitsRes.data;

  const lastReleaseIndex = commits.findIndex((commit) => {
    const match = commit.commit.message
      .split('\n')[0]
      .match(RELEASE_TITLE_REGEX);
    return semver.valid(match?.groups?.version);
  });

  if (lastReleaseIndex) {
    logger.info('Latest release commit not found');
  } else {
    const commit = commits[lastReleaseIndex];
    const sha = commit.sha.slice(0, 7);
    const subject = commit.commit.message.split('\n')[0];
    logger.info(`Latest release commit is [${sha}] '${subject}'`);
  }

  const newCommits =
    lastReleaseIndex >= 0 ? commits.slice(0, lastReleaseIndex) : commits;

  logger.succ(
    `Got ${commits.length} commits, ${newCommits.length} new commits`,
  );

  if (!newCommits.length) {
    return;
  }

  const pkgJson = JSON.parse(
    await fs.promises.readFile(path.join(ctx.cwd, 'package.json'), 'utf-8'),
  );
  logger.info(
    `Current version is 'v${pkgJson.version}', resolving new version`,
  );

  const conventionalCommits = newCommits
    .slice(0, lastReleaseIndex)
    .map((commit) => ({
      ...commitsParser.sync(commit.commit.message, parserOpts),
      hash: commit.sha,
    }));

  const bumpInfo: BumpInfo = recommendedBumpOpts.whatBump(conventionalCommits);

  const { version, preVersion } = getNextVersion(
    pkgJson,
    bumpInfo.level,
    ctx.options.preid,
  );

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

  logger.succ(`New version: ${version} - ${bumpInfo.reason}`);

  return {
    version,
    changelog,
    preVersion,
  };
}

interface PkgJson {
  version: string;
  autorelease?: {
    preVersion?: string;
  };
}

function getNextVersion(
  pkgJson: PkgJson,
  level: number,
  preid?: string,
): { version: string; preVersion?: string } {
  if (!preid) {
    return {
      version: semver.inc(pkgJson.version, BUMP_LEVEL[level])!,
    };
  }
  const preVersion = pkgJson.autorelease?.preVersion;
  if (!preVersion || !semver.parse(pkgJson.version)?.prerelease.length) {
    return {
      version: semver.inc(pkgJson.version, `pre${BUMP_LEVEL[level]}`, preid)!,
      preVersion: pkgJson.version,
    };
  }
  const bumpFromPre = semver.inc(preVersion, `pre${BUMP_LEVEL[level]}`, preid)!;
  const bumpFromCurrent = semver.inc(pkgJson.version, 'prerelease', preid)!;
  if (semver.gt(bumpFromPre, bumpFromCurrent)) {
    return { version: bumpFromPre, preVersion };
  }
  return { version: bumpFromCurrent, preVersion };
}
