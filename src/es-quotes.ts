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

export interface FindActiveStringTargetResult {
    defaultQuote: string;
    target: StringBodyTarget;
}

export function findActiveStringTargetInEditor(editor: TextEditor): FindActiveStringTargetResult {
    let document = editor.document;
    let language = document.languageId;
    
    if (supportedLanguages.indexOf(language) < 0) {
        Window.showInformationMessage('Language not supported.');
        return;
    }
    
    let source = document.getText();
    let selection = editor.selection;
    
    let result = parse(source);
    
    let stringTargets = result.stringTargets;
    let activeTarget = findActiveStringTarget(stringTargets, selection);
    
    if (!activeTarget) {
        Window.showInformationMessage('No string found at selected range.');
    }
    
    return {
        defaultQuote: result.defaultQuote,
        target: activeTarget
    };
}

export interface FindActiveStringTargetsResult {
    defaultQuote: string;
    targets: StringTarget[];
}

export function findActiveStringTargetsInEditor(editor: TextEditor): FindActiveStringTargetsResult {
    let document = editor.document;
    let language = document.languageId;
    
    if (supportedLanguages.indexOf(language) < 0) {
        Window.showInformationMessage('Language not supported.');
        return;
    }
    
    let source = document.getText();
    let selection = editor.selection;
    
    let result = parse(source);
    let stringTargets = result.stringTargets;
    let activeTargets = findActiveStringTargets(stringTargets, selection);
    
    if (!activeTargets) {
        Window.showInformationMessage('No string found at selected range.');
    }
    
    return {
        defaultQuote: result.defaultQuote,
        targets: activeTargets
    };
}
