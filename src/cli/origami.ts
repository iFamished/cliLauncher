#!/usr/bin/env node
import { Command } from 'commander';
import { Runtime } from '../core/game/launch/runtime';

const program = new Command();
const runtime = new Runtime();

program
    .name('origami')
    .description('Lightweight Minecraft CLI Launcher')
    .version(runtime['version'])
    .action(() => {
        runtime.start();
    });

program.parse(process.argv);