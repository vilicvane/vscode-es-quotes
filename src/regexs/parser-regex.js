var regexs = {
    regexs: [
        // Comment
        {
            name: 'comment',
            regexs: [
                /\/\*[\s\S]*?(?:\*\/|$)/,
                /\/\/.*\r?\n/
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
                        /(?!($quote)|\\)./
                    ],
                    or: true,
                    repeat: '*'
                }
            },
            /($closingQuote:($quote))?/
        ],
        // Regex literal
        [
            /\//,
            {
                regexs: [
                    /\\./,
                    [
                        /\[/,
                        {
                            regexs: [
                                /\\./,
                                /[^\]\\\r\n]/
                            ],
                            or: true,
                            repeat: '*'
                        },
                        /\]?/
                    ],
                    /[^\\/\r\n]/
                ],
                or: true,
                repeat: '+'
            },
            // not using optional closing for less conflict with devide operator `/`
            /\//
        ],
        /($templateStringQuote:`)/,
        /($bracket:[()\[\]{}])/,
        /($operator:[?&|+-]|&&|\|\||<<<?|>>>?)/,
        /($whitespace:\s+)/,
        /[^]/
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
