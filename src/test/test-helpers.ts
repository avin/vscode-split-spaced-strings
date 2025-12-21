import * as vscode from 'vscode';

/**
 * Helper function to create a test document and execute the toggle command
 */
export async function testToggle(content: string, cursorLine: number, cursorChar: number, language: string = 'typescript'): Promise<string> {
	// Create a new document
	const document = await vscode.workspace.openTextDocument({
		content,
		language
	});

	// Show the document in editor
	const editor = await vscode.window.showTextDocument(document);

	// Set cursor position
	const position = new vscode.Position(cursorLine, cursorChar);
	editor.selection = new vscode.Selection(position, position);

	// Execute the toggle command
	await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

	// Return the modified content
	return editor.document.getText();
}

/**
 * Helper to test cursor position after toggle
 */
export async function testCursorPosition(
	content: string,
	cursorLine: number,
	cursorChar: number,
	expectedChar: string,
	language: string = 'typescript'
): Promise<void> {
	// Create document
	const document = await vscode.workspace.openTextDocument({
		content,
		language
	});
	const editor = await vscode.window.showTextDocument(document);

	// Set cursor position
	const position = new vscode.Position(cursorLine, cursorChar);
	editor.selection = new vscode.Selection(position, position);

	// Execute toggle
	await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

	// Check character at cursor position
	const newPosition = editor.selection.active;
	const charAtCursor = editor.document.getText(new vscode.Range(
		newPosition,
		new vscode.Position(newPosition.line, newPosition.character + 1)
	));

	if (charAtCursor !== expectedChar) {
		throw new Error(
			`Cursor should be at character '${expectedChar}', but found '${charAtCursor}' at line ${newPosition.line}, char ${newPosition.character}`
		);
	}
}

/**
 * Helper to clean up after each test by closing the active editor
 */
export async function cleanupEditor(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

/**
 * Helper to wait for a specific duration
 */
export function wait(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
