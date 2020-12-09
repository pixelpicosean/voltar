'use strict';

const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');

module.exports.cliPrefix = `[${colors.blue('Voltar')}]`;

module.exports.rmdir = function rmdir(dir) {
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    let filename = path.join(dir, files[i]);
    let stat = fs.statSync(filename);

    if (stat.isDirectory()) rmdir(filename);
    else fs.unlinkSync(filename);
  }
  fs.rmdirSync(dir);
};
