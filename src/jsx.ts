import * as vscode from 'vscode';

export function isInJSXAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
	const languageId = document.languageId;
	if (languageId !== 'javascriptreact' && languageId !== 'typescriptreact') {
		return false;
	}

	const line = document.lineAt(position.line);
	const textBeforeCursor = line.text.substring(0, position.character);

	const lastOpenBracket = textBeforeCursor.lastIndexOf('<');
	const lastCloseBracket = textBeforeCursor.lastIndexOf('>');

	if (lastOpenBracket <= lastCloseBracket) {
		return false;
	}

	const tagText = textBeforeCursor.substring(lastOpenBracket);
	return /=\s*$/.test(tagText);
}
