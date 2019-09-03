#!/usr/bin/env node

'use strict';

const AppError = require('./lib/app_error');

require('./lib/cli').run(process.argv.slice(2)).catch(err => {
  // Try to beautify normal errors
  if (err instanceof AppError) {
    /*eslint-disable no-console*/
    console.error(err.message.trim());
    process.exit(1);
  }
  // rethrow crashes
  throw err;
});
