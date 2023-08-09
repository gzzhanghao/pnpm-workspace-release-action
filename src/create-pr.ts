import { createPullRequest } from 'code-suggester';

import { getReleaseInfo } from './get-release-info';
import { Context } from './shared/context';
import { createLogger } from './shared/logger';
import { updateChangelog } from './update-changelog';
import { updatePackages } from './update-packages';

const logger = createLogger('pr');

export async function createPr(ctx: Context) {
  try {
    logger.info('Resolving release info');
    const release = await getReleaseInfo(ctx);

    if (!release) {
      logger.warn('Nothing to release');
      return;
    }
    logger.succ(`Release as v${release.version}`);

    logger.info('Generating release changeset');

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
        : 'No PR found',
    );

    const title = `chore: release v${release.version}`;

    if (
      existingPull &&
      (existingPull.title !== title || existingPull.body !== release.changelog)
    ) {
      logger.info('Updating existing PR');

      await ctx.octokit.pulls.update({
        ...ctx.repo,
        pull_number: existingPull.number,
        title,
        body: release.changelog,
      });

      logger.succ('Existing PR updated');
    }

    logger.info(existingPull ? 'Updating existing PR' : 'Creating release PR');

    const pullNumber = await createPullRequest(ctx.octokit, ctx.changes, {
      upstreamOwner: ctx.repo.owner,
      upstreamRepo: ctx.repo.repo,
      description: release.changelog,
      title,
      branch: releaseBranch,
      primary: ctx.options.branch,
      message: title,
      force: true,
      fork: false,
    });

    logger.succ(`PR ${ctx.urls.pull}/${pullNumber} updated`);
  } catch (error) {
    logger.fail(error);
    throw error;
  }
}
