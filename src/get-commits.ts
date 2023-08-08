import gitRawCommits, { ExecOptions, GitOptions } from 'git-raw-commits';

export interface CommitInfo {
  hash: string;
  time: Date;
  tags: string[];
  body: string;
}

const DELIMITER = '==================== >8 ====================';

const formatLines = [
  '%H', // commit hash
  '%at', // author date, UNIX timestamp
  '%D', // ref names without the " (", ")" wrapping.
  '%B', // raw body (unwrapped subject and body)
];

export function getCommits(options: GitOptions, execOptions: ExecOptions) {
  return new Promise<CommitInfo[]>((resolve, reject) => {
    const commits: CommitInfo[] = [];

    const stream = gitRawCommits(
      {
        ...options,
        format: formatLines.join(`%n${DELIMITER}%n`),
      },
      execOptions,
    );

    stream.on('data', (data: Buffer) => {
      const [hash, time, refs, body] = data
        .toString()
        .split(`\n${DELIMITER}\n`);

      commits.push({
        hash,
        time: new Date(Number(time) * 1000),
        tags: refs
          .split(/\s*,\s*/)
          .flatMap((item) => item.match(/^tag:\s*(.+)$/)?.[1] || []),
        body,
      });
    });

    stream.once('end', () => {
      resolve(commits);
    });

    stream.once('error', reject);
  });
}
