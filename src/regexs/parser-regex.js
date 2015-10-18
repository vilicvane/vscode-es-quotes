var regexs = {
    regexs: [
        // Comment
        {
            name: 'comment',
            regexs: [
                /\/\*[\s\S]*?(?:\*\/|$)/,
                /\/\/.*/
            ],
            or: true
        },
        // String literal
        [
            /($quote:["'])/,
            {
                name: 'stringBody',
                regexs: {
                    regexs: [
                        /\\(?:\r\n|[^])/,
                        /(?!($quote))./
                    ],
                    or: true,
                    repeat: '*'
                }
            },
            /($closingQuote:($quote))?/
        ],
        /($templateStringQuote:`)/,
        /[()\[\]{]|($curlyKet:\})/
    ],
    or: true
};

exports.options =  {
    name: 'parsing',
    operation: 'combine',
    target: '../parser.ts',
    global: true,
    regexs: regexs
};
