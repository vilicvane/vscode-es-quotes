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

export const enum StringType {
    singleQuoted,
    doubleQuoted,
    template
}

const supportedLanguages = [
    'typescript',
    'javascript'
];

export function findActiveStringTarget(targets: StringTarget[], selection: Range): StringBodyTarget {
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

export function findActiveStringTargets(targets: StringTarget[], selection: Range): StringTarget[] {
    for (let target of targets) {
        let partials = (target as StringGroupTarget).partials;
        if (partials) {
            let foundTargets = findActiveStringTargets(partials, selection);
            if (foundTargets) {
                return foundTargets;
            }
        } else {
            if ((target as StringBodyTarget).range.contains(selection)) {
                return (target as StringBodyTarget).type === StringType.template ?
                    targets : [target];
            }
        }
    }
    
    return undefined;
}

export function findActiveStringTargetInEditor(editor: TextEditor): StringBodyTarget {
    let document = editor.document;
    let language = document.languageId;
    
    if (supportedLanguages.indexOf(language) < 0) {
        Window.showInformationMessage('Language not supported.');
        return;
    }
    
    let source = document.getText();
    let selection = editor.selection;
    
    let stringTargets = parse(source);
    let activeTarget = findActiveStringTarget(stringTargets, selection);
    
    if (!activeTarget) {
        Window.showInformationMessage('No string found at selected range.');
    }
    
    return activeTarget;
}

export function findActiveStringTargetsInEditor(editor: TextEditor): StringTarget[] {
    let document = editor.document;
    let language = document.languageId;
    
    if (supportedLanguages.indexOf(language) < 0) {
        Window.showInformationMessage('Language not supported.');
        return;
    }
    
    let source = document.getText();
    let selection = editor.selection;
    
    let stringTargets = parse(source);
    let activeTargets = findActiveStringTargets(stringTargets, selection);
    
    if (!activeTargets) {
        Window.showInformationMessage('No string found at selected range.');
    }
    
    return activeTargets;
}
