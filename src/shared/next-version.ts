import * as semver from 'semver';

export function getNextVersion(
  version: string,
  level: 'major' | 'minor' | 'patch',
  preVersion?: string,
  preid?: string,
): { version: string; preVersion?: string } {
  if (!preVersion) {
    if (!preid) {
      return {
        version: semver.inc(version, level)!,
      };
    }
    return {
      version: semver.inc(version, `pre${level}`, preid)!,
      preVersion: version,
    };
  }
  let bumpFromCurrent: string;
  let bumpFromPre: string;
  if (preid) {
    bumpFromCurrent = semver.inc(version, 'prerelease', preid)!;
    bumpFromPre = semver.inc(preVersion, `pre${level}`, preid)!;
  } else {
    bumpFromCurrent = version.split('-')[0];
    bumpFromPre = semver.inc(preVersion, level)!;
  }
  return {
    version: semver.gt(bumpFromCurrent, bumpFromPre)
      ? bumpFromCurrent
      : bumpFromPre,
    preVersion,
  };
}
