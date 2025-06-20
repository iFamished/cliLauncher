#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const runtime_1 = require("../core/game/launch/runtime");
const program = new commander_1.Command();
const runtime = new runtime_1.Runtime();
program
    .name('origami')
    .description('Lightweight Minecraft CLI Launcher')
    .version(runtime['version'])
    .action(() => {
    runtime.start();
});
program.parse(process.argv);
//# sourceMappingURL=origami.js.map