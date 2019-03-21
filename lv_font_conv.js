#!/usr/bin/env node

'use strict';

const AppError = require('./lib/app_error');

try {
  require('./lib/cli').run();
} catch (err) {
  // Try to beaytify normal errors
  if (err instanceof AppError) {
    /*eslint-disable no-console*/
    console.error(err.message.trim());
    process.exit(1);
  }
  // rethrow crashes
  throw err;
}
