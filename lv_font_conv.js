#!/usr/bin/env node

'use strict';

const AppError = require('./lib/app_error');

require('./lib/cli').run(process.argv.slice(2)).catch(err => {
  /*eslint-disable no-console*/
  if (err instanceof AppError) console.error(err.message.trim());
  else console.error(err.stack);
  process.exit(1);
});
