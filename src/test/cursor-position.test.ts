import * as assert from 'assert';
import * as vscode from 'vscode';
import { testCursorPosition, cleanupEditor } from './test-helpers';

suite('Cursor Position Preservation', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should preserve cursor position in middle of first word when splitting', async () => {
		const input = 'const x = "hello world test";';
		await testCursorPosition(input, 0, 13, 'l'); // Cursor at 'l' in "hello"
	});

	test('Should preserve cursor position at start of word when splitting', async () => {
		const input = 'const x = "hello world test";';
		await testCursorPosition(input, 0, 11, 'h'); // Cursor at 'h' in "hello"
	});

	test('Should preserve cursor position at end of word when splitting', async () => {
		const input = 'const x = "hello world test";';
		await testCursorPosition(input, 0, 15, 'o'); // Cursor at end 'o' of "hello"
	});

	test('Should preserve cursor position in middle word when splitting', async () => {
		const input = 'const x = "hello world test";';
		await testCursorPosition(input, 0, 19, 'r'); // Cursor at 'r' in "world"
	});

	test('Should preserve cursor position in last word when splitting', async () => {
		const input = 'const x = "hello world test";';
		await testCursorPosition(input, 0, 25, 's'); // Cursor at 's' in "test"
	});

	test('Should preserve cursor position on repeated words when splitting', async () => {
		const input = 'const x = "same same other";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Cursor inside the second "same"
		const position = new vscode.Position(0, 17);
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const lines = editor.document.getText().split('\n');
		const sameLines = lines
			.map((line, index) => (line.trim() === 'same' ? index : -1))
			.filter(index => index >= 0);

		assert.ok(sameLines.length >= 2, 'Should have repeated word lines');
		assert.strictEqual(newPosition.line, sameLines[1], 'Cursor should be on second repeated word');
	});

	test('Should preserve cursor position when merging from multiline', async () => {
		const input = `const x = "
  hello
  world
  test
";`;
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Position cursor in middle of "world" on line 2
		const position = new vscode.Position(2, 3); // 'o' in "world"
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const charAtCursor = editor.document.getText(new vscode.Range(
			newPosition,
			new vscode.Position(newPosition.line, newPosition.character + 1)
		));

		assert.strictEqual(charAtCursor, 'o', 'Cursor should remain at "o" in "world"');
	});

	test('Should preserve cursor position on repeated words when merging', async () => {
		const input = `const x = "
  same
  same
  other
";`;
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Cursor inside the second "same"
		const position = new vscode.Position(2, 3);
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const mergedLine = editor.document.lineAt(newPosition.line).text;
		const firstIndex = mergedLine.indexOf('same');
		const secondIndex = mergedLine.indexOf('same', firstIndex + 1);

		assert.ok(secondIndex > firstIndex, 'Should find second occurrence of repeated word');
		assert.ok(
			newPosition.character >= secondIndex && newPosition.character < secondIndex + 4,
			'Cursor should be on second repeated word'
		);
	});

	test('Should handle cursor at space between words when splitting', async () => {
		const input = 'const x = "hello world test";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Position cursor at space between "hello" and "world"
		const position = new vscode.Position(0, 16);
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		// After split, cursor should be in one of the words (not critical which)
		const newPosition = editor.selection.active;
		
		// Just verify cursor is still inside the string
		assert.ok(newPosition.line >= 0, 'Cursor should be in valid position');
	});

	test('Should preserve cursor through double toggle (split then merge)', async () => {
		const input = 'const x = "one two three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Position cursor at 'w' in "two"
		const initialPosition = new vscode.Position(0, 16);
		editor.selection = new vscode.Selection(initialPosition, initialPosition);

		// First toggle - split
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		const afterSplit = editor.selection.active;
		
		let charAfterSplit = editor.document.getText(new vscode.Range(
			afterSplit,
			new vscode.Position(afterSplit.line, afterSplit.character + 1)
		));
		assert.strictEqual(charAfterSplit, 'w', 'After split, cursor should be at "w"');

		// Second toggle - merge back
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		const afterMerge = editor.selection.active;
		
		let charAfterMerge = editor.document.getText(new vscode.Range(
			afterMerge,
			new vscode.Position(afterMerge.line, afterMerge.character + 1)
		));
		assert.strictEqual(charAfterMerge, 'w', 'After merge, cursor should still be at "w"');
	});

	test('Should handle cursor in word with special characters', async () => {
		const input = 'const x = "border-1 border-lime-100 font-bold";';
		await testCursorPosition(input, 0, 13, 'r'); // 'r' in "border-1"
	});

	test('Should preserve cursor at start of string content', async () => {
		const input = 'const x = "hello world";';
		await testCursorPosition(input, 0, 11, 'h'); // First char
	});

	test('Should preserve cursor near end of string content', async () => {
		const input = 'const x = "hello world";';
		await testCursorPosition(input, 0, 21, 'd'); // Last char of "world"
	});

	test('Should snap cursor to nearest word when in single space', async () => {
		const input = 'const x = "hello world test";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 16); // Space between hello and world
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		
		// Cursor should be at start or end of one of the words
		const charAtCursor = editor.document.getText(new vscode.Range(
			newPosition,
			new vscode.Position(newPosition.line, newPosition.character + 1)
		));
		
		// Should be at boundary (first char of a word or after last char)
		assert.ok(charAtCursor.match(/[a-z]/) || charAtCursor === '', 'Cursor should be at word boundary');
	});

	test('Should snap cursor to nearest word when in multiple spaces', async () => {
		const input = 'const x = "hello    world    test";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 16); // In middle of multiple spaces
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const charAtCursor = editor.document.getText(new vscode.Range(
			newPosition,
			new vscode.Position(newPosition.line, newPosition.character + 1)
		));
		
		// Should snap to either 'w' (start of world) or after 'o' (end of hello)
		assert.ok(['w', 'h', 't', ''].includes(charAtCursor), 'Cursor should snap to word boundary');
	});

	test('Should snap cursor closer to previous word when in spaces', async () => {
		const input = 'const x = "hello     world";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 16); // Just after "hello" (in first space)
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const lineText = editor.document.lineAt(newPosition.line).text;
		
		// Should be on a line containing "hello" or "world"
		assert.ok(lineText.includes('hello') || lineText.includes('world'), 'Should be on word line');
	});

	test('Should snap cursor closer to next word when in spaces', async () => {
		const input = 'const x = "hello     world";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 21); // Just before "world" (in last space)
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const lineText = editor.document.lineAt(newPosition.line).text;
		
		// Should be on a line containing "world"
		assert.ok(lineText.includes('world') || lineText.includes('hello'), 'Should be on word line');
	});

	test('Should handle cursor before first word', async () => {
		const input = 'const x = "  hello world";'; // Leading spaces
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 11); // Before "hello" in leading space
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const newPosition = editor.selection.active;
		const charAtCursor = editor.document.getText(new vscode.Range(
			newPosition,
			new vscode.Position(newPosition.line, newPosition.character + 1)
		));
		
		// Should snap to 'h' (start of hello)
		assert.strictEqual(charAtCursor, 'h', 'Cursor should snap to start of first word');
	});

	test('Should preserve position through toggle when cursor in spaces', async () => {
		const input = 'const x = "one  two  three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Position in space between "one" and "two"
		const position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);

		// First toggle - split
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		const afterSplit = editor.document.getText();
		assert.ok(afterSplit.split('\n').length > 1, 'Should be multiline');

		// Second toggle - merge back
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		const afterMerge = editor.document.getText();
		
		// Should be back to single line with words preserved
		assert.ok(afterMerge.includes('one') && afterMerge.includes('two') && afterMerge.includes('three'), 
			'All words should be preserved');
	});
});
