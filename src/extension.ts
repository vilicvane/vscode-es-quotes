import * as FS from 'fs';
import * as Path from 'path';

import {
    window as Window,
    commands as Commands,
    workspace as Workspace,
    Range,
    TextEditor
} from 'vscode';

import {
    parse,
    StringTarget,
    StringBodyTarget,
    StringGroupTarget,
    isStringGroupTarget,
    isStringBodyTarget
} from './parser';

import {
    StringType,
    findActiveStringTargetInEditor,
    findActiveStringTargetsInEditor
} from './es-quotes';

import {
    transform
} from './transform';

import {
    RangeBuilder
} from './range';

const CONFIG_DEFAULT_QUOTE = 'esQuotes.defaultQuote';

export function activate() {
    let config = Workspace.getConfiguration();
    
    Commands.registerTextEditorCommand('esQuotes.switchToTemplateString', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (activeTarget.type === StringType.template) {
            Window.showInformationMessage('The string at selected range is already a template string.');
            return;
        }
        
        let value = transform(activeTarget.body, activeTarget.type, StringType.template);
        
        edit.replace(activeTarget.range, value);
    });
    
    Commands.registerTextEditorCommand('esQuotes.switchToNormalString', (editor, edit) => {
        let activeTargets = findActiveStringTargetsInEditor(editor);
        
        if (!activeTargets) {
            return;
        }
        
        let firstTarget = activeTargets[0];
        
        if (isStringBodyTarget(firstTarget) && firstTarget.type !== StringType.template) {
            Window.showInformationMessage('The string at selected range is already a normal string.')
            return;
        }
        
        let quote = config.get<string>(CONFIG_DEFAULT_QUOTE);
        
        if (!/^["']$/.test(quote)) {
            quote = "'";
        }
        
        let type = quote === '"' ? StringType.doubleQuoted : StringType.singleQuoted;
        
        for (let i = 0; i < activeTargets.length; i++) {
            let target = activeTargets[i];
            
            if (isStringBodyTarget(target)) {
                let value = target.body && transform(target.body, StringType.template, type);
                
                if (i > 0) {
                    value = value && ' + ' + value;
                    
                    let previousTarget = activeTargets[i - 1];
                    
                    if (isStringGroupTarget(previousTarget)) {
                        if (previousTarget.hasLowPriorityOperator) {
                            value = ')' + value;
                        }
                        
                        if (!previousTarget.whitespacesRangeAtEnd.isEmpty) {
                            target.range = new Range(previousTarget.whitespacesRangeAtEnd.start, target.range.end);
                        }
                    }
                }
                
                if (i < activeTargets.length - 1) {
                    value = value && value + ' + ';
                    
                    let nextTarget = activeTargets[i + 1];
                    
                    if (isStringGroupTarget(nextTarget)) {
                        if (nextTarget.hasLowPriorityOperator) {
                            value += '(';
                        }
                        
                        if (!nextTarget.whitespacesRangeAtBeginning.isEmpty) {
                            target.range = new Range(target.range.start, nextTarget.whitespacesRangeAtBeginning.end);
                        }
                    }
                }
                
                edit.replace(target.range, value);
            }
        }
    });
    
    Commands.registerTextEditorCommand('esQuotes.switchBetweenSingleDoubleQuotes', (editor, edit) => {
        let activeTarget = findActiveStringTargetInEditor(editor);
        
        if (!activeTarget) {
            return;
        }
        
        if (activeTarget.type === StringType.template) {
            Window.showInformationMessage('The string at selected range is a template string.');
            return;
        }
        
        let type = activeTarget.type === StringType.doubleQuoted ? StringType.singleQuoted : StringType.doubleQuoted;
        
        let value = transform(activeTarget.body, activeTarget.type, type);
        
        edit.replace(activeTarget.range, value);
    });
}
