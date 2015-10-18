import * as FS from 'fs';
import * as Path from 'path';

import {
    window as Window,
    commands as Commands,
    extensions as Extensions,
    Range,
    TextEditor
} from 'vscode';

import {
    parse,
    StringTarget,
    StringBodyTarget,
    StringGroupTarget
} from './parser';

import { RangeBuilder } from './range';

const DEFAULT_QUOTE = 'defaultQuote';

const supportedLanguages = [
    'typescript',
    'javascript'
];

export function activate() {
    let configMemento = Extensions.getConfigurationMemento('esQuotes');
    let normalQuoteRegex = /^["']$/;
    
    Commands.registerTextEditorCommand('esQuotes.switchToTemplateString', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (!normalQuoteRegex.test(activeTarget.opening)) {
            Window.showInformationMessage('The string at selected range is already a template string.')
            return;
        }
        
        let value = buildStringLiteral(activeTarget.body, activeTarget.opening, '`');
        
        edit.replace(activeTarget.range, value);
    });
    
    Commands.registerTextEditorCommand('esQuotes.switchToNormalString', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (normalQuoteRegex.test(activeTarget.opening)) {
            Window.showInformationMessage('The string at selected range is already a normal string.')
            return;
        }
        
        if (activeTarget.opening !== '`' || activeTarget.closing !== '`') {
            Window.showInformationMessage('Not supported yet.')
            return;
        }
        
        configMemento
            .getValue<string>(DEFAULT_QUOTE)
            .then(quote => {
                if (!normalQuoteRegex.test(quote)) {
                    quote = '\'';
                }
                
                let value = buildStringLiteral(activeTarget.body, '`', quote);
                
                return editor.edit(edit => {
                    edit.replace(activeTarget.range, value);
                });
            });
    });
    
    Commands.registerTextEditorCommand('esQuotes.switchBetweenSingleDoubleQuotes', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (!normalQuoteRegex.test(activeTarget.opening)) {
            Window.showInformationMessage('The string at selected range is a template string.')
            return;
        }
        
        let originalQuote = activeTarget.opening;
        let quote = originalQuote === '"' ? '\'' : '"';
        
        let value = buildStringLiteral(activeTarget.body, originalQuote, quote);
        
        edit.replace(activeTarget.range, value);
    });
}

function findActiveStringTargetInEditor(editor: TextEditor): StringBodyTarget {
    let document = editor.getTextDocument();
    let language = document.getLanguageId();
    
    if (supportedLanguages.indexOf(language) < 0) {
        Window.showInformationMessage('Language not supported.');
        return;
    }
    
    let source = document.getText();
    let selection = editor.getSelection();
    
    let stringTargets = parse(source);
    let activeTarget = findActiveStringTarget(stringTargets, selection);
    
    if (!activeTarget) {
        Window.showInformationMessage('No string found at selected range.');
    }
    
    return activeTarget;
}

function findActiveStringTarget(targets: StringTarget[], selection: Range): StringBodyTarget {
    for (let target of targets) {
        let partials = (target as StringGroupTarget).partials;
        if (partials) {
            let foundTarget = findActiveStringTarget(partials, selection);
            if (foundTarget) {
                return foundTarget;
            }
        } else {
            if ((target as StringBodyTarget).range.contains(selection)) {
                return target as StringBodyTarget;
            }
        }
    }
    
    return undefined;
}

function buildStringLiteral(body: string, originalQuote: string, quote: string): string {
    if (originalQuote === quote) {
        return quote + body + quote;
    }
    
    let regex = /((\\n)?\\)?(\r?\n)|(\\\$\\?\{|\$\\\{)|\\(\r\n|[^])|([\'"`]|\$\{)/g;
    let normalQuoteRegex = /^["']$/;
    
    body = body.replace(regex, (
        text: string,
        multilineEnd: string,
        newLineLiteral: string,
        endOfLine: string,
        templateEscaped: string,
        escaped: string,
        containedQuote: string
    ) => {
        if (escaped) {
            if (escaped === originalQuote) {
                // No longer need escaping.
                return escaped;
            } else {
                return text;
            }
        } else if (templateEscaped) {
            if (normalQuoteRegex.test(quote)) {
                return '${';
            } else {
                return text;
            }
        } else if (containedQuote) {
            if (normalQuoteRegex.test(containedQuote)) {
                if (containedQuote !== quote) {
                    return containedQuote;
                } else {
                    return '\\' + containedQuote;
                }
            } else if (normalQuoteRegex.test(quote)) {
                // Contained quote is ` or ${, can be savely put into " and ' string.
                return containedQuote;
            } else {
                return '\\' + containedQuote;
            }
        } else {
            if (normalQuoteRegex.test(quote)) {
                if (normalQuoteRegex.test(originalQuote)) {
                    // Switch between single and double quotes.
                    return text;
                } else if (multilineEnd) {
                    // Template string to normal string.
                    return text;
                } else {
                    return '\\n\\' + endOfLine;
                }
            } else if (normalQuoteRegex.test(originalQuote)) {
                // Normal string to template string.
                if (multilineEnd) {
                    if (newLineLiteral) {
                        return endOfLine;
                    } else {
                        return text;
                    }
                } else {
                    // Shouldn't hit.
                    return text;
                }
            } else {
                // Shouldn't hit.
                return text;
            }
        }
    });
    
    return quote + body + quote;
}
