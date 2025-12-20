import * as vscode from 'vscode';
import { calculateNewCursorPosition, getCursorWordPosition } from './cursor';
import { findStringAtCursor } from './parsing';
import { mergeString, splitString } from './splitMerge';
import {
	applyAutoCollapseOnSave,
	clearAllTrackedStrings,
	clearTrackedStringsForUri,
	collapseTrackedStrings,
	createDecorationType,
	findTrackedStringMatch,
	getLastDecorationRanges,
	trackString,
	untrackString,
	updateDecorations,
	updateTrackedStringsOnDocumentChange
} from './tracking';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "split-spaced-strings" is now active!');

	const decorationType = createDecorationType();

	const disposable = vscode.commands.registerCommand('split-spaced-strings.toggleSplit', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const document = editor.document;
		const position = editor.selection.active;

		const stringInfo = findStringAtCursor(document, position);
		if (!stringInfo) {
			vscode.window.showInformationMessage('Cursor is not inside a string literal');
			return;
		}

		if (stringInfo.isMultiline) {
			const trackedMatch = findTrackedStringMatch(document, stringInfo);
			if (trackedMatch) {
				stringInfo.originalQuote = trackedMatch.originalQuote;
			}
		}

		const wordPosition = getCursorWordPosition(stringInfo, position);
		const wasMultiline = stringInfo.isMultiline;

		const newText = stringInfo.isMultiline
			? mergeString(stringInfo, document)
			: splitString(stringInfo, document);

		const editSuccess = await editor.edit(editBuilder => {
			const range = new vscode.Range(stringInfo.start, stringInfo.end);
			editBuilder.replace(range, newText);
		});

		if (editSuccess) {
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);

			if (wasMultiline) {
				untrackString(document, stringInfo);
			} else {
				const searchPosition = new vscode.Position(
					stringInfo.start.line,
					stringInfo.start.character + stringInfo.quote.length
				);
				const newStringInfo = findStringAtCursor(document, searchPosition);
				if (newStringInfo && newStringInfo.isMultiline) {
					newStringInfo.originalQuote = stringInfo.originalQuote || stringInfo.quote;
					trackString(document, newStringInfo);
				}
			}

			if (autoCollapse) {
				updateDecorations(editor);
			}
		}

		const newCursorPosition = calculateNewCursorPosition(stringInfo, newText, wordPosition, wasMultiline);
		editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
	});

	const saveDisposable = vscode.workspace.onWillSaveTextDocument(event => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);

		if (!autoCollapse) {
			return;
		}

		const edits = applyAutoCollapseOnSave(event.document, vscode.window.activeTextEditor);
		if (edits.length > 0) {
			event.waitUntil(Promise.resolve(edits));
		}
	});

	const closeDisposable = vscode.workspace.onDidCloseTextDocument(document => {
		clearTrackedStringsForUri(document.uri.toString());
	});

	const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);

		if (editor && autoCollapse) {
			updateDecorations(editor);
		}
	});

	const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		const autoCollapse = config.get<boolean>('autoCollapseOnSave', false);

		if (!autoCollapse) {
			return;
		}

		updateTrackedStringsOnDocumentChange(event, vscode.window.activeTextEditor);
	});

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

export function deactivate() {
	clearAllTrackedStrings();
}

export const __test__ = {
	applyAutoCollapseOnSave,
	collapseTrackedStrings,
	getLastDecorationRanges
};
