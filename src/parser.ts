import { Range, Position } from 'vscode';
import { RangeBuilder } from './range';

interface InterStringGroupTarget extends StringGroupTarget {
    bracketStack?: string[];
    partials?: InterStringTarget[];
}

export interface StringBodyTarget {
    /** ", ', ` or } */
    opening?: string;
    /** ", ', ` or ${ */
    closing?: string;
    body: string;
    range: Range;
}

export interface StringGroupTarget {
    partials?: StringTarget[];
}

export type StringTarget = StringBodyTarget | StringGroupTarget;

type InterStringTarget = StringBodyTarget | InterStringGroupTarget;

const parsingRegex = /* /$parsing/ */ /(\/\*[\s\S]*?(?:\*\/|$)|\/\/.*)|(["'])((?:\\(?:\r\n|[^])|(?!\2).)*)(\2)?|(`)|[()\[\]{]|(\})/g;
const templateStringRegex = /* /$templateString/ */ /([`}])((?:\\[^]|(?!\$\{)[^`])*)(`|\$\{)?/g; // This comment is to fix high lighting: `

/* /$parsing/ */
const enum ParsingRegexIndex {
    comment = 1,
    quote,
    stringBody,
    closingQuote,
    templateStringQuote,
    curlyKet
}

/* /$templateString/ */
const enum TemplateStringRegexIndex {
    quote = 1,
    stringBody,
    closingQuote
}

const bracketConsumptionPair = {
    '}': '{',
    ']': '[',
    ')': '('
};

export function parse(source: string): StringTarget[] {
    let rangeBuilder = new RangeBuilder(source);
    
    let rootStringTargets: InterStringTarget[] = [];
    let nestedStringTargetStack: InterStringTarget[] = [];
    
    let currentStringTargets = rootStringTargets;
    let currentBracketStack: string[];
    
    let groups: RegExpExecArray;
    
    while (groups = parsingRegex.exec(source)) {
        let text = groups[0];
        
        if (groups[ParsingRegexIndex.comment]) {
            // Do nothing.
        } else if (groups[ParsingRegexIndex.quote]) {
            let quote = groups[ParsingRegexIndex.quote];
            let body = groups[ParsingRegexIndex.stringBody];
            let range = rangeBuilder.getRange(parsingRegex.lastIndex - text.length, parsingRegex.lastIndex);
            
            if (currentBracketStack && currentBracketStack.length) {
                pushNestedTargetStack();
            }
            
            currentStringTargets.push({
                body,
                range,
                opening: quote,
                closing: quote
            });
        } else if (
            groups[ParsingRegexIndex.templateStringQuote] || (
                nestedStringTargetStack.length &&
                currentBracketStack.indexOf('{') < 0 &&
                groups[ParsingRegexIndex.curlyKet]
            )
        ) {
            if (groups[ParsingRegexIndex.templateStringQuote]) {
                pushNestedTargetStack();
            } else {
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
            
            currentStringTargets.push({
                body,
                range,
                opening: openingQuote,
                closing: closingQuote
            });
            
            if (closingQuote === '${') {
                pushNestedTargetStack();
            } else {
                popNestedTargetStack();
            }
            
        } else if (currentBracketStack) {
            let bracket = groups[0];
            
            if (bracket in bracketConsumptionPair) {
                let bra = bracketConsumptionPair[bracket];
                if (currentBracketStack.length && bra === currentBracketStack[currentBracketStack.length - 1]) {
                    currentBracketStack.pop();
                } else {
                    // Otherwise there might be some syntax error, but we don't really care.
                    console.log(`Mismatched right bracket "${bracket}".`);
                }
            } else {
                currentBracketStack.push(bracket);
            }
        }
    }
    
    finalizeTargets(rootStringTargets);
    
    return rootStringTargets;
    
    function pushNestedTargetStack(): void {
        let target: InterStringGroupTarget = {
            partials: [],
            bracketStack: []
        };
        
        currentStringTargets.push(target);
        
        currentStringTargets = target.partials;
        currentBracketStack = target.bracketStack;
        nestedStringTargetStack.push(target);
    }
    
    function popNestedTargetStack(): void {
        nestedStringTargetStack.pop();
        let lastIndex = nestedStringTargetStack.length - 1;
        
        if (lastIndex < 0) {
            currentStringTargets = rootStringTargets;
            currentBracketStack = undefined;
        } else {
            let target = nestedStringTargetStack[lastIndex] as InterStringGroupTarget;
            currentStringTargets = target.partials;
            currentBracketStack = target.bracketStack;
        }
    }
    
    function finalizeTargets(targets: InterStringTarget[]) {
        for (let i = 0; i < targets.length; i++) {
            let target = targets[i] as InterStringGroupTarget;
            
            if (target.partials) {
                delete target.bracketStack;
                
                if (target.partials.length === 0) {
                    targets.splice(i--, 1);
                } else {
                    finalizeTargets(target.partials);
                }
            }
        }
    }
}