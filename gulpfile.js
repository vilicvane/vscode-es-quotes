'use strict';

const Gulp = require('gulp');
const RegexTools = require('regex-tools');

Gulp.task('update-regex', function () {
    let rxFilePaths = [
        './src/regexs/parser-regex.js',
        './src/regexs/template-string-regex.js'
    ];

    for (let rxFilePath of rxFilePaths) {
        RegexTools.processRxFile(rxFilePath);
    }
});
