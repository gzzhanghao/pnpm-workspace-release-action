import { Octokit } from '@octokit/rest';
import { program } from 'commander';

import { createPr } from './create-pr';
import { createRelease } from './create-release';
import { Context } from './shared/context';

program
  .command('release')
  .option('--token <token>', 'GitHub token with repo write permissions')
  .option('--cwd <dir>', 'Change to directory <dir>', process.cwd())
  .option('--repo-url <url>', 'GitHub repository URL')
  .option('--branch <branch>', 'The upstream branch to open a PR against')
  .option('--sha <sha>', 'The SHA of the latest commit')
  .option('--latest', 'Whether the release should be set as the latest release')
  .option(
    '--preid [preid]',
    'Identifier to be used to prefix prerelease version increments',
  )
  .action(release);

program.parse(process.argv);

export interface CliOptions {
  cwd: string;
  token: string;
  repoUrl: string;
  branch: string;
  sha: string;
  preid?: string;
  latest?: boolean;
}

async function release(options: CliOptions) {
  const repoUrl = new URL(options.repoUrl);
  const [, owner, repo] = repoUrl.pathname.split('/');

  const ctx = new Context({
    octokit: new Octokit({
      auth: options.token,
    }),
    cwd: options.cwd,
    repo: { owner, repo },
    branch: options.branch,
    sha: options.sha,
    preid: options.preid,
    latest: options.latest,
  });

  await Promise.all([createRelease(ctx), createPr(ctx)]);
}
