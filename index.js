#!/usr/bin/env node

const program = require('commander');
const versionGenerator = require('./commands/generate-version.js');

//Register all commands here
versionGenerator.register(program);

// Parse the command
program.parse(process.argv);
