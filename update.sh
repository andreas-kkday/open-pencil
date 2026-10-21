#!/bin/bash
git stash
git checkout master
git pull

git stash pop

bun install
bun build
bun build:packages

for i in artifacts
do
  bun add -g $i
done
