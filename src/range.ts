import { Position, Range } from 'vscode';

interface IndexRange {
    start: number;
    end: number;
}

export class RangeBuilder {
    private indexRanges: IndexRange[];
    
    constructor(source: string) {
        let regex = /(.*)(\r?\n|$)/g;
        
        let indexRanges: IndexRange[] = [];
        
        while (true) {
            let groups = regex.exec(source);
            let lineText = groups[1];
            let lineEnding = groups[2];
            
            let lastIndex = regex.lastIndex - lineEnding.length;
            
            indexRanges.push({
                start: lastIndex - lineText.length,
                end: lastIndex
            });
            
            if (!lineEnding.length) {
                break;
            }
        }
        
        this.indexRanges = indexRanges;
    }
    
    getPosition(index: number): Position {
        let indexRanges = this.indexRanges;
        
        for (let i = 0; i < indexRanges.length; i++) {
            let indexRange = indexRanges[i];
            if (indexRange.end > index) {
                if (indexRange.start <= index) {
                    // Within range.
                    return new Position(i + 1, index - indexRange.start + 1);
                } else {
                    // Line ending?
                    let previousIndexRange = indexRanges[i - 1];
                    return new Position(i, previousIndexRange.end - previousIndexRange.start + 1);
                }
            }
        }
    }
    
    getRange(startIndex: number, endIndex: number): Range {
        let start = this.getPosition(startIndex);
        let end = this.getPosition(endIndex);
        return new Range(start, end);
    }
}