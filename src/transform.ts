import {
    StringType
} from './es-quotes';

interface Transformer {
    (body: string): string;
}

function transformSingleToDouble(body: string): string {
    let factorsRegex = /* /$single-to-double-factors/ */ /(\\')|(")|\\[^]/g;
    
    return body.replace(factorsRegex, /* /$single-to-double-factors/ */ (
        text: string,
        escapedQuote: string,
        unescapedQuote: string
    ) => {
        if (escapedQuote) {
            return "'";
        } else if (unescapedQuote) {
            return '\\"';
        } else {
            return text;
        }
    });
}

function transformDoubleToSingle(body: string): string {
    let factorsRegex = /* /$double-to-single-factors/ */ /(\\")|(')|\\[^]/g;
    
    return body.replace(factorsRegex, /* /$double-to-single-factors/ */ (
        text: string,
        escapedQuote: string,
        unescapedQuote: string
    ) => {
        if (escapedQuote) {
            return '"';
        } else if (unescapedQuote) {
            return "\\'";
        } else {
            return text;
        }
    });
}

function transformNormalToTemplate(body: string): string {
    let factorsRegex = /* /$normal-to-template-factors/ */ /(\\["'])|(`)|(\$\{)|(\\n\\\r?\n)|\\[^]/g;
    
    return body.replace(factorsRegex, /* /$normal-to-template-factors/ */ (
        text: string,
        escapedQuote: string,
        unescapedQuote: string,
        unescapedPartialClosing: string,
        endOfLine: string
    ) => {
        if (escapedQuote) {
            return escapedQuote.slice(1);
        } else if (unescapedQuote) {
            return '\\' + unescapedQuote;
        } else if (unescapedPartialClosing) {
            return '\\' + unescapedPartialClosing;
        } else if (endOfLine) {
            return '\n';
        } else {
            return text;
        }
    });
}

function transformTemplateToNormal(body: string, type: StringType): string {
    let factorsRegex = /* /$template-to-normal-factors/ */ /(\\`)|(\\\$\\?\{|\$\\\{)|(["'])|(\r?\n)|\\(?:\r\n|[^])/g; // fix highlight: `
    
    return body.replace(factorsRegex, /* /$template-to-normal-factors/ */ (
        text: string,
        escapedQuote: string,
        escapedPartialClosing: string,
        unescapedQuote: string,
        endOfLine: string
    ) => {
        if (escapedQuote) {
            return '`';
        } else if (escapedPartialClosing) {
            return '${';
        } else if (unescapedQuote) {
            if (unescapedQuote === '"') {
                if (type === StringType.doubleQuoted) {
                    return '\\"';
                }
            } else {
                if (type === StringType.singleQuoted) {
                    return "\\'";
                }
            }
            
            return unescapedQuote;
        } else if (endOfLine) {
            return '\\n\\' + endOfLine;
        } else {
            return text;
        }
    });
}

export function transform(
    body: string,
    fromType: StringType,
    toType: StringType,
    first = true,
    last = true
): string {
    if (fromType === toType) {
        // do nothing.
    } else if (fromType === StringType.template) {
        // template to normal.
        body = transformTemplateToNormal(body, toType);
    } else if (toType === StringType.template) {
        // normal to template.
        body = transformNormalToTemplate(body);
    } else if (fromType === StringType.doubleQuoted) {
        // double to single.
        body = transformDoubleToSingle(body);
    } else {
        // single to double.
        body = transformSingleToDouble(body);
    }
    
    return wrapLiteral(body, toType, first, last);
}

export function wrapLiteral(
    body: string,
    type: StringType,
    first = true,
    last = true
): string {
    switch (type) {
        case StringType.singleQuoted:
            return `'${body}'`;
        case StringType.doubleQuoted:
            return `"${body}"`;
        case StringType.template:
            let opening = first ? '`' : '}';
            let closing = last ? '`' : '${';
            return opening + body + closing;
    }
}
