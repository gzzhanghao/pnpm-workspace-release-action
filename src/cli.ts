import { Octokit } from '@octokit/rest';
import { program } from 'commander';

import { createPr } from './create-pr';
import { createRelease } from './create-release';
import { Context } from './shared/context';

program
  .command('release')
  .option('--cwd <dir>', 'Change to directory <dir>', process.cwd())
  .option('--token <token>', 'GitHub token with repo write permissions')
  .option('--repo-url <url>', 'GitHub repository URL')
  .option('--branch <branch>', 'The upstream branch to open a PR against')
  .action(release);

program.parse(process.argv);

export interface CliOptions {
  cwd: string;
  token: string;
  branch: string;
  repoUrl: string;
}

async function release(options: CliOptions) {
  const repoUrl = new URL(options.repoUrl);
  const [, owner, repo] = repoUrl.pathname.split('/');

  const ctx = new Context({
    cwd: options.cwd,
    repo: { owner, repo },
    branch: options.branch,
    octokit: new Octokit({
      auth: options.token,
    }),
  });

  await Promise.all([createPr(ctx), createRelease(ctx)]);
}
