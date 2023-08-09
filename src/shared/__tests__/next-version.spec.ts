import { getNextVersion } from '../next-version';

const levels = ['major', 'minor', 'patch'] as const;

describe('calc', () => {
  test('1.0.0');
  test('1.0.0', undefined, 'alpha');

  test('1.0.1-alpha.0', '1.0.0', 'alpha');
  test('1.1.0-alpha.0', '1.0.0', 'alpha');
  test('2.0.0-alpha.0', '1.0.0', 'alpha');

  test('1.0.1-alpha.0', '1.0.0', 'beta');
  test('1.1.0-alpha.0', '1.0.0', 'beta');
  test('2.0.0-alpha.0', '1.0.0', 'beta');

  test('1.0.1-alpha.0', '1.0.0');
  test('1.1.0-alpha.0', '1.0.0');
  test('2.0.0-alpha.0', '1.0.0');
});

function test(version: string, preVersion?: string, preid?: string) {
  for (const level of levels) {
    it(`${version} + ${level} ${preVersion || '-'} ${preid || '-'}`, () => {
      expect(
        getNextVersion(version, level, preVersion, preid),
      ).toMatchSnapshot();
    });
  }
}
