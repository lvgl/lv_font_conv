#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const fs = require('fs');

const OUT_DIR = 'dist';

shell.rm('-rf', OUT_DIR);
shell.mkdir(OUT_DIR);

const content = fs.readFileSync('web/content.html', 'utf8');
const index = fs.readFileSync('web/index.html', 'utf8');

fs.writeFileSync(`${OUT_DIR}/content.html`, content);

const index_out = index.replace('<include src="content.html"></include>', content);
fs.writeFileSync(`${OUT_DIR}/index.html`, index_out);
