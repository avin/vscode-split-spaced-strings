import * as vscode from 'vscode';
import { StringInfo } from './types';

const QUOTE_TOKENS = ['"""', "'''", '`', '"', "'"];

function getQuoteTokens(): string[] {
	return QUOTE_TOKENS;
}

function isEscaped(text: string, index: number): boolean {
	let backslashCount = 0;
	for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
		backslashCount++;
	}
	return backslashCount % 2 === 1;
}

function matchQuoteToken(text: string, index: number, tokens: string[]): string | null {
	for (const token of tokens) {
		if (text.startsWith(token, index)) {
			return token;
		}
	}
	return null;
}

export function findQuotePositionInLine(
	lineText: string,
	quote: string,
	expectedPos: number,
	direction: 'start' | 'end'
): number {
	const quoteLength = quote.length;
	const maxPos = lineText.length - quoteLength;

	const isValid = (pos: number): boolean => {
		if (pos < 0 || pos > maxPos) {
			return false;
		}
		if (!lineText.startsWith(quote, pos)) {
			return false;
		}
		if (quoteLength === 1 && isEscaped(lineText, pos)) {
			return false;
		}
		return true;
	};

	if (isValid(expectedPos)) {
		return expectedPos;
	}

	const limit = Math.max(expectedPos, lineText.length - expectedPos);
	for (let offset = 1; offset <= limit; offset++) {
		const left = expectedPos - offset;
		if (isValid(left)) {
			return left;
		}
		const right = expectedPos + offset;
		if (isValid(right)) {
			return right;
		}
	}

	if (direction === 'start') {
		for (let i = 0; i <= maxPos; i++) {
			if (isValid(i)) {
				return i;
			}
		}
	} else {
		for (let i = maxPos; i >= 0; i--) {
			if (isValid(i)) {
				return i;
			}
		}
	}

	return -1;
}

function findStringEnd(
	document: vscode.TextDocument,
	position: vscode.Position,
	quote: string
): vscode.Position | null {
	const quoteLength = quote.length;
	for (let lineNum = position.line; lineNum < document.lineCount; lineNum++) {
		const lineText = document.lineAt(lineNum).text;
		const startPos = lineNum === position.line ? position.character : 0;
		for (let i = startPos; i <= lineText.length - quoteLength; i++) {
			if (!lineText.startsWith(quote, i)) {
				continue;
			}
			if (quoteLength === 1 && isEscaped(lineText, i)) {
				continue;
			}
			return new vscode.Position(lineNum, i);
		}
	}

	return null;
}

export function findStringAtCursor(document: vscode.TextDocument, position: vscode.Position): StringInfo | null {
	const tokens = getQuoteTokens();
	let activeQuote: string | null = null;
	let start: vscode.Position | null = null;

	for (let lineNum = 0; lineNum <= position.line; lineNum++) {
		const lineText = document.lineAt(lineNum).text;
		const lineLimit = lineNum === position.line
			? Math.min(position.character, lineText.length)
			: lineText.length;
		let i = 0;

		while (i < lineLimit) {
			if (!activeQuote) {
				const token = matchQuoteToken(lineText, i, tokens);
				if (!token) {
					i++;
					continue;
				}
				if (token.length === 1 && isEscaped(lineText, i)) {
					i++;
					continue;
				}
				activeQuote = token;
				start = new vscode.Position(lineNum, i);
				i += token.length;
				continue;
			}

			if (lineText.startsWith(activeQuote, i)) {
				if (activeQuote.length === 1 && isEscaped(lineText, i)) {
					i++;
					continue;
				}
				i += activeQuote.length;
				activeQuote = null;
				start = null;
				continue;
			}

			i++;
		}
	}

	if (!activeQuote || !start) {
		return null;
	}

	if (position.line === start.line && position.character <= start.character) {
		return null;
	}

	const endPos = findStringEnd(document, position, activeQuote);
	if (!endPos) {
		return null;
	}

	const quoteLength = activeQuote.length;
	let content = '';
	for (let lineNum = start.line; lineNum <= endPos.line; lineNum++) {
		const lineText = document.lineAt(lineNum).text;
		if (lineNum === start.line && lineNum === endPos.line) {
			content = lineText.substring(start.character + quoteLength, endPos.character);
		} else if (lineNum === start.line) {
			content = lineText.substring(start.character + quoteLength) + '\n';
		} else if (lineNum === endPos.line) {
			content += lineText.substring(0, endPos.character);
		} else {
			content += lineText + '\n';
		}
	}

	return {
		start,
		end: new vscode.Position(endPos.line, endPos.character + quoteLength),
		quote: activeQuote,
		content,
		isMultiline: start.line !== endPos.line || content.includes('\n')
	};
}
