// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface StringInfo {
	start: vscode.Position;
	end: vscode.Position;
	quote: string;
	content: string;
	isMultiline: boolean;
}

/**
 * Find the string literal at the cursor position
 */
function findStringAtCursor(document: vscode.TextDocument, position: vscode.Position): StringInfo | null {
	const line = document.lineAt(position.line);
	const lineText = line.text;
	const cursorOffset = position.character;

	// Try to find string on current line first
	const quotes = ['"', "'", '`'];
	
	for (const quote of quotes) {
		let inString = false;
		let stringStart = -1;
		let escapeNext = false;

		for (let i = 0; i < lineText.length; i++) {
			if (escapeNext) {
				escapeNext = false;
				continue;
			}

			if (lineText[i] === '\\') {
				escapeNext = true;
				continue;
			}

			if (lineText[i] === quote) {
				if (!inString) {
					stringStart = i;
					inString = true;
				} else {
					// Found closing quote
					if (cursorOffset > stringStart && cursorOffset <= i) {
						// Cursor is inside this string
						const content = lineText.substring(stringStart + 1, i);
						return {
							start: new vscode.Position(position.line, stringStart),
							end: new vscode.Position(position.line, i + 1),
							quote,
							content,
							isMultiline: false // Single line string on same line
						};
					}
					inString = false;
					stringStart = -1;
				}
			}
		}

		// If we're still in a string (unclosed on this line), check if it's a multiline string
		if (inString && cursorOffset > stringStart) {
			// For template literals, check for multiline strings
			if (quote === '`') {
				return findMultilineString(document, position, quote);
			}
		}
	}

	// Try to find if cursor is in a multiline string
	return findMultilineString(document, position);
}

/**
 * Find multiline string that spans multiple lines
 */
function findMultilineString(document: vscode.TextDocument, position: vscode.Position, preferredQuote?: string): StringInfo | null {
	const quotes = preferredQuote ? [preferredQuote] : ['`', '"', "'"];
	
	for (const quote of quotes) {
		// Search backwards to find opening quote
		let startLine = position.line;
		let startChar = -1;
		let found = false;

		for (let lineNum = position.line; lineNum >= 0; lineNum--) {
			const lineText = document.lineAt(lineNum).text;
			let escapeNext = false;

			for (let i = lineText.length - 1; i >= 0; i--) {
				// Skip if this is the line after cursor position
				if (lineNum === position.line && i >= position.character) {
					continue;
				}

				if (escapeNext) {
					escapeNext = false;
					continue;
				}

				if (lineText[i] === '\\' && i > 0) {
					escapeNext = true;
					continue;
				}

				if (lineText[i] === quote) {
					startLine = lineNum;
					startChar = i;
					found = true;
					break;
				}
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
			let escapeNext = false;
			const startPos = lineNum === startLine ? startChar + 1 : 0;

			for (let i = startPos; i < lineText.length; i++) {
				if (escapeNext) {
					escapeNext = false;
					continue;
				}

				if (lineText[i] === '\\') {
					escapeNext = true;
					continue;
				}

				if (lineText[i] === quote) {
					endLine = lineNum;
					endChar = i;
					found = true;
					break;
				}
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
		if (position.line === endLine && position.character > endChar) {
			continue;
		}

		// Extract content
		let content = '';
		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const lineText = document.lineAt(lineNum).text;
			if (lineNum === startLine && lineNum === endLine) {
				content = lineText.substring(startChar + 1, endChar);
			} else if (lineNum === startLine) {
				content = lineText.substring(startChar + 1) + '\n';
			} else if (lineNum === endLine) {
				content += lineText.substring(0, endChar);
			} else {
				content += lineText + '\n';
			}
		}

		return {
			start: new vscode.Position(startLine, startChar),
			end: new vscode.Position(endLine, endChar + 1),
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
	
	let result = stringInfo.quote + '\n';
	words.forEach((word) => {
		result += lineIndent + additionalIndent + word + '\n';
	});
	result += lineIndent + stringInfo.quote;
	
	return result;
}

/**
 * Merge a multi-line string into a single line
 */
function mergeString(stringInfo: StringInfo): string {
	const content = stringInfo.content
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join(' ');
	
	return stringInfo.quote + content + stringInfo.quote;
}

/**
 * Find which word the cursor is in and the offset within that word
 */
function getCursorWordPosition(stringInfo: StringInfo, cursorPosition: vscode.Position): { wordIndex: number; charOffset: number } | null {
	const words = stringInfo.content.trim().split(/\s+/);
	
	// For single-line strings
	if (!stringInfo.isMultiline) {
		const contentStart = stringInfo.start.character + 1; // After opening quote
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
		for (let lineOffset = 0; lineOffset <= stringInfo.end.line - stringInfo.start.line; lineOffset++) {
			const actualLine = stringInfo.start.line + lineOffset;
			if (actualLine === cursorPosition.line) {
				// Get the actual line text from the document
				const lineText = stringInfo.content.split('\n')[lineOffset] || '';
				const trimmedLine = lineText.trim();
				
				if (trimmedLine.length > 0) {
					// Find which word this is
					const wordIndex = words.indexOf(trimmedLine);
					if (wordIndex !== -1) {
						// Calculate cursor offset within the trimmed word
						const trimStart = lineText.length - lineText.trimStart().length;
						const charOffset = Math.max(0, Math.min(cursorPosition.character - trimStart, trimmedLine.length));
						return { wordIndex, charOffset };
					}
				}
				break;
			}
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
	
	const words = stringInfo.content.trim().split(/\s+/);
	if (wordPosition.wordIndex >= words.length) {
		return stringInfo.start;
	}
	
	const targetWord = words[wordPosition.wordIndex];
	
	// If converting to multiline
	if (!wasMultiline) {
		// Find the line with the target word
		const lines = newText.split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === targetWord) {
				const line = stringInfo.start.line + i;
				const lineText = lines[i];
				const trimStart = lineText.length - lineText.trimStart().length;
				const character = trimStart + Math.min(wordPosition.charOffset, targetWord.length);
				return new vscode.Position(line, character);
			}
		}
	} else {
		// Converting to single line
		// Calculate position in merged string
		const contentStart = stringInfo.start.character + 1; // After opening quote
		let offset = 0;
		for (let i = 0; i < wordPosition.wordIndex; i++) {
			offset += words[i].length + 1; // word + space
		}
		offset += Math.min(wordPosition.charOffset, targetWord.length);
		
		return new vscode.Position(stringInfo.start.line, contentStart + offset);
	}
	
	return stringInfo.start;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "split-spaced-strings" is now active!');

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

		// Save cursor position relative to word
		const wordPosition = getCursorWordPosition(stringInfo, position);
		const wasMultiline = stringInfo.isMultiline;

		// Determine if we should split or merge
		const newText = stringInfo.isMultiline 
			? mergeString(stringInfo) 
			: splitString(stringInfo, document);

		// Replace the string
		await editor.edit(editBuilder => {
			const range = new vscode.Range(stringInfo.start, stringInfo.end);
			editBuilder.replace(range, newText);
		});

		// Restore cursor position
		const newCursorPosition = calculateNewCursorPosition(stringInfo, newText, wordPosition, wasMultiline);
		editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
