'use strict';

const Gulp = require('gulp');
const RegexTools = require('regex-tools');

Gulp.task('update-regex', function () {
    let optionsFilePaths = [
        './src/regexs/parser-regex.js',
        './src/regexs/template-string-regex.js',
        './src/regexs/transform-factor-regexs.js'
    ];

    for (let path of optionsFilePaths) {
        RegexTools.process(path);
    }
});
