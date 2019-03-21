// Custom Error type to simplify error messageing
//
'use strict';


const ExtendableError = require('es6-error');


module.exports = class AppError extends ExtendableError {};
