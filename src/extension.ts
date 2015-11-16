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
    
    Commands.registerTextEditorCommand('esQuotes.transformToTemplateString', (editor, edit) => {
        let result = findActiveStringTargetInEditor(editor);
        let activeTarget = result.target;
        
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
    
    Commands.registerTextEditorCommand('esQuotes.transformToNormalString', (editor, edit) => {
        let result = findActiveStringTargetsInEditor(editor);
        let activeTargets = result.targets;
        
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
            quote = result.defaultQuote;
        }
        
        let type = quote === '"' ? StringType.doubleQuoted : StringType.singleQuoted;
        
        interface EditInfo {
            range: Range;
            value: string;
        }
        
        let editInfos: EditInfo[] = [];
        let hasNonEmptyStringBody = false;
        
        for (let i = 0; i < activeTargets.length; i++) {
            let target = activeTargets[i];
            
            if (isStringBodyTarget(target)) {
                if (target.body && !hasNonEmptyStringBody) {
                    hasNonEmptyStringBody = true;
                }
                
                let value = target.body && transform(target.body, StringType.template, type);
                
                if (i > 0) {
                    value = value && ' + ' + value;
                    
                    let previousTarget = activeTargets[i - 1];
                    
                    if (isStringGroupTarget(previousTarget)) {
                        if (previousTarget.hasLowPriorityOperator) {
                            value = ')' + value;
                        }
                        
                        if (previousTarget.whitespacesRangeAtEnd && !previousTarget.whitespacesRangeAtEnd.isEmpty) {
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
                        
                        if (nextTarget.whitespacesRangeAtBeginning && !nextTarget.whitespacesRangeAtBeginning.isEmpty) {
                            target.range = new Range(target.range.start, nextTarget.whitespacesRangeAtBeginning.end);
                        }
                    }
                }
                
                editInfos.push({
                    range: target.range,
                    value
                });
            }
        }
        
        if (!hasNonEmptyStringBody) {
            let firstEditInfo = editInfos[0];
            
            let value = quote + quote;
            
            if (activeTargets.length > 1) {
                value += ' + ' + firstEditInfo.value
            }
            
            firstEditInfo.value = value;
        }
        
        editor
            .edit(edit => {
                for (let editInfo of editInfos) {
                    edit.replace(editInfo.range, editInfo.value);
                }
            })
            .then(undefined, reason => {
                console.error(reason);
                Window.showInformationMessage('Failed to transform selected template string.');
            });
    });
    
    Commands.registerTextEditorCommand('esQuotes.transformBetweenSingleDoubleQuotes', (editor, edit) => {
        let result = findActiveStringTargetInEditor(editor);
        let activeTarget = result.target;
        
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
