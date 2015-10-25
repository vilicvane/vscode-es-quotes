'use strict';

let singleToDoubleFactors = {
    name: 'single-to-double-factors',
    operation: 'combine',
    target: '../transform.ts',
    global: true,
    regexs: {
        regexs: [
            /($escapedQuote:\\')/,
            /($unescapedQuote:")/,
            /\\[^]/
        ],
        or: true
    }
};

let doubleToSingleFactors = {
    name: 'double-to-single-factors',
    operation: 'combine',
    target: '../transform.ts',
    global: true,
    regexs: {
        regexs: [
            /($escapedQuote:\\")/,
            /($unescapedQuote:')/,
            /\\[^]/
        ],
        or: true
    }
};

let normalToTemplateFactors = {
    name: 'normal-to-template-factors',
    operation: 'combine',
    target: '../transform.ts',
    global: true,
    regexs: {
        regexs: [
            /($escapedQuote:\\["'])/,
            /($unescapedQuote:`)/,
            /($unescapedPartialClosing:\$\{)/,
            // 'abc\n\
            //  def'
            /($endOfLine:\\n\\\r?\n)/,
            /\\[^]/
        ],
        or: true
    }
};

let templateToNormalFactors = {
    name: 'template-to-normal-factors',
    operation: 'combine',
    target: '../transform.ts',
    global: true,
    regexs: {
        regexs: [
            /($escapedQuote:\\`)/,
            // \${ or \$\{ or $\{
            /($escapedPartialClosing:\\\$\\?\{|\$\\\{)/,
            /($unescapedQuote:["'])/,
            /($endOfLine:\r?\n)/,
            /\\(?:\r\n|[^])/
        ],
        or: true
    }
};

exports.options = [
    singleToDoubleFactors,
    doubleToSingleFactors,
    normalToTemplateFactors,
    templateToNormalFactors
];
