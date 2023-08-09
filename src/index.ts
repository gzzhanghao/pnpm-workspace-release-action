/* eslint-disable @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { PushEvent } from '@octokit/webhooks-definitions/schema';

import { createPr } from './create-pr';
import { createRelease } from './create-release';
import { Context } from './shared/context';

async function main() {
  if (github.context.eventName !== 'push') {
    return;
  }
  const payload = github.context.payload as PushEvent;
  if (!payload.ref.startsWith('refs/heads/')) {
    return;
  }
  const branch = payload.ref.slice('refs/heads/'.length);

  const ctx = new Context({
    octokit: github.getOctokit(core.getInput('token')).rest as any,
    cwd: process.cwd(),
    repo: github.context.repo,
    branch,
    sha: payload.after,
    preid: core.getInput('preid') || undefined,
    latest: core.getBooleanInput('latest') || undefined,
  });

  await Promise.all([createRelease(ctx), createPr(ctx)]);
}

main().catch((error) => {
  core.setFailed(`pnpm-workspace-release failed: ${error.message}`);
});
