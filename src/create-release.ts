import { RestEndpointMethodTypes } from '@octokit/rest';

import { PENDING_LABEL } from './shared/constants';
import { Context } from './shared/context';
import { createLogger } from './shared/logger';

const logger = createLogger('release');

const PULL_REQUEST_TITLE_REGEX = /^chore: release v(?<version>.+)$/;

type PullRequest =
  RestEndpointMethodTypes['pulls']['list']['response']['data'][number];

export async function createRelease(ctx: Context) {
  try {
    logger.info(`Fetching closed PRs with base ${ctx.options.branch}`);

    const closedPullsRes = await ctx.octokit.pulls.list({
      ...ctx.repo,
      base: ctx.options.branch,
      state: 'closed',
    });

    const pendingPulls = closedPullsRes.data.filter(
      (pr) =>
        pr.merge_commit_sha &&
        pr.labels.some((label) => label.name === PENDING_LABEL),
    );

    logger.succ(
      `Found ${closedPullsRes.data.length} closed PRs and ${pendingPulls.length} pending release`,
    );

    await Promise.all(
      pendingPulls.map(async (pull) => {
        pull.title = 'chore: release v0.1.0';
        const pullUrl = `${ctx.urls.pull}/${pull.number}`;

        const match = pull.title.match(PULL_REQUEST_TITLE_REGEX);
        const version = match?.groups?.version;
        if (!version) {
          logger.warn(
            `Failed to parse PR title '${pull.title}' for '${pullUrl}'`,
          );
          return;
        }

        logger.info(`Creating tag ref v${version} for '${pullUrl}'`);
        await ensureTag(ctx, pull, version);

        logger.info(`Createing GitHub release v${version}`);
        await ensureRelease(ctx, pull, version);

        logger.info(`Updating pending PR '${pullUrl}'`);
        await ctx.octokit.issues.removeLabel({
          ...ctx.repo,
          issue_number: pull.number,
          name: PENDING_LABEL,
        });

        logger.succ(`PR '${pullUrl}' marked published`);
      }),
    );
  } catch (error) {
    logger.fail(error);
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
