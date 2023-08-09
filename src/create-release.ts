import * as core from '@actions/core';
import { RestEndpointMethodTypes } from '@octokit/rest';

import { RELEASE_TITLE_REGEX } from './shared/constants';
import { Context } from './shared/context';
import { createLogger } from './shared/logger';

const logger = createLogger('release');

type PullRequest =
  RestEndpointMethodTypes['repos']['listPullRequestsAssociatedWithCommit']['response']['data'][number];

export async function createRelease(ctx: Context) {
  try {
    logger.info(`Fetching associated PR with commit '${ctx.options.sha}'`);

    const pullsRes =
      await ctx.octokit.repos.listPullRequestsAssociatedWithCommit({
        ...ctx.repo,
        commit_sha: ctx.options.sha,
      });

    const pull = pullsRes.data[0];
    if (!pull) {
      logger.warn('No associated PR found');
      return;
    }
    logger.succ(`Found '${pull.html_url}'`);

    const match = pull.title.match(RELEASE_TITLE_REGEX);
    const version = match?.groups?.version;
    if (!version) {
      logger.warn(`Failed to parse PR title '${pull.title}'`);
      return;
    }

    logger.info(`Creating tag 'v${version}'`);
    await ensureTag(ctx, pull, version);

    logger.info(`Createing GitHub release 'v${version}'`);
    await ensureRelease(ctx, pull, version);

    core.setOutput('release', JSON.stringify({ version }));
  } catch (error) {
    logger.fail(error);
    throw error;
  }
}

async function ensureTag(ctx: Context, pull: PullRequest, version: string) {
  const hasTag = await checkExists(
    ctx.octokit.git.getRef({
      ...ctx.repo,
      ref: `tags/v${version}`,
    }),
  );

  if (hasTag) {
    logger.warn(`Tag v${version} already exists`);
    return;
  }
  await ctx.octokit.git.createRef({
    ...ctx.repo,
    ref: `refs/tags/v${version}`,
    sha: pull.merge_commit_sha!,
  });

  logger.succ(`Release tag v${version} created`);
}

async function ensureRelease(ctx: Context, pull: PullRequest, version: string) {
  const hasExistingRelease = await checkExists(
    ctx.octokit.repos.getReleaseByTag({
      ...ctx.repo,
      tag: `v${version}`,
    }),
  );

  if (hasExistingRelease) {
    logger.warn(`Release with tag v${version} already exists`);
    return;
  }
  await ctx.octokit.repos.createRelease({
    ...ctx.repo,
    tag_name: `v${version}`,
    body: pull.body || undefined,
  });

  logger.succ(`GitHub release v${version} created`);
}

function checkExists(promise: Promise<unknown>): Promise<boolean> {
  return promise.then(
    () => true,
    (error) => {
      if (error.status === 404) {
        return false;
      }
      throw error;
    },
  );
}
