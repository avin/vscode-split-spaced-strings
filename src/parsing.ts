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

function findClosingQuoteInLine(lineText: string, startIndex: number, quote: string): number {
	if (quote.length === 1) {
		for (let i = startIndex; i < lineText.length; i++) {
			if (lineText[i] === quote && !isEscaped(lineText, i)) {
				return i;
			}
		}
		return -1;
	}

	return lineText.indexOf(quote, startIndex);
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

function findSingleLineStringAtCursor(document: vscode.TextDocument, position: vscode.Position): StringInfo | null {
	const line = document.lineAt(position.line);
	const lineText = line.text;
	const cursorOffset = position.character;
	const tokens = getQuoteTokens();

	let i = 0;
	while (i < lineText.length) {
		const token = matchQuoteToken(lineText, i, tokens);
		if (!token) {
			i++;
			continue;
		}

		if (token.length === 1 && isEscaped(lineText, i)) {
			i++;
			continue;
		}

		const end = findClosingQuoteInLine(lineText, i + token.length, token);
		if (end === -1) {
			i += token.length;
			continue;
		}

		const closingTokenEnd = end + token.length - 1;
		if (cursorOffset > i && cursorOffset <= closingTokenEnd) {
			const content = lineText.substring(i + token.length, end);
			return {
				start: new vscode.Position(position.line, i),
				end: new vscode.Position(position.line, end + token.length),
				quote: token,
				content,
				isMultiline: false
			};
		}

		i = end + token.length;
	}

	return null;
}

function findMultilineString(
	document: vscode.TextDocument,
	position: vscode.Position,
	preferredQuote?: string
): StringInfo | null {
	const quotes = preferredQuote ? [preferredQuote] : getQuoteTokens();

	for (const quote of quotes) {
		const quoteLength = quote.length;
		let startLine = position.line;
		let startChar = -1;
		let found = false;

		for (let lineNum = position.line; lineNum >= 0; lineNum--) {
			const lineText = document.lineAt(lineNum).text;
			const maxIndex = lineText.length - quoteLength;
			let iStart = maxIndex;
			if (lineNum === position.line) {
				iStart = Math.min(maxIndex, position.character - 1);
			}

			for (let i = iStart; i >= 0; i--) {
				if (!lineText.startsWith(quote, i)) {
					continue;
				}
				if (quoteLength === 1 && isEscaped(lineText, i)) {
					continue;
				}
				startLine = lineNum;
				startChar = i;
				found = true;
				break;
			}

			if (found) {
				break;
			}
		}

		if (!found || startChar === -1) {
			continue;
		}

		let endLine = position.line;
		let endChar = -1;
		found = false;

		for (let lineNum = startLine; lineNum < document.lineCount; lineNum++) {
			const lineText = document.lineAt(lineNum).text;
			const startPos = lineNum === startLine ? startChar + quoteLength : 0;

			for (let i = startPos; i <= lineText.length - quoteLength; i++) {
				if (!lineText.startsWith(quote, i)) {
					continue;
				}
				if (quoteLength === 1 && isEscaped(lineText, i)) {
					continue;
				}
				endLine = lineNum;
				endChar = i;
				found = true;
				break;
			}

			if (found) {
				break;
			}
		}

		if (!found || endChar === -1) {
			continue;
		}

		if (position.line < startLine || position.line > endLine) {
			continue;
		}
		if (position.line === startLine && position.character <= startChar) {
			continue;
		}
		if (position.line === endLine && position.character > endChar + quoteLength - 1) {
			continue;
		}

		let content = '';
		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const lineText = document.lineAt(lineNum).text;
			if (lineNum === startLine && lineNum === endLine) {
				content = lineText.substring(startChar + quoteLength, endChar);
			} else if (lineNum === startLine) {
				content = lineText.substring(startChar + quoteLength) + '\n';
			} else if (lineNum === endLine) {
				content += lineText.substring(0, endChar);
			} else {
				content += lineText + '\n';
			}
		}

		return {
			start: new vscode.Position(startLine, startChar),
			end: new vscode.Position(endLine, endChar + quoteLength),
			quote,
			content,
			isMultiline: startLine !== endLine || content.includes('\n')
		};
	}

	return null;
}

export function findStringAtCursor(document: vscode.TextDocument, position: vscode.Position): StringInfo | null {
	const singleLine = findSingleLineStringAtCursor(document, position);
	if (singleLine) {
		return singleLine;
	}

	return findMultilineString(document, position);
}
