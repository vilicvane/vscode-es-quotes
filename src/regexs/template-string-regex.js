var regexs = [
    /($quote:[`}])/,
    {
        name: 'stringBody',
        regexs: {
            regexs: [
                /\\[^]/,
                /(?!\$\{)[^`]/
            ],
            or: true,
            repeat: '*'
        }
    },
    /($closingQuote:`|\$\{)?/
];

exports.options =  {
    name: 'templateString',
    operation: 'combine',
    target: '../parser.ts',
    global: true,
    regexs: regexs
};
