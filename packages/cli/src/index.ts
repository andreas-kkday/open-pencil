#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

import { fontManager } from '@open-pencil/core/text'

import { COMMANDS } from './commands'
import { loadFontSubstitutions } from './font-config'

const { version } = await import('../package.json')

fontManager.setFontSubstitutions(loadFontSubstitutions())

const main = defineCommand({
  meta: {
    name: 'openpencil',
    description:
      'OpenPencil CLI — inspect, export, and lint design documents, and drive the running app',
    version
  },
  subCommands: COMMANDS
})

void runMain(main)
