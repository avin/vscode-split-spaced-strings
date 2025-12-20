// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface StringInfo {
	start: vscode.Position;
	end: vscode.Position;
	quote: string;
	content: string;
	isMultiline: boolean;
	originalQuote?: string; // Original quote type before conversion
}

interface TrackedString {
	uri: string;
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
	quote: string;
	content: string;
	// Hash to identify the string even after document changes
	contentHash: string;
	originalQuote?: string; // Original quote type before split
}

/**
 * Language-specific quote rules
 */
interface QuoteRules {
	// Quote types that support multiline strings natively
	multilineQuotes: string[];
	// Preferred quote for multiline conversion
	preferredMultilineQuote: string;
	// Function to check if content uses special multiline features
	hasSpecialFeatures: (content: string, quote: string) => boolean;
	// Whether multiline strings are allowed in regular quotes
	allowsMultilineInRegularQuotes: boolean;
}

/**
 * Get quote rules for a language
 */
function getQuoteRules(languageId: string): QuoteRules {
	switch (languageId) {
		case 'javascript':
		case 'typescript':
		case 'javascriptreact':
		case 'typescriptreact':
			return {
				multilineQuotes: ['`'],
				preferredMultilineQuote: '`',
				hasSpecialFeatures: (content: string, quote: string) => {
					// Template literals use ${...} for interpolation
					if (quote === '`') {
						return /\$\{[^}]*\}/.test(content);
					}
					return false;
				},
				allowsMultilineInRegularQuotes: false
			};
		
		case 'python':
			return {
				multilineQuotes: ['"""', "'''"],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string, quote: string) => {
					// f-strings use {...} for interpolation
					// Check if content has interpolation markers
					return /\{[^}]*\}/.test(content);
				},
				allowsMultilineInRegularQuotes: false
			};
		
		case 'csharp':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string, quote: string) => {
					// Interpolated strings use {...}
					return /\{[^}]*\}/.test(content);
				},
				allowsMultilineInRegularQuotes: false
			};
		
		case 'go':
			return {
				multilineQuotes: ['`'],
				preferredMultilineQuote: '`',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: false
			};
		
		case 'ruby':
			return {
				multilineQuotes: ['"', "'"], // Simplified
				preferredMultilineQuote: '"',
				hasSpecialFeatures: (content: string, quote: string) => {
					// Ruby interpolation uses #{...}
					return /#\{[^}]*\}/.test(content);
				},
				allowsMultilineInRegularQuotes: true
			};
		
		case 'java':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: false
			};

		case 'kotlin':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string, quote: string) => {
					// Kotlin interpolation
					return /\$\{[^}]*\}/.test(content);
				},
				allowsMultilineInRegularQuotes: false
			};
		
		case 'php':
			return {
				multilineQuotes: ['"'], // Simplified
				preferredMultilineQuote: '"',
				hasSpecialFeatures: (content: string, quote: string) => {
					// PHP variables in strings
					return /\$[a-zA-Z_]/.test(content);
				},
				allowsMultilineInRegularQuotes: true
			};
		
		default:
			// For unknown languages, be conservative
			return {
				multilineQuotes: [],
				preferredMultilineQuote: '"',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: true
			};
	}
}

const QUOTE_TOKENS = ['"""', "'''", '`', '"', "'"];

function getQuoteTokens(): string[] {
	return QUOTE_TOKENS;
}

function resolveLanguageId(document: vscode.TextDocument, stringInfo?: StringInfo): string {
	const languageId = document.languageId;
	if (languageId !== 'plaintext' || !stringInfo) {
		return languageId;
	}

	const lineText = document.lineAt(stringInfo.start.line).text;
	const beforeString = lineText.substring(0, stringInfo.start.character);
	if (/\b(val|var)\b/.test(beforeString)) {
		return 'kotlin';
	}

	return languageId;
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

function findQuotePositionInLine(
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

/**
 * Determine if we're in a JSX/TSX attribute context
 */
function isInJSXAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
	const languageId = document.languageId;
	if (languageId !== 'javascriptreact' && languageId !== 'typescriptreact') {
		return false;
	}
	
	const line = document.lineAt(position.line);
	const textBeforeCursor = line.text.substring(0, position.character);
	
	// Heuristic: inside a JSX tag and just after an attribute assignment
	const lastOpenBracket = textBeforeCursor.lastIndexOf('<');
	const lastCloseBracket = textBeforeCursor.lastIndexOf('>');
	
	if (lastOpenBracket <= lastCloseBracket) {
		return false;
	}

	const tagText = textBeforeCursor.substring(lastOpenBracket);
	return /=\s*$/.test(tagText);
}

/**
 * Get the appropriate quote type for multiline strings
 */
function getMultilineQuote(languageId: string, originalQuote: string, isJSXAttr: boolean): string {
	// JSX attributes can use regular quotes for multiline
	if (isJSXAttr) {
		return originalQuote;
	}
	
	const rules = getQuoteRules(languageId);
	
	// If language doesn't have special multiline quotes, keep original
	if (rules.multilineQuotes.length === 0 || rules.allowsMultilineInRegularQuotes) {
		return originalQuote;
	}
	
	// Use preferred multiline quote
	return rules.preferredMultilineQuote;
}

/**
 * Determine if we should restore original quotes when merging
 */
function shouldRestoreOriginalQuote(languageId: string, content: string, currentQuote: string, originalQuote: string | undefined): boolean {
	if (!originalQuote || originalQuote === currentQuote) {
		return false;
	}
	
	const rules = getQuoteRules(languageId);
	
	// Check if content uses special features of the current quote type
	if (rules.hasSpecialFeatures(content, currentQuote)) {
		return false; // Keep current quote because content uses its features
	}
	
	return true;
}

// Global tracking of split strings
const trackedStrings = new Map<string, TrackedString[]>();
let decorationType: vscode.TextEditorDecorationType;

/**
 * Find the string literal at the cursor position
 */
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

function findStringAtCursor(document: vscode.TextDocument, position: vscode.Position): StringInfo | null {
	const singleLine = findSingleLineStringAtCursor(document, position);
	if (singleLine) {
		return singleLine;
	}

	return findMultilineString(document, position);
}

/**
 * Find multiline string that spans multiple lines
 */
function findMultilineString(document: vscode.TextDocument, position: vscode.Position, preferredQuote?: string): StringInfo | null {
	const quotes = preferredQuote ? [preferredQuote] : getQuoteTokens();
	
	for (const quote of quotes) {
		const quoteLength = quote.length;
		// Search backwards to find opening quote
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

		// Search forwards to find closing quote
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

		// Check if cursor is within this string range
		if (position.line < startLine || position.line > endLine) {
			continue;
		}
		if (position.line === startLine && position.character <= startChar) {
			continue;
		}
		if (position.line === endLine && position.character > endChar + quoteLength - 1) {
			continue;
		}

		// Extract content
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

/**
 * Split a single-line string into multiple lines with one word per line
 */
function splitString(stringInfo: StringInfo, document: vscode.TextDocument): string {
	const words = stringInfo.content.trim().split(/\s+/);
	const lineText = document.lineAt(stringInfo.start.line).text;
	// Get only the whitespace indentation at the beginning of the line
	const lineIndent = lineText.substring(0, lineText.length - lineText.trimStart().length);
	const additionalIndent = '  ';
	
	// Determine if we're in JSX attribute
	const isJSXAttr = isInJSXAttribute(document, stringInfo.start);
	
	// Get appropriate quote for multiline
	const languageId = resolveLanguageId(document, stringInfo);
	const multilineQuote = getMultilineQuote(languageId, stringInfo.quote, isJSXAttr);
	
	// Store original quote if it's different from multiline quote
	if (multilineQuote !== stringInfo.quote) {
		stringInfo.originalQuote = stringInfo.quote;
	}
	
	let result = multilineQuote + '\n';
	words.forEach((word) => {
		result += lineIndent + additionalIndent + word + '\n';
	});
	result += lineIndent + multilineQuote;
	
	return result;
}

/**
 * Merge a multi-line string into a single line
 */
function mergeString(stringInfo: StringInfo, document: vscode.TextDocument): string {
	const content = stringInfo.content
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join(' ');
	
	// Determine final quote to use
	let finalQuote = stringInfo.quote;
	
	// Check if we should restore original quote
	const languageId = resolveLanguageId(document, stringInfo);
	if (shouldRestoreOriginalQuote(languageId, content, stringInfo.quote, stringInfo.originalQuote)) {
		finalQuote = stringInfo.originalQuote!;
	}
	
	return finalQuote + content + finalQuote;
}

/**
 * Find which word the cursor is in and the offset within that word
 */
function getCursorWordPosition(stringInfo: StringInfo, cursorPosition: vscode.Position): { wordIndex: number; charOffset: number } | null {
	const words = stringInfo.content.trim().split(/\s+/).filter(word => word.length > 0);
	
	// For single-line strings
	if (!stringInfo.isMultiline) {
		const contentStart = stringInfo.start.character + stringInfo.quote.length; // After opening quote
		const cursorOffset = cursorPosition.character - contentStart;
		const content = stringInfo.content.trim();
		
		// Build word positions in original content
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
		
		// Check if cursor is inside a word
		for (const wp of wordPositions) {
			if (cursorOffset >= wp.start && cursorOffset <= wp.end) {
				return { wordIndex: wp.index, charOffset: cursorOffset - wp.start };
			}
		}
		
		// Cursor is in a space - find nearest word boundary
		for (let i = 0; i < wordPositions.length - 1; i++) {
			const currentWordEnd = wordPositions[i].end;
			const nextWordStart = wordPositions[i + 1].start;
			
			if (cursorOffset > currentWordEnd && cursorOffset < nextWordStart) {
				// Cursor is between words - snap to nearest boundary
				const distToCurrent = cursorOffset - currentWordEnd;
				const distToNext = nextWordStart - cursorOffset;
				
				if (distToCurrent <= distToNext) {
					// Closer to current word end
					return { wordIndex: wordPositions[i].index, charOffset: words[wordPositions[i].index].length };
				} else {
					// Closer to next word start
					return { wordIndex: wordPositions[i + 1].index, charOffset: 0 };
				}
			}
		}
		
		// If cursor is before first word
		if (wordPositions.length > 0 && cursorOffset < wordPositions[0].start) {
			return { wordIndex: 0, charOffset: 0 };
		}
		
		// If cursor is after all words, return last word end
		if (words.length > 0) {
			return { wordIndex: words.length - 1, charOffset: words[words.length - 1].length };
		}
	} else {
		// For multi-line strings, find which line the cursor is on
		// We need to check the actual document lines, not the content lines
		const contentLines = stringInfo.content.split('\n');
		let wordCounter = 0;

		for (let lineOffset = 0; lineOffset <= stringInfo.end.line - stringInfo.start.line; lineOffset++) {
			const actualLine = stringInfo.start.line + lineOffset;
			if (actualLine === cursorPosition.line) {
				// Get the actual line text from the document
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

/**
 * Calculate new cursor position after transformation
 */
function calculateNewCursorPosition(
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
	
	// If converting to multiline
	if (!wasMultiline) {
		// Find the line with the target word by index to handle duplicates
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
		// Converting to single line
		// Calculate position in merged string
		const contentStart = stringInfo.start.character + stringInfo.quote.length; // After opening quote
		let offset = 0;
		for (let i = 0; i < wordPosition.wordIndex; i++) {
			offset += words[i].length + 1; // word + space
		}
		offset += Math.min(wordPosition.charOffset, targetWord.length);
		
		return new vscode.Position(stringInfo.start.line, contentStart + offset);
	}
	
	return stringInfo.start;
}

/**
 * Add a string to the tracked strings list
 */
function trackString(document: vscode.TextDocument, stringInfo: StringInfo) {
	const uri = document.uri.toString();
	if (!trackedStrings.has(uri)) {
		trackedStrings.set(uri, []);
	}
	
	const tracked = trackedStrings.get(uri)!;
	
	// Remove any EXACT match (same start/end line) - this prevents duplicates
	// Don't remove non-overlapping strings - they are independent split strings
	const filtered = tracked.filter(t => 
		!(t.startLine === stringInfo.start.line &&
			t.endLine === stringInfo.end.line &&
			t.startChar === stringInfo.start.character &&
			t.endChar === stringInfo.end.character - stringInfo.quote.length)
	);
	
	// Create a simple hash from the content for tracking
	const contentHash = stringInfo.content.trim().replace(/\s+/g, ' ');
	
	// Add the new tracked string
	filtered.push({
		uri,
		startLine: stringInfo.start.line,
		startChar: stringInfo.start.character,
		endLine: stringInfo.end.line,
		endChar: stringInfo.end.character - stringInfo.quote.length,
		quote: stringInfo.quote,
		content: stringInfo.content,
		contentHash,
		originalQuote: stringInfo.originalQuote
	});
	
	trackedStrings.set(uri, filtered);
}

/**
 * Remove a string from tracking
 */
function untrackString(document: vscode.TextDocument, stringInfo: StringInfo) {
	const uri = document.uri.toString();
	const tracked = trackedStrings.get(uri);
	if (!tracked) {
		return;
	}
	
	// Remove the string at this position
	const filtered = tracked.filter(t => 
		t.startLine !== stringInfo.start.line ||
		t.endLine !== stringInfo.end.line ||
		t.startChar !== stringInfo.start.character ||
		t.endChar !== stringInfo.end.character - stringInfo.quote.length
	);
	
	if (filtered.length === 0) {
		trackedStrings.delete(uri);
	} else {
		trackedStrings.set(uri, filtered);
	}
}

/**
 * Update decorations for tracked strings
 */
function updateDecorations(editor: vscode.TextEditor) {
	if (!decorationType) {
		return;
	}
	
	// Find actual multiline strings in the document that match tracked ones
	const strings = findTrackedStringsInDocument(editor.document);
	
	const decorations: vscode.DecorationOptions[] = strings.map(s => ({
		range: new vscode.Range(s.start.line, 0, s.end.line, Number.MAX_VALUE),
		hoverMessage: 'This string will be collapsed to single line on save (if auto-collapse is enabled)'
	}));
	
	editor.setDecorations(decorationType, decorations);
}

/**
 * Find all multiline strings in document that match tracked strings
 */
function findTrackedStringsInDocument(document: vscode.TextDocument): StringInfo[] {
	const uri = document.uri.toString();
	const tracked = trackedStrings.get(uri);
	if (!tracked || tracked.length === 0) {
		return [];
	}
	
	const result: StringInfo[] = [];
	
	// For each tracked string, find it in the document by position and hash
	for (const t of tracked) {
		// Validate position is still valid
		if (t.startLine >= document.lineCount || t.endLine >= document.lineCount) {
			continue;
		}
		
		try {
			const startLineText = document.lineAt(t.startLine).text;
			const endLineText = document.lineAt(t.endLine).text;

			const startQuotePos = findQuotePositionInLine(startLineText, t.quote, t.startChar, 'start');
			const endQuotePos = findQuotePositionInLine(endLineText, t.quote, t.endChar, 'end');
			
			if (startQuotePos === -1 || endQuotePos === -1) {
				continue;
			}
			
			const quoteLength = t.quote.length;

			// Extract current content
			let content = '';
			for (let lineNum = t.startLine; lineNum <= t.endLine; lineNum++) {
				const lineText = document.lineAt(lineNum).text;
				if (lineNum === t.startLine && lineNum === t.endLine) {
					content = lineText.substring(startQuotePos + quoteLength, endQuotePos);
				} else if (lineNum === t.startLine) {
					content = lineText.substring(startQuotePos + quoteLength) + '\n';
				} else if (lineNum === t.endLine) {
					content += lineText.substring(0, endQuotePos);
				} else {
					content += lineText + '\n';
				}
			}
			
			// Verify it's still multiline and matches tracked hash
			const currentHash = content.trim().replace(/\s+/g, ' ');
			if ((t.startLine !== t.endLine || content.includes('\n')) && 
			    currentHash === t.contentHash) {
				result.push({
					start: new vscode.Position(t.startLine, startQuotePos),
					end: new vscode.Position(t.endLine, endQuotePos + quoteLength),
					quote: t.quote,
					content,
					isMultiline: true,
					originalQuote: t.originalQuote
				});
			}
		} catch (e) {
			// Skip invalid positions
			continue;
		}
	}
	
	return result;
}

/**
 * Collapse all tracked strings in document
 */
function collapseTrackedStrings(document: vscode.TextDocument): vscode.TextEdit[] {
	const strings = findTrackedStringsInDocument(document);
	const edits: vscode.TextEdit[] = [];
	
	// Process from bottom to top to avoid position shifts
	strings.sort((a, b) => b.start.line - a.start.line);
	
	for (const stringInfo of strings) {
		const newText = mergeString(stringInfo, document);
		const range = new vscode.Range(stringInfo.start, stringInfo.end);
		edits.push(vscode.TextEdit.replace(range, newText));
	}
	
	return edits;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "split-spaced-strings" is now active!');

	// Create decoration type for tracked strings
	decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255, 200, 0, 0.1)',
		border: '1px solid rgba(255, 200, 0, 0.3)',
		isWholeLine: true,
		overviewRulerColor: 'rgba(255, 200, 0, 0.5)',
		overviewRulerLane: vscode.OverviewRulerLane.Right
	});

	// Register the toggle command
	const disposable = vscode.commands.registerCommand('split-spaced-strings.toggleSplit', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const document = editor.document;
		const position = editor.selection.active;

		// Find the string at cursor position
		const stringInfo = findStringAtCursor(document, position);
		if (!stringInfo) {
			vscode.window.showInformationMessage('Cursor is not inside a string literal');
			return;
		}

		// If string is multiline and we're merging, try to get originalQuote from tracking
		if (stringInfo.isMultiline) {
			const uri = document.uri.toString();
			const tracked = trackedStrings.get(uri);
			if (tracked) {
				// Find matching tracked string
				const endChar = stringInfo.end.character - stringInfo.quote.length;
				for (const t of tracked) {
					if (t.startLine === stringInfo.start.line &&
						t.endLine === stringInfo.end.line &&
						t.startChar === stringInfo.start.character &&
						t.endChar === endChar) {
						stringInfo.originalQuote = t.originalQuote;
						break;
					}
				}
			}
		}

		// Save cursor position relative to word
		const wordPosition = getCursorWordPosition(stringInfo, position);
		const wasMultiline = stringInfo.isMultiline;

		// Determine if we should split or merge
		const newText = stringInfo.isMultiline 
			? mergeString(stringInfo, document) 
			: splitString(stringInfo, document);

		// Replace the string
		const editSuccess = await editor.edit(editBuilder => {
			const range = new vscode.Range(stringInfo.start, stringInfo.end);
			editBuilder.replace(range, newText);
		});

		// Update tracking after edit is applied
		if (editSuccess) {
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);
			
			// ALWAYS track split strings to preserve originalQuote for manual merge
			if (wasMultiline) {
				// Was multiline, now single line - untrack it
				untrackString(document, stringInfo);
			} else {
				// Was single line, now multiline - track it
				// The document is now updated, find the string at the start position
				const searchPosition = new vscode.Position(
					stringInfo.start.line,
					stringInfo.start.character + stringInfo.quote.length
				);
				const newStringInfo = findStringAtCursor(document, searchPosition);
				if (newStringInfo && newStringInfo.isMultiline) {
					// Set originalQuote on the new string info
					newStringInfo.originalQuote = stringInfo.originalQuote || stringInfo.quote;
					trackString(document, newStringInfo);
				}
			}

			// Update decorations only if auto-collapse is enabled
			if (autoCollapse) {
				updateDecorations(editor);
			}
		}

		// Restore cursor position
		const newCursorPosition = calculateNewCursorPosition(stringInfo, newText, wordPosition, wasMultiline);
		editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
	});

	// Register save handler
	const saveDisposable = vscode.workspace.onWillSaveTextDocument(event => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);
		
		if (!autoCollapse) {
			return;
		}

		const edits = collapseTrackedStrings(event.document);
		
		if (edits.length > 0) {
			event.waitUntil(Promise.resolve(edits));
			
			// Clear tracking for this document after collapse
			trackedStrings.delete(event.document.uri.toString());
		}
	});

	// Register document close handler to clean up tracking
	const closeDisposable = vscode.workspace.onDidCloseTextDocument(document => {
		trackedStrings.delete(document.uri.toString());
	});

	// Register active editor change handler to update decorations
	const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);
		
		if (editor && autoCollapse) {
			updateDecorations(editor);
		}
	});

	// Register text document change handler to update tracking
	const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);
		
		if (!autoCollapse) {
			return; // Skip tracking updates if feature is disabled
		}
		
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document === event.document) {
			const uri = event.document.uri.toString();
			const tracked = trackedStrings.get(uri);
			
			if (tracked && tracked.length > 0) {
				// Update positions and content hashes based on text changes
				for (const change of event.contentChanges) {
					const lineDelta = change.text.split('\n').length - 1 - (change.range.end.line - change.range.start.line);
					const isSingleLineChange = change.range.start.line === change.range.end.line &&
						change.text.indexOf('\n') === -1;
					const charDelta = isSingleLineChange
						? change.text.length - (change.range.end.character - change.range.start.character)
						: 0;
					
					// Update all tracked strings based on where the change occurred
					for (const t of tracked) {
						// For changes on the end line, we need to check if they're inside the string
						// by comparing character positions with the closing quote position
						let isChangeAfterString = false;
						if (change.range.start.line === t.endLine && change.range.end.line === t.endLine) {
							// Find the closing quote position on this line
							try {
								const endLineText = event.document.lineAt(t.endLine).text;
								const endQuotePos = findQuotePositionInLine(endLineText, t.quote, t.endChar, 'end');
								
								// If change starts after the closing quote, it's outside the string
								if (endQuotePos !== -1 &&
									change.range.start.character > endQuotePos + t.quote.length - 1) {
									isChangeAfterString = true;
								}
							} catch (e) {
								// Ignore errors, treat as inside string
							}
						}
						
						// Change is completely before the tracked string - shift both boundaries
						if (change.range.end.line < t.startLine) {
							t.startLine += lineDelta;
							t.endLine += lineDelta;
						}
						// Change is after the string on the same end line - don't affect the string
						else if (isChangeAfterString) {
							// Do nothing - change is after the closing quote
						}
						// Change starts before or at start, and ends before or at end (overlaps or inside)
						else if (change.range.start.line <= t.endLine && change.range.end.line >= t.startLine) {
							// Change affects the tracked string - update end boundary
							// This handles: Enter inside string, edits at boundaries, etc.
							if (change.range.start.line >= t.startLine) {
								// Change is inside or at the end of tracked string
								t.endLine += lineDelta;
							} else {
								// Change starts before and extends into tracked string
								t.startLine += lineDelta;
								t.endLine += lineDelta;
							}
						}

						if (isSingleLineChange && !isChangeAfterString) {
							if (change.range.start.line === t.startLine &&
								change.range.end.character <= t.startChar) {
								t.startChar += charDelta;
								if (t.startLine === t.endLine) {
									t.endChar += charDelta;
								}
							}

							if (change.range.start.line === t.endLine &&
								change.range.start.character <= t.endChar) {
								t.endChar += charDelta;
							}
						}
					}
				}
				
				// Now update content hashes for all tracked strings
				for (const t of tracked) {
					if (t.startLine >= event.document.lineCount || t.endLine >= event.document.lineCount) {
						continue;
					}
					
					// Re-read the actual content from document
					try {
						// Find the opening quote on the start line
						const startLineText = event.document.lineAt(t.startLine).text;
						const startQuotePos = findQuotePositionInLine(startLineText, t.quote, t.startChar, 'start');
						
						if (startQuotePos === -1) {
							continue;
						}
						
						// Find the closing quote on the end line
						const endLineText = event.document.lineAt(t.endLine).text;
						const endQuotePos = findQuotePositionInLine(endLineText, t.quote, t.endChar, 'end');
						
						if (endQuotePos === -1) {
							continue;
						}
						
						const quoteLength = t.quote.length;

						// Extract the content between quotes
						let content = '';
						for (let lineNum = t.startLine; lineNum <= t.endLine; lineNum++) {
							const lineText = event.document.lineAt(lineNum).text;
							if (lineNum === t.startLine && lineNum === t.endLine) {
								content = lineText.substring(startQuotePos + quoteLength, endQuotePos);
							} else if (lineNum === t.startLine) {
								content = lineText.substring(startQuotePos + quoteLength) + '\n';
							} else if (lineNum === t.endLine) {
								content += lineText.substring(0, endQuotePos);
							} else {
								content += lineText + '\n';
							}
						}
						
						// Update the hash with actual current content
						t.startChar = startQuotePos;
						t.endChar = endQuotePos;
						t.content = content;
						t.contentHash = content.trim().replace(/\s+/g, ' ');
					} catch (e) {
						// Line might be out of bounds, will be filtered out later
						console.log('[Split Spaced Strings] Error updating tracked string:', e);
					}
				}
			}
			
			// Update decorations after a short delay to allow for multi-cursor edits
			setTimeout(() => {
				updateDecorations(editor);
			}, 100);
		}
	});

	// Update decorations for current editor
	const config = vscode.workspace.getConfiguration('splitSpacedStrings');
	const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);
	if (vscode.window.activeTextEditor && autoCollapse) {
		updateDecorations(vscode.window.activeTextEditor);
	}

	context.subscriptions.push(
		disposable,
		saveDisposable,
		closeDisposable,
		editorChangeDisposable,
		documentChangeDisposable,
		decorationType
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	trackedStrings.clear();
}

export const __test__ = {
	collapseTrackedStrings
};
