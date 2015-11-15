import { Range, Position } from 'vscode';

import { RangeBuilder } from './range';
import { StringType } from './es-quotes';

interface InterStringGroupTarget extends StringGroupTarget {
    bracketStack: string[];
    partials: InterStringTarget[];
}

export interface StringBodyTarget {
    /** ", ', ` or } */
    opening: string;
    /** ", ', ` or ${ */
    closing: string;
    type: StringType;
    body: string;
    range: Range;
}

export interface StringGroupTarget {
    partials: StringTarget[];
    hasLowPriorityOperator: boolean;
    whitespacesRangeAtBeginning: Range;
    whitespacesRangeAtEnd: Range;
}

export type StringTarget = StringBodyTarget | StringGroupTarget;

type InterStringTarget = StringBodyTarget | InterStringGroupTarget;

const parsingRegex = /* /$parsing/ */ /(\/\*[\s\S]*?(?:\*\/|$)|\/\/.*\r?\n)|(["'])((?:\\(?:\r\n|[^])|(?!\2|\\).)*)(\2)?|(`)|([()\[\]{}])|([?&|+-]|&&|\|\||<<<?|>>>?)|(\s+)|[^]/g;
const templateStringRegex = /* /$templateString/ */ /([`}])((?:\\[^]|(?!\$\{)[^`])*)(`|\$\{)?/g; // This comment is to fix highlighting: `

/* /$parsing/ */
const enum ParsingRegexIndex {
    comment = 1,
    quote,
    stringBody,
    closingQuote,
    templateStringQuote,
    bracket,
    operator,
    whitespace
}

/* /$templateString/ */
const enum TemplateStringRegexIndex {
    quote = 1,
    stringBody,
    closingQuote
}

const bracketConsumptionPair: {
    [key: string]: string;
} = {
    '}': '{',
    ']': '[',
    ')': '('
};

export function parse(source: string): StringTarget[] {
    let rangeBuilder = new RangeBuilder(source);
    
    let rootStringTargets: InterStringTarget[] = [];
    let nestedStringTargetStack: InterStringTarget[] = [];
    
    let currentGroupTarget: InterStringGroupTarget;
    let currentStringTargets = rootStringTargets;
    let currentBracketStack: string[];
    
    let isNewGroupTarget: boolean;
    
    let groups: RegExpExecArray;
    
    while (groups = parsingRegex.exec(source)) {
        let text = groups[0];
        
        isNewGroupTarget = false;
        
        if (groups[ParsingRegexIndex.comment]) {
            // Do nothing.
        } else if (groups[ParsingRegexIndex.quote]) {
            let quote = groups[ParsingRegexIndex.quote];
            let body = groups[ParsingRegexIndex.stringBody];
            let range = rangeBuilder.getRange(parsingRegex.lastIndex - text.length, parsingRegex.lastIndex);
            
            // TODO:
            // if (currentBracketStack && currentBracketStack.length) {
            //     pushNestedTargetStack();
            // }
            
            let target: StringBodyTarget = {
                body,
                range,
                opening: quote,
                closing: quote,
                type: quote === '"' ? StringType.doubleQuoted : StringType.singleQuoted
            };
            
            currentStringTargets.push(target);
        } else if (
            groups[ParsingRegexIndex.templateStringQuote] || (
                nestedStringTargetStack.length &&
                currentBracketStack.indexOf('{') < 0 &&
                groups[ParsingRegexIndex.bracket] === '}'
            )
        ) {
            if (groups[ParsingRegexIndex.templateStringQuote]) {
                // `abc${123}def`
                // ^
                pushNestedTargetStack();
            } else {
                // `abc${123}def`
                //          ^
                popNestedTargetStack();
            }
            
            templateStringRegex.lastIndex = parsingRegex.lastIndex - groups[0].length;
            
            // The match below should always success.
            let templateStringGroups = templateStringRegex.exec(source);
            let templateStringText = templateStringGroups[0];
            
            parsingRegex.lastIndex = templateStringRegex.lastIndex;
            
            let body = templateStringGroups[TemplateStringRegexIndex.stringBody];
            
            let range = rangeBuilder.getRange(
                templateStringRegex.lastIndex - templateStringText.length,
                templateStringRegex.lastIndex
            );
            
            let openingQuote = templateStringGroups[TemplateStringRegexIndex.quote];
            let closingQuote = templateStringGroups[TemplateStringRegexIndex.closingQuote] || '`';
            
            let target: StringBodyTarget = {
                body,
                range,
                opening: openingQuote,
                closing: closingQuote,
                type: StringType.template
            };
            
            currentStringTargets.push(target);
            
            if (closingQuote === '${') {
                // `abc${123}def`
                //     ^
                pushNestedTargetStack();
            } else {
                // `abc${123}def`
                //              ^
                popNestedTargetStack();
            }
        } else if (currentBracketStack) {
            if (groups[ParsingRegexIndex.bracket]) {
                let bracket = groups[ParsingRegexIndex.bracket];
            
                if (bracket in bracketConsumptionPair) {
                    let bra = bracketConsumptionPair[bracket];
                    if (currentBracketStack.length && bra === currentBracketStack[currentBracketStack.length - 1]) {
                        currentBracketStack.pop();
                    } else {
                        // Otherwise there might be some syntax error, but we don't really care.
                        console.warn(`Mismatched right bracket "${bracket}".`);
                    }
                } else {
                    currentBracketStack.push(bracket);
                }
            } else if (!currentBracketStack.length && groups[ParsingRegexIndex.operator]) {
                currentGroupTarget.hasLowPriorityOperator = true;
            }
        }
        
        if (currentGroupTarget) {
            if (groups[ParsingRegexIndex.whitespace]) {
                let range = rangeBuilder.getRange(parsingRegex.lastIndex - text.length, parsingRegex.lastIndex);
                
                if (currentGroupTarget.whitespacesRangeAtBeginning instanceof Range) {
                    currentGroupTarget.whitespacesRangeAtEnd = range;
                } else {
                    currentGroupTarget.whitespacesRangeAtBeginning = range;
                }
            } else if (!isNewGroupTarget) {
                if (currentGroupTarget.whitespacesRangeAtBeginning instanceof Range) {
                    let start = rangeBuilder.getPosition(parsingRegex.lastIndex);
                    let range = new Range(start, start);
                    
                    currentGroupTarget.whitespacesRangeAtEnd = range;
                } else {
                    let end = rangeBuilder.getPosition(parsingRegex.lastIndex - text.length);
                    let range = new Range(end, end);
                    
                    currentGroupTarget.whitespacesRangeAtBeginning = range;
                }
            }
        }
    }
    
    finalizeTargets(rootStringTargets);
    
    return rootStringTargets;
    
    function pushNestedTargetStack(): void {
        let target: InterStringGroupTarget = {
            partials: [],
            bracketStack: [],
            hasLowPriorityOperator: false,
            whitespacesRangeAtBeginning: undefined,
            whitespacesRangeAtEnd: undefined
        };
        
        currentStringTargets.push(target);
        
        currentGroupTarget = target;
        currentStringTargets = target.partials;
        currentBracketStack = target.bracketStack;
        nestedStringTargetStack.push(target);
        
        isNewGroupTarget = true;
    }
    
    function popNestedTargetStack(): void {
        nestedStringTargetStack.pop();
        
        let lastIndex = nestedStringTargetStack.length - 1;
        
        if (lastIndex < 0) {
            currentGroupTarget = undefined;
            currentStringTargets = rootStringTargets;
            currentBracketStack = undefined;
        } else {
            let target = nestedStringTargetStack[lastIndex] as InterStringGroupTarget;
            currentGroupTarget = target;
            currentStringTargets = target.partials;
            currentBracketStack = target.bracketStack;
        }
    }
    
    function finalizeTargets(targets: InterStringTarget[]) {
        for (let i = 0; i < targets.length; i++) {
            let target = targets[i] as InterStringGroupTarget;
            
            if (target.partials) {
                delete target.bracketStack;
                
                finalizeTargets(target.partials);
            }
        }
    }
}

export function isStringGroupTarget(target: StringGroupTarget | StringBodyTarget): target is StringGroupTarget {
    return !!(target as StringGroupTarget).partials;
}

export function isStringBodyTarget(target: StringGroupTarget | StringBodyTarget): target is StringBodyTarget {
    return !(target as StringGroupTarget).partials;
}
