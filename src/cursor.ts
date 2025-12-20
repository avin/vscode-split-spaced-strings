import * as vscode from 'vscode';
import { StringInfo } from './types';

function getWordRanges(lineText: string): { start: number; end: number }[] {
	const ranges: { start: number; end: number }[] = [];
	let inWord = false;
	let start = 0;

	for (let i = 0; i <= lineText.length; i++) {
		const isWhitespace = i === lineText.length || /\s/.test(lineText[i]);
		if (!isWhitespace && !inWord) {
			start = i;
			inWord = true;
		}
		if (isWhitespace && inWord) {
			ranges.push({ start, end: i });
			inWord = false;
		}
	}

	return ranges;
}

export function getCursorWordPosition(
	stringInfo: StringInfo,
	cursorPosition: vscode.Position
): { wordIndex: number; charOffset: number } | null {
	const words = stringInfo.content.trim().split(/\s+/).filter(word => word.length > 0);

	if (!stringInfo.isMultiline) {
		const contentStart = stringInfo.start.character + stringInfo.quote.length;
		const cursorOffset = cursorPosition.character - contentStart;
		const content = stringInfo.content.trim();

		let currentPos = 0;
		const wordPositions: { start: number; end: number; index: number }[] = [];

		for (let i = 0; i < words.length; i++) {
			const wordIndex = content.indexOf(words[i], currentPos);
			if (wordIndex !== -1) {
				wordPositions.push({
					start: wordIndex,
					end: wordIndex + words[i].length,
					index: i
				});
				currentPos = wordIndex + words[i].length;
			}
		}

		for (const wp of wordPositions) {
			if (cursorOffset >= wp.start && cursorOffset <= wp.end) {
				return { wordIndex: wp.index, charOffset: cursorOffset - wp.start };
			}
		}

		for (let i = 0; i < wordPositions.length - 1; i++) {
			const currentWordEnd = wordPositions[i].end;
			const nextWordStart = wordPositions[i + 1].start;

			if (cursorOffset > currentWordEnd && cursorOffset < nextWordStart) {
				const distToCurrent = cursorOffset - currentWordEnd;
				const distToNext = nextWordStart - cursorOffset;

				if (distToCurrent <= distToNext) {
					return { wordIndex: wordPositions[i].index, charOffset: words[wordPositions[i].index].length };
				}
				return { wordIndex: wordPositions[i + 1].index, charOffset: 0 };
			}
		}

		if (wordPositions.length > 0 && cursorOffset < wordPositions[0].start) {
			return { wordIndex: 0, charOffset: 0 };
		}

		if (words.length > 0) {
			return { wordIndex: words.length - 1, charOffset: words[words.length - 1].length };
		}
	} else {
		const contentLines = stringInfo.content.split('\n');
		let wordCounter = 0;

		for (let lineOffset = 0; lineOffset <= stringInfo.end.line - stringInfo.start.line; lineOffset++) {
			const actualLine = stringInfo.start.line + lineOffset;
			if (actualLine === cursorPosition.line) {
				const lineText = contentLines[lineOffset] || '';
				const ranges = getWordRanges(lineText);
				if (ranges.length === 0) {
					return null;
				}

				const lineStartChar = actualLine === stringInfo.start.line
					? stringInfo.start.character + stringInfo.quote.length
					: 0;
				const cursorOffset = cursorPosition.character - lineStartChar;

				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					if (cursorOffset >= range.start && cursorOffset <= range.end) {
						return {
							wordIndex: wordCounter + i,
							charOffset: cursorOffset - range.start
						};
					}
				}

				if (cursorOffset < ranges[0].start) {
					return { wordIndex: wordCounter, charOffset: 0 };
				}

				const lastRange = ranges[ranges.length - 1];
				if (cursorOffset > lastRange.end) {
					return {
						wordIndex: wordCounter + ranges.length - 1,
						charOffset: lastRange.end - lastRange.start
					};
				}

				for (let i = 0; i < ranges.length - 1; i++) {
					const currentEnd = ranges[i].end;
					const nextStart = ranges[i + 1].start;
					if (cursorOffset > currentEnd && cursorOffset < nextStart) {
						const distToCurrent = cursorOffset - currentEnd;
						const distToNext = nextStart - cursorOffset;
						if (distToCurrent <= distToNext) {
							return {
								wordIndex: wordCounter + i,
								charOffset: ranges[i].end - ranges[i].start
							};
						}
						return { wordIndex: wordCounter + i + 1, charOffset: 0 };
					}
				}

				break;
			}

			const lineText = contentLines[lineOffset] || '';
			wordCounter += getWordRanges(lineText).length;
		}
	}

	return null;
}

export function calculateNewCursorPosition(
	stringInfo: StringInfo,
	newText: string,
	wordPosition: { wordIndex: number; charOffset: number } | null,
	wasMultiline: boolean
): vscode.Position {
	if (!wordPosition) {
		return stringInfo.start;
	}

	const words = stringInfo.content.trim().split(/\s+/).filter(word => word.length > 0);
	if (wordPosition.wordIndex >= words.length) {
		return stringInfo.start;
	}

	const targetWord = words[wordPosition.wordIndex];

	if (!wasMultiline) {
		const lines = newText.split('\n');
		const quoteToken = lines.length > 0 ? lines[0].trim() : '';
		let wordCounter = 0;
		for (let i = 0; i < lines.length; i++) {
			const trimmedLine = lines[i].trim();
			if (!trimmedLine || (quoteToken && trimmedLine === quoteToken)) {
				continue;
			}
			const ranges = getWordRanges(lines[i]);
			if (ranges.length === 0) {
				continue;
			}
			if (wordPosition.wordIndex < wordCounter + ranges.length) {
				const range = ranges[wordPosition.wordIndex - wordCounter];
				const line = stringInfo.start.line + i;
				const character = range.start + Math.min(wordPosition.charOffset, range.end - range.start);
				return new vscode.Position(line, character);
			}
			wordCounter += ranges.length;
		}
	} else {
		const contentStart = stringInfo.start.character + stringInfo.quote.length;
		let offset = 0;
		for (let i = 0; i < wordPosition.wordIndex; i++) {
			offset += words[i].length + 1;
		}
		offset += Math.min(wordPosition.charOffset, targetWord.length);

		return new vscode.Position(stringInfo.start.line, contentStart + offset);
	}

	return stringInfo.start;
}
