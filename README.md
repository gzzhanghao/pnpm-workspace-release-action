# PNPM workspace release action

> Publish PNPM workspace with [release-please](https://github.com/googleapis/release-please/) like workflow.

Automate releases PNPM workspace with Conventional Commit Messages.

## Setting up this action

Create a `.github/workflows/release-workspace.yml` file with following content:

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: gzzhanghao/pnpm-workspace-release-action@v1.0
```

Merge the above action into your repository and the action will start creating release PRs for you.

## Configuration

| input | description |
| --- | --- |
| `token` | A GitHub secret token, the action defaults to using the special `secrets.GITHUB_TOKEN` |
| `preid` | Identifier to be used to prefix prerelease version increments |
| `latest` | Whether the release should be set as the latest release |
