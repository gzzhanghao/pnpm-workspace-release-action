import { createPullRequest } from 'code-suggester';

import { getReleaseInfo } from './get-release-info';
import { PENDING_LABEL } from './shared/constants';
import { Context } from './shared/context';
import { createLogger } from './shared/logger';
import { updateChangelog } from './update-changelog';
import { updatePackages } from './update-packages';

const logger = createLogger('pr');

export async function createPr(ctx: Context) {
  try {
    logger.info(`Resolving release info from '${ctx.cwd}'`);
    const release = await getReleaseInfo(ctx);

    if (!release) {
      logger.warn('Nothing to release');
      return;
    }
    logger.succ(`Release as v${release.version}`);

    logger.info('Createing release patch');

    await Promise.all([
      updatePackages(ctx, release),
      updateChangelog(ctx, release),
    ]);

    logger.succ(`Update ${ctx.changes.size} files`);

    const releaseBranch = `release--${ctx.options.branch}`;
    const head = `${ctx.repo.owner}:${releaseBranch}`;

    logger.info(`Fetching open PRs with head '${head}'`);

    const existingPullsRes = await ctx.octokit.pulls.list({
      ...ctx.repo,
      head,
      state: 'open',
    });

    const existingPull = existingPullsRes.data[0];

    logger.succ(
      existingPull
        ? `Existing PR found ${ctx.urls.pull}/${existingPull.number}`
        : `No PR found`,
    );

    const title = `chore: release v${release.version}`;

    if (
      existingPull &&
      (existingPull.title !== title || existingPull.body !== release.changelog)
    ) {
      logger.info(`Updating existing PR title / body`);

      await Promise.all([
        ctx.octokit.pulls.update({
          ...ctx.repo,
          pull_number: existingPull.number,
          title,
          body: release.changelog,
        }),
        ctx.octokit.issues.addLabels({
          ...ctx.repo,
          issue_number: existingPull.number,
          labels: [PENDING_LABEL],
        }),
      ]);

      logger.succ('Update existing PR succeed');
    }

    logger.info('Creating / updating PR with release patch');

    const pullNumber = await createPullRequest(ctx.octokit, ctx.changes, {
      upstreamOwner: ctx.repo.owner,
      upstreamRepo: ctx.repo.repo,
      branch: releaseBranch,
      primary: ctx.options.branch,
      force: true,
      description: release.changelog,
      title,
      message: title,
      labels: [PENDING_LABEL],
    });

    logger.succ(`PR ${ctx.urls.pull}/${pullNumber} updated`);
  } catch (error) {
    logger.fail(error);
    throw error;
  }
}
