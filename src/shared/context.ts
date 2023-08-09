import { Octokit } from '@octokit/rest';
import { FileData } from 'code-suggester/build/src/types';

import { GITHUB_ORIGIN } from './constants';

export interface ContextOptions {
  cwd: string;
  repo: RepoInfo;
  branch: string;
  sha: string;
  octokit: Octokit;
}

export interface RepoInfo {
  owner: string;
  repo: string;
}

export class Context {
  changes = new Map<string, FileData>();

  cwd: string;

  repo: RepoInfo;

  octokit: Octokit;

  urls: Record<string, string>;

  constructor(public readonly options: ContextOptions) {
    this.cwd = options.cwd;
    this.repo = options.repo;
    this.octokit = options.octokit;

    this.urls = {
      pull: `${GITHUB_ORIGIN}/${this.repo.owner}/${this.repo.repo}/pull`,
    };
  }

  async writeFile(filename: string, content: string) {
    this.changes.set(filename, { mode: '100644', content });
  }
}
