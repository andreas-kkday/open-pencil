#!/usr/bin/env bash
set -euo pipefail

git stash
git checkout master
git pull

git stash pop

bun install
bun run build

# Build publishable package tarballs into ./artifacts, then install those exact
# local artifacts globally instead of trying to install the artifacts directory.
rm -rf artifacts
bun --filter @open-pencil/release-packages-tools prepare-publish-dirs
bun --filter @open-pencil/release-packages-tools pack
mkdir -p artifacts
cp .npm-packages/*.tgz artifacts/

mkdir -p ~/open-pencil-local
cd ~/open-pencil-local

mise use node@24
mise use bun@latest

bun init -y

# Install all locally built packages together
bun add /Users/andreas/git/open-pencil/.npm-packages/*.tgz
cd -
