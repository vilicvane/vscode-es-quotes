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

import {
    StringType
} from './es-quotes';

import {
    transform
} from './transform';

import {
    RangeBuilder
} from './range';

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
        
        if (activeTarget.type === StringType.template) {
            Window.showInformationMessage('The string at selected range is already a template string.')
            return;
        }
        
        let value = transform(activeTarget.body, activeTarget.type, StringType.template);
        
        edit.replace(activeTarget.range, value);
    });
    
    Commands.registerTextEditorCommand('esQuotes.switchToNormalString', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (activeTarget.type !== StringType.template) {
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
                if (!/^["']$/.test(quote)) {
                    quote = "'";
                }
                
                let type = quote === '"' ? StringType.doubleQuoted : StringType.singleQuoted;
                
                let value = transform(activeTarget.body, StringType.template, type);
                
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
        
        if (activeTarget.type === StringType.template) {
            Window.showInformationMessage('The string at selected range is a template string.')
            return;
        }
        
        let type = activeTarget.type === StringType.doubleQuoted ? StringType.singleQuoted : StringType.doubleQuoted;
        
        let value = transform(activeTarget.body, activeTarget.type, type);
        
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
