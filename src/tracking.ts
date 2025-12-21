import * as vscode from 'vscode';
import { findQuotePositionInLine } from './parsing';
import { mergeString } from './splitMerge';
import { StringInfo, TrackedString } from './types';

const trackedStrings = new Map<string, TrackedString[]>();
let decorationType: vscode.TextEditorDecorationType | null = null;
let lastDecorationRanges: vscode.Range[] = [];

export function createDecorationType(): vscode.TextEditorDecorationType {
	const config = vscode.workspace.getConfiguration('splitSpacedStrings');
	
	const backgroundColor = config.get<string>('highlightBackgroundColor', 'rgba(255, 200, 0, 0.1)');
	const borderColor = config.get<string>('highlightBorderColor', 'rgba(255, 200, 0, 0.3)');
	const borderWidth = config.get<string>('highlightBorderWidth', '1px');
	const borderStyle = config.get<string>('highlightBorderStyle', 'solid');
	const overviewRulerColor = config.get<string>('overviewRulerColor', 'rgba(255, 200, 0, 0.5)');
	const overviewRulerLaneStr = config.get<string>('overviewRulerLane', 'right');
	const isWholeLine = config.get<boolean>('highlightWholeLine', true);
	
	const overviewRulerLaneMap: { [key: string]: vscode.OverviewRulerLane } = {
		'left': vscode.OverviewRulerLane.Left,
		'center': vscode.OverviewRulerLane.Center,
		'right': vscode.OverviewRulerLane.Right,
		'full': vscode.OverviewRulerLane.Full
	};
	
	const overviewRulerLane = overviewRulerLaneMap[overviewRulerLaneStr] || vscode.OverviewRulerLane.Right;
	
	decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor,
		border: `${borderWidth} ${borderStyle} ${borderColor}`,
		isWholeLine,
		overviewRulerColor,
		overviewRulerLane
	});
	return decorationType;
}

export function getTrackedStrings(document: vscode.TextDocument): TrackedString[] | undefined {
	return trackedStrings.get(document.uri.toString());
}

export function findTrackedStringMatch(
	document: vscode.TextDocument,
	stringInfo: StringInfo
): TrackedString | undefined {
	const tracked = trackedStrings.get(document.uri.toString());
	if (!tracked) {
		return undefined;
	}

	const endChar = stringInfo.end.character - stringInfo.quote.length;
	return tracked.find(t =>
		t.startLine === stringInfo.start.line &&
		t.endLine === stringInfo.end.line &&
		t.startChar === stringInfo.start.character &&
		t.endChar === endChar
	);
}

export function trackString(document: vscode.TextDocument, stringInfo: StringInfo): void {
	const uri = document.uri.toString();
	if (!trackedStrings.has(uri)) {
		trackedStrings.set(uri, []);
	}

	const tracked = trackedStrings.get(uri)!;
	const filtered = tracked.filter(t =>
		!(t.startLine === stringInfo.start.line &&
			t.endLine === stringInfo.end.line &&
			t.startChar === stringInfo.start.character &&
			t.endChar === stringInfo.end.character - stringInfo.quote.length)
	);

	const contentHash = stringInfo.content.trim().replace(/\s+/g, ' ');

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

export function untrackString(document: vscode.TextDocument, stringInfo: StringInfo): void {
	const uri = document.uri.toString();
	const tracked = trackedStrings.get(uri);
	if (!tracked) {
		return;
	}

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

export function updateDecorations(editor: vscode.TextEditor): void {
	if (!decorationType) {
		lastDecorationRanges = [];
		return;
	}

	const strings = findTrackedStringsInDocument(editor.document);
	const decorations: vscode.DecorationOptions[] = strings.map(s => ({
		range: new vscode.Range(s.start.line, 0, s.end.line, Number.MAX_VALUE),
		hoverMessage: 'This string will be collapsed to single line on save (if auto-collapse is enabled)'
	}));

	editor.setDecorations(decorationType, decorations);
	lastDecorationRanges = decorations.map(decoration => decoration.range);
}

function findTrackedStringsInDocument(document: vscode.TextDocument): StringInfo[] {
	const uri = document.uri.toString();
	const tracked = trackedStrings.get(uri);
	if (!tracked || tracked.length === 0) {
		return [];
	}

	const result: StringInfo[] = [];

	for (const t of tracked) {
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
			continue;
		}
	}

	return result;
}

export function collapseTrackedStrings(document: vscode.TextDocument): vscode.TextEdit[] {
	const strings = findTrackedStringsInDocument(document);
	const edits: vscode.TextEdit[] = [];

	strings.sort((a, b) => b.start.line - a.start.line);

	for (const stringInfo of strings) {
		const newText = mergeString(stringInfo, document);
		const range = new vscode.Range(stringInfo.start, stringInfo.end);
		edits.push(vscode.TextEdit.replace(range, newText));
	}

	return edits;
}

export function clearTrackedStringsForUri(uri: string): void {
	trackedStrings.delete(uri);
}

export function clearAllTrackedStrings(): void {
	trackedStrings.clear();
}

export function applyAutoCollapseOnSave(
	document: vscode.TextDocument,
	editor: vscode.TextEditor | undefined
): vscode.TextEdit[] {
	const edits = collapseTrackedStrings(document);
	if (edits.length > 0) {
		clearTrackedStringsForUri(document.uri.toString());
		if (editor && editor.document === document) {
			setTimeout(() => {
				updateDecorations(editor);
			}, 0);
		}
	}

	return edits;
}

export function getLastDecorationRanges(): vscode.Range[] {
	return lastDecorationRanges;
}

export function updateTrackedStringsOnDocumentChange(
	event: vscode.TextDocumentChangeEvent,
	editor: vscode.TextEditor | undefined
): void {
	if (!editor || editor.document !== event.document) {
		return;
	}

	const uri = event.document.uri.toString();
	const tracked = trackedStrings.get(uri);
	if (!tracked || tracked.length === 0) {
		return;
	}

	for (const change of event.contentChanges) {
		const lineDelta = change.text.split('\n').length - 1 - (change.range.end.line - change.range.start.line);
		const isSingleLineChange = change.range.start.line === change.range.end.line &&
			change.text.indexOf('\n') === -1;
		const charDelta = isSingleLineChange
			? change.text.length - (change.range.end.character - change.range.start.character)
			: 0;

		for (const t of tracked) {
			let isChangeAfterString = false;
			if (change.range.start.line === t.endLine && change.range.end.line === t.endLine) {
				try {
					const endLineText = event.document.lineAt(t.endLine).text;
					const endQuotePos = findQuotePositionInLine(endLineText, t.quote, t.endChar, 'end');

					if (endQuotePos !== -1 &&
						change.range.start.character > endQuotePos + t.quote.length - 1) {
						isChangeAfterString = true;
					}
				} catch (e) {
					// Ignore errors, treat as inside string
				}
			}

			if (change.range.end.line < t.startLine) {
				t.startLine += lineDelta;
				t.endLine += lineDelta;
			} else if (isChangeAfterString) {
				// Do nothing
			} else if (change.range.start.line <= t.endLine && change.range.end.line >= t.startLine) {
				if (change.range.start.line >= t.startLine) {
					t.endLine += lineDelta;
				} else {
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

	for (const t of tracked) {
		if (t.startLine >= event.document.lineCount || t.endLine >= event.document.lineCount) {
			continue;
		}

		try {
			const startLineText = event.document.lineAt(t.startLine).text;
			const startQuotePos = findQuotePositionInLine(startLineText, t.quote, t.startChar, 'start');
			if (startQuotePos === -1) {
				continue;
			}

			const endLineText = event.document.lineAt(t.endLine).text;
			const endQuotePos = findQuotePositionInLine(endLineText, t.quote, t.endChar, 'end');
			if (endQuotePos === -1) {
				continue;
			}

			const quoteLength = t.quote.length;
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

			t.startChar = startQuotePos;
			t.endChar = endQuotePos;
			t.content = content;
			t.contentHash = content.trim().replace(/\s+/g, ' ');
		} catch (e) {
			console.log('[Split Spaced Strings] Error updating tracked string:', e);
		}
	}

	setTimeout(() => {
		updateDecorations(editor);
	}, 100);
}
