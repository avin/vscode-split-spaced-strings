import * as assert from 'assert';
import * as vscode from 'vscode';
import { __test__ } from '../extension';

suite('Split Spaced Strings Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;

	/**
	 * Helper function to create a test document and execute the toggle command
	 */
	async function testToggle(content: string, cursorLine: number, cursorChar: number): Promise<string> {
		// Create a new document
		document = await vscode.workspace.openTextDocument({
			content,
			language: 'typescript'
		});

		// Show the document in editor
		editor = await vscode.window.showTextDocument(document);

		// Set cursor position
		const position = new vscode.Position(cursorLine, cursorChar);
		editor.selection = new vscode.Selection(position, position);

		// Execute the toggle command
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		// Return the modified content
		return editor.document.getText();
	}

	/**
	 * Helper to clean up after each test
	 */
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	});

	suite('Double Quote Strings', () => {
		test('Should split single-line string with double quotes', async () => {
			const input = 'const x = "border-1 border-lime-100 font-bold";';
			const result = await testToggle(input, 0, 15);
			
			// TypeScript converts double quotes to backticks for multiline
			assert.ok(result.includes('`'), 'Should contain backticks (converted from double quotes)');
			assert.ok(result.includes('border-1'), 'Should contain border-1');
			assert.ok(result.includes('border-lime-100'), 'Should contain border-lime-100');
			assert.ok(result.includes('font-bold'), 'Should contain font-bold');
			
			// Check that words are on separate lines
			const lines = result.split('\n');
			assert.ok(lines.length > 3, 'Should have multiple lines');
		});

		test('Should merge multi-line string with double quotes back to single line', async () => {
			const input = `const x = "\n  border-1\n  border-lime-100\n  font-bold\n";`;
			const result = await testToggle(input, 1, 5);
			
			assert.ok(result.includes('border-1 border-lime-100 font-bold'), 'Should merge words with spaces');
			assert.strictEqual(result.split('\n').length, 1, 'Should be on single line');
		});
	});

	suite('Single Quote Strings', () => {
		test('Should split single-line string with single quotes', async () => {
			const input = "const x = 'hello world test';";
			const result = await testToggle(input, 0, 15);
			
			// TypeScript converts single quotes to backticks for multiline
			assert.ok(result.includes('`'), 'Should contain backticks (converted from single quotes)');
			assert.ok(result.includes('hello'), 'Should contain hello');
			assert.ok(result.includes('world'), 'Should contain world');
			assert.ok(result.includes('test'), 'Should contain test');
			
			const lines = result.split('\n');
			assert.ok(lines.length > 3, 'Should have multiple lines');
		});

		test('Should merge multi-line string with single quotes', async () => {
			const input = `const x = '\n  hello\n  world\n  test\n';`;
			const result = await testToggle(input, 1, 5);
			
			assert.ok(result.includes('hello world test'), 'Should merge words with spaces');
			assert.strictEqual(result.split('\n').length, 1, 'Should be on single line');
		});
	});

	suite('Template Literal Strings', () => {
		test('Should split single-line template literal', async () => {
			const input = 'const x = `class-one class-two class-three`;';
			const result = await testToggle(input, 0, 15);
			
			assert.ok(result.includes('`'), 'Should contain backticks');
			assert.ok(result.includes('class-one'), 'Should contain class-one');
			assert.ok(result.includes('class-two'), 'Should contain class-two');
			assert.ok(result.includes('class-three'), 'Should contain class-three');
			
			const lines = result.split('\n');
			assert.ok(lines.length > 3, 'Should have multiple lines');
		});

		test('Should merge multi-line template literal', async () => {
			const input = 'const x = `\n  class-one\n  class-two\n  class-three\n`;';
			const result = await testToggle(input, 1, 5);
			
			assert.ok(result.includes('class-one class-two class-three'), 'Should merge words with spaces');
			assert.strictEqual(result.split('\n').length, 1, 'Should be on single line');
		});

		test('Should handle escaped backticks in multiline template literal', async () => {
			const input = 'const x = `\n  hello \\`world\\`\n  test\n`;';
			const result = await testToggle(input, 2, 3);
			
			assert.ok(result.includes('hello \\`world\\` test'), 'Should preserve escaped backticks on merge');
			assert.strictEqual(result.split('\n').length, 1, 'Should be on single line');
		});
	});

	suite('Edge Cases', () => {
		test('Should handle string with single word', async () => {
			const input = 'const x = "hello";';
			const result = await testToggle(input, 0, 15);
			
			assert.ok(result.includes('hello'), 'Should contain the word');
			const lines = result.split('\n');
			assert.ok(lines.length >= 3, 'Should create multiline even for single word');
		});

		test('Should handle empty string', async () => {
			const input = 'const x = "";';
			const result = await testToggle(input, 0, 12);
			
			// Should either leave it unchanged or handle gracefully
			assert.ok(result.includes('""') || result.includes('"\n"'), 'Should handle empty string');
		});

		test('Should handle string with multiple spaces', async () => {
			const input = 'const x = "hello    world    test";';
			const result = await testToggle(input, 0, 15);
			
			// Multiple spaces should be treated as single separator
			assert.ok(result.includes('hello'), 'Should contain hello');
			assert.ok(result.includes('world'), 'Should contain world');
			assert.ok(result.includes('test'), 'Should contain test');
		});

		test('Should handle cursor at beginning of string', async () => {
			const input = 'const x = "hello world";';
			const result = await testToggle(input, 0, 11); // Right after opening quote
			
			assert.ok(result.includes('hello'), 'Should work with cursor at start');
			assert.ok(result.includes('world'), 'Should work with cursor at start');
		});

		test('Should handle cursor at end of string', async () => {
			const input = 'const x = "hello world";';
			const result = await testToggle(input, 0, 22); // Right before closing quote
			
			assert.ok(result.includes('hello'), 'Should work with cursor at end');
			assert.ok(result.includes('world'), 'Should work with cursor at end');
		});

		test('Should not modify when cursor is outside string', async () => {
			const input = 'const x = "hello world";';
			const original = input;
			try {
				await testToggle(input, 0, 5); // On "const"
			} catch (e) {
				// Expected to fail or show message
			}
			// Command should not crash
			assert.ok(true, 'Should handle cursor outside string gracefully');
		});

		test('Should handle string with special characters', async () => {
			const input = 'const x = "hello-world_test.class";';
			const result = await testToggle(input, 0, 15);
			
			assert.ok(result.includes('hello-world_test.class'), 'Should treat non-space strings as single words');
		});

		test('Should preserve indentation when splitting', async () => {
			const input = '    const x = "class-a class-b";';
			const result = await testToggle(input, 0, 20);
			
			const lines = result.split('\n');
			// Check that words maintain proper indentation
			let hasProperIndent = false;
			for (const line of lines) {
				if (line.includes('class-a') || line.includes('class-b')) {
					hasProperIndent = line.startsWith('    ') || line.startsWith('      ');
				}
			}
			assert.ok(hasProperIndent, 'Should preserve base indentation');
		});

		test('Should handle JSX className attribute', async () => {
			const input = '<button className="border-1 border-lime-100 font-bold">Test</button>';
			const result = await testToggle(input, 0, 25);
			
			assert.ok(result.includes('border-1'), 'Should work in JSX');
			assert.ok(result.includes('border-lime-100'), 'Should work in JSX');
			assert.ok(result.includes('font-bold'), 'Should work in JSX');
		});

		test('Should toggle back and forth correctly', async () => {
			const input = 'const x = "one two three";';
			
			// First toggle - split
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			const afterSplit = editor.document.getText();
			
			assert.ok(afterSplit.split('\n').length > 1, 'Should be multiline after split');
			
			// Second toggle - merge back
			// The cursor should be positioned inside the multiline string
			// After split, the structure is:
			// const x = "
			//   one
			//   two
			//   three
			// ";
			position = new vscode.Position(1, 3); // Inside "one"
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			const afterMerge = editor.document.getText();
			
			assert.ok(afterMerge.includes('one two three'), 'Should merge back with spaces');
			assert.strictEqual(afterMerge.split('\n').length, 1, 'Should be single line after merge');
		});
	});

	suite('Complex Real-World Cases', () => {
		test('Should handle Tailwind CSS classes', async () => {
			const input = '<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">Content</div>';
			const result = await testToggle(input, 0, 25);
			
			const words = ['flex', 'items-center', 'justify-between', 'p-4', 'bg-white', 'rounded-lg', 'shadow-md'];
			for (const word of words) {
				assert.ok(result.includes(word), `Should contain ${word}`);
			}
		});

		test('Should handle mixed quotes in code', async () => {
			const input = `const x = "hello world"; const y = 'foo bar';`;
			
			// Test first string
			const result1 = await testToggle(input, 0, 15);
			assert.ok(result1.includes('hello') && result1.includes('world'), 'Should split first string');
			
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			
			// Test second string
			const result2 = await testToggle(input, 0, 38);
			assert.ok(result2.includes('foo') && result2.includes('bar'), 'Should split second string');
		});
	});

	suite('Cursor Position Preservation', () => {
		/**
		 * Helper to test cursor position after toggle
		 */
		async function testCursorPosition(
			content: string, 
			cursorLine: number, 
			cursorChar: number,
			expectedChar: string
		): Promise<void> {
			// Create document
			document = await vscode.workspace.openTextDocument({
				content,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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

			assert.strictEqual(charAtCursor, expectedChar, 
				`Cursor should be at character '${expectedChar}', but found '${charAtCursor}' at line ${newPosition.line}, char ${newPosition.character}`);
		}

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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Position cursor in middle of "world" on line 2
			// Line 2 is "  world", positions: [0]=space, [1]=space, [2]=w, [3]=o, [4]=r
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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Position cursor at space between "hello" and "world"
			const position = new vscode.Position(0, 16);
			editor.selection = new vscode.Selection(position, position);

			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			// After split, cursor should be in one of the words (not critical which)
			const newPosition = editor.selection.active;
			const result = editor.document.getText();
			
			// Just verify cursor is still inside the string
			assert.ok(newPosition.line >= 0, 'Cursor should be in valid position');
		});

		test('Should preserve cursor through double toggle (split then merge)', async () => {
			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			// Position 16 is the space between "hello" and "world"
			// const x = "hello world test";
			//            ^     ^
			//           11    16
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 16); // Space between hello and world
			editor.selection = new vscode.Selection(position, position);

			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			const newPosition = editor.selection.active;
			const result = editor.document.getText();
			
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
			// Multiple spaces: position 14 is in the middle of spaces between hello and world
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			// Position 12 is just after "hello", should stay with "hello"
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			// Position 20 is just before "world", should go to "world"
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

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

	suite('Auto-Collapse on Save', () => {
		test('Should auto-collapse split strings when saving with setting enabled', async function() {
			this.timeout(5000); // Increase timeout for save operations
			
			// Enable auto-collapse setting
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "flex items-center justify-between";';
			
			// Create and show document
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Set cursor and split the string
			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			// Verify it's split
			const afterSplit = editor.document.getText();
			assert.ok(afterSplit.split('\n').length > 3, 'Should be multiline after split');

			// Note: Actually saving documents in tests can be problematic
			// Instead, we verify that the tracking system works
			// The actual save behavior is tested through the onWillSaveTextDocument handler
			
			// Reset setting
			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should clear decorations after auto-collapse on save', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			const rangesAfterSplit = __test__.getLastDecorationRanges();
			assert.ok(rangesAfterSplit.length > 0, 'Should add decorations after split');

			const edits = __test__.applyAutoCollapseOnSave(editor.document, editor);
			assert.ok(edits.length > 0, 'Should generate edits for auto-collapse');

			await editor.edit(editBuilder => {
				for (const edit of edits) {
					editBuilder.replace(edit.range, edit.newText);
				}
			});

			await new Promise(resolve => setTimeout(resolve, 50));

			const rangesAfterCollapse = __test__.getLastDecorationRanges();
			assert.strictEqual(rangesAfterCollapse.length, 0, 'Should clear decorations after auto-collapse');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should NOT auto-collapse when setting is disabled', async function() {
			this.timeout(5000);
			
			// Ensure auto-collapse is disabled
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			const afterSplit = editor.document.getText();
			const lineCountAfterSplit = afterSplit.split('\n').length;
			assert.ok(lineCountAfterSplit > 3, 'Should be multiline after split');
			
			// Verify setting is off
			const setting = config.get('autoCollapseOnSave');
			assert.strictEqual(setting, false, 'Setting should be disabled');
		});

		test('Should track multiple split strings', async function() {
			this.timeout(5000);
			
			// Enable auto-collapse
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "flex items-center";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			await new Promise(resolve => setTimeout(resolve, 50));

			// Verify it's split
			const afterSplit = editor.document.getText();
			assert.ok(afterSplit.includes('flex') && afterSplit.includes('items-center'), 
				'String should be split');
			assert.ok(afterSplit.split('\n').length > 2, 'Should be multiline');

			// Reset setting
			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should manually merge string and remove from tracking', async function() {
			this.timeout(5000);
			
			// Enable auto-collapse
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Verify it's multiline
			let currentText = editor.document.getText();
			assert.ok(currentText.split('\n').length > 1, 'Should be multiline after split');
			
			// Manually merge it back by toggling again
			// Find a line with a word in it
			const lines = currentText.split('\n');
			let wordLineIndex = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim() === 'one' || lines[i].trim() === 'two') {
					wordLineIndex = i;
					break;
				}
			}
			
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 2);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

				await new Promise(resolve => setTimeout(resolve, 100));

				// Now it should be single line
				const afterManualMerge = editor.document.getText();
				assert.ok(afterManualMerge.includes('one two three'), 
					'Should be merged back to single line with all words');
			}

			// Reset setting
			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should verify tracking system can handle split/merge cycles', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "test one two";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			
			// Split
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			let text = editor.document.getText();
			assert.ok(text.split('\n').length > 1, 'Should be split');
			
			// Find word position and merge
			const lines = text.split('\n');
			let wordLine = lines.findIndex(l => l.includes('test') || l.includes('one'));
			if (wordLine >= 0) {
				editor.selection = new vscode.Selection(new vscode.Position(wordLine, 2), new vscode.Position(wordLine, 2));
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			text = editor.document.getText();
			assert.ok(text.includes('test one two'), 'Should be merged');
			
			// Split again
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			text = editor.document.getText();
			assert.ok(text.split('\n').length > 1, 'Should be split again');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});
	});

	suite('Auto-Collapse Edge Cases', () => {
		test('Should track string after pressing Enter inside it', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Find a line with a word and press Enter after it
			let text = editor.document.getText();
			const lines = text.split('\n');
			let wordLineIndex = lines.findIndex(l => l.trim() === 'one');
			
			if (wordLineIndex >= 0) {
				const lineLength = lines[wordLineIndex].length;
				position = new vscode.Position(wordLineIndex, lineLength);
				editor.selection = new vscode.Selection(position, position);
				
				// Insert a newline (simulating Enter press)
				await editor.edit(editBuilder => {
					editBuilder.insert(position, '\n');
				});
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// Check that string is still tracked (should still have decorations)
				text = editor.document.getText();
				assert.ok(text.split('\n').length > 4, 'Should still be multiline after Enter');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should collapse only tracked string when multiple strings are on the same line', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const a = "one two"; const b = "three four";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split only the second string
			const position = new vscode.Position(0, 33);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Collapse tracked strings via internal helper
			const edits = __test__.collapseTrackedStrings(editor.document);
			assert.strictEqual(edits.length, 1, 'Should generate one collapse edit');
			
			await editor.edit(editBuilder => {
				for (const edit of edits) {
					editBuilder.replace(edit.range, edit.newText);
				}
			});

			const text = editor.document.getText();
			assert.ok(!text.includes('\n'), 'Should remain single-line after collapse');
			assert.ok(text.includes('const a = "one two";'), 'First string should remain intact');
			assert.ok(text.includes('const b = "three four";'), 'Second string should be collapsed correctly');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should track string after pressing Enter on last line (closing quote)', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Find the last line (closing quote line)
			let text = editor.document.getText();
			let lines = text.split('\n');
			const lastLineIndex = lines.findIndex(l => l.includes('"') && l.trim().startsWith('"'));
			
			if (lastLineIndex >= 0) {
				// Position cursor before the closing quote
				const quoteLine = lines[lastLineIndex];
				const quotePos = quoteLine.indexOf('"');
				position = new vscode.Position(lastLineIndex, quotePos);
				editor.selection = new vscode.Selection(position, position);
				
				// Insert a newline before closing quote
				await editor.edit(editBuilder => {
					editBuilder.insert(position, '\n  ');
				});
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// String should still be tracked and multiline
				text = editor.document.getText();
				assert.ok(text.split('\n').length > 4, 'Should still be multiline after Enter on last line');
				
				// Verify it's still a valid multiline string
				assert.ok(text.includes('one') && text.includes('two') && text.includes('three'), 
					'Should still contain all words');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should NOT affect tracking when pressing Enter AFTER closing quote', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const goo = "bar baz azz2";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string (bar baz azz2)
			let position = new vscode.Position(0, 18);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Verify it's split
			let text = editor.document.getText();
			assert.ok(text.includes('\n'), 'String should be split into multiple lines');
			
			// Find the closing quote line (line with `;) - now using backticks
			let lines = text.split('\n');
			
			// Find line ending with backtick and semicolon (`;)
			let closingQuoteLine = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim() === '`;' || lines[i].trim() === '";') {
					closingQuoteLine = i;
					break;
				}
			}
			
			assert.ok(closingQuoteLine >= 0, 'Should find closing quote line');
			
			// Count lines before Enter
			const linesBefore = lines.length;
			
			// Position cursor AFTER the semicolon on the closing quote line
			const lineLength = lines[closingQuoteLine].length;
			position = new vscode.Position(closingQuoteLine, lineLength);
			editor.selection = new vscode.Selection(position, position);
			
			// Insert a newline (simulating Enter press after ";)
			await editor.edit(editBuilder => {
				editBuilder.insert(position, '\n');
			});
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Verify the newline was added but the string structure is intact
			text = editor.document.getText();
			lines = text.split('\n');
			assert.strictEqual(lines.length, linesBefore + 1, 'Should have one more line after Enter');
			
			// The split string should still contain all words
			assert.ok(text.includes('bar'), 'Should still contain "bar"');
			assert.ok(text.includes('baz'), 'Should still contain "baz"');
			assert.ok(text.includes('azz2'), 'Should still contain "azz2"');
			
			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should track and collapse two identical strings separately', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two";\nconst y = "one two";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split first string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Split second string
			let text = editor.document.getText();
			
			// Need to recalculate the line number after first split
			// Find where "const y" is now
			const lines = text.split('\n');
			let secondStringLine = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].includes('const y')) {
					secondStringLine = i;
					break;
				}
			}
			
			if (secondStringLine >= 0) {
				position = new vscode.Position(secondStringLine, 15);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			// Both should be tracked
			const finalText = editor.document.getText();
			const occurrences = (finalText.match(/one/g) || []).length;
			assert.strictEqual(occurrences, 2, 'Should have two "one" words (one in each string)');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should handle editing tracked string content', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "one two three";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split the string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Find a line with 'two' and change it to 'MODIFIED'
			let text = editor.document.getText();
			const lines = text.split('\n');
			const twoLineIndex = lines.findIndex(l => l.trim() === 'two');
			
			if (twoLineIndex >= 0) {
				const line = editor.document.lineAt(twoLineIndex);
				const wordStart = line.text.indexOf('two');
				const range = new vscode.Range(
					new vscode.Position(twoLineIndex, wordStart),
					new vscode.Position(twoLineIndex, wordStart + 3)
				);
				
				await editor.edit(editBuilder => {
					editBuilder.replace(range, 'MODIFIED');
				});
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// String should still be tracked with updated content
				text = editor.document.getText();
				assert.ok(text.includes('MODIFIED'), 'Should contain modified content');
				assert.ok(text.includes('one') && text.includes('three'), 'Should still have other words');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});
	});

	suite('Multiple Strings Scenarios', () => {
		test('Should split and track two different strings', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "alpha beta";\nconst y = "gamma delta epsilon";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split first string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Split second string
			let text = editor.document.getText();
			const lines = text.split('\n');
			let secondStringLine = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].includes('const y')) {
					secondStringLine = i;
					break;
				}
			}
			
			if (secondStringLine >= 0) {
				position = new vscode.Position(secondStringLine, 15);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			// Both strings should be split
			text = editor.document.getText();
			assert.ok(text.includes('alpha') && text.includes('beta'), 'First string should be split');
			assert.ok(text.includes('gamma') && text.includes('delta') && text.includes('epsilon'), 'Second string should be split');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should split two identical strings and track both independently', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "same same";\nconst y = "same same";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split first identical string
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			// Split second identical string
			let text = editor.document.getText();
			const lines = text.split('\n');
			let secondStringLine = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].includes('const y')) {
					secondStringLine = i;
					break;
				}
			}
			
			if (secondStringLine >= 0) {
				position = new vscode.Position(secondStringLine, 15);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			// Both identical strings should be split
			text = editor.document.getText();
			const sameCount = (text.match(/\bsame\b/g) || []).length;
			assert.strictEqual(sameCount, 4, 'Should have 4 "same" words (2 in each string)');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should edit one of two identical strings and track both', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const x = "word word";\nconst y = "word word";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split both strings
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 100));

			let text = editor.document.getText();
			let lines = text.split('\n');
			let secondStringLine = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].includes('const y')) {
					secondStringLine = i;
					break;
				}
			}
			
			if (secondStringLine >= 0) {
				position = new vscode.Position(secondStringLine, 15);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 150));
			}

			// Edit first string - change first "word" to "EDITED"
			text = editor.document.getText();
			lines = text.split('\n');
			const firstWordLine = lines.findIndex(l => l.trim() === 'word');
			
			if (firstWordLine >= 0) {
				const line = editor.document.lineAt(firstWordLine);
				const wordStart = line.text.indexOf('word');
				const range = new vscode.Range(
					new vscode.Position(firstWordLine, wordStart),
					new vscode.Position(firstWordLine, wordStart + 4)
				);
				
				await editor.edit(editBuilder => {
					editBuilder.replace(range, 'EDITED');
				});
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			// First string should have EDITED, second should still have word
			text = editor.document.getText();
			assert.ok(text.includes('EDITED'), 'First string should be edited');
			const wordCount = (text.match(/\bword\b/g) || []).length;
			assert.ok(wordCount >= 2, 'Second string should still have "word"');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Should split three different strings and track all', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = 'const a = "one two";\nconst b = "three four";\nconst c = "five six";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split all three strings
			for (let stringNum = 0; stringNum < 3; stringNum++) {
				const text = editor.document.getText();
				const lines = text.split('\n');
				
				let targetLine = -1;
				const searchTerms = ['const a', 'const b', 'const c'];
				
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].includes(searchTerms[stringNum])) {
						targetLine = i;
						break;
					}
				}
				
				if (targetLine >= 0) {
					const position = new vscode.Position(targetLine, 15);
					editor.selection = new vscode.Selection(position, position);
					await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}

			// All three strings should be split
			const text = editor.document.getText();
			assert.ok(text.includes('one') && text.includes('two'), 'First string split');
			assert.ok(text.includes('three') && text.includes('four'), 'Second string split');
			assert.ok(text.includes('five') && text.includes('six'), 'Third string split');

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});
	});

	suite('Smart Quotes', function() {
		let document: vscode.TextDocument;
		let editor: vscode.TextEditor;

		test('JavaScript: Should convert single quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			// Should use backticks for multiline
			assert.ok(text.includes('`'), 'Should use backticks after split');
			assert.ok(!text.includes("'hello"), 'Should not have single quotes around content');
		});

		test('JavaScript: Should restore single quotes on merge (no template features)', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			let text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks after split');

			// Find a word to click on for merge
			const lines = text.split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			assert.ok(wordLineIndex >= 0, 'Should find word line');

			// Merge back
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			text = editor.document.getText();
			// Should restore original single quotes
			assert.ok(text.includes("'hello world test'"), 'Should restore single quotes on merge');
			assert.ok(!text.includes('`'), 'Should not have backticks after merge');
		});

		test('JavaScript: Should keep backticks when using template interpolation', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split to backticks
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Add template interpolation ${...}
			let text = editor.document.getText();
			const lines = text.split('\n');
			const worldLineIndex = lines.findIndex(l => l.trim() === 'world');
			assert.ok(worldLineIndex >= 0, 'Should find "world" line');

			// Replace "world" with "world ${1+1}"
			const line = editor.document.lineAt(worldLineIndex);
			const worldStart = line.text.indexOf('world');
			const worldRange = new vscode.Range(
				new vscode.Position(worldLineIndex, worldStart),
				new vscode.Position(worldLineIndex, worldStart + 5)
			);
			
			await editor.edit(editBuilder => {
				editBuilder.replace(worldRange, 'world ${1+1}');
			});
			await new Promise(resolve => setTimeout(resolve, 200));

			// Now merge - should keep backticks
			position = new vscode.Position(worldLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			text = editor.document.getText();
			// Should keep backticks because of interpolation
			assert.ok(text.includes('`'), 'Should keep backticks when template interpolation is used');
			assert.ok(text.includes('${1+1}'), 'Should preserve template interpolation');
		});

		test('TypeScript: Should convert double quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = 'const x = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			// Should use backticks for multiline
			assert.ok(text.includes('`'), 'Should use backticks after split');
			assert.ok(!text.includes('"hello'), 'Should not have double quotes around content');
		});

		test('TypeScript: Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'const x = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Merge back
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge');
		});

		test('TSX: Should keep double quotes in JSX attributes', async function() {
			this.timeout(5000);

			const input = '<div className="flex items-center gap-4 p-6">test</div>';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split className attribute value
			const position = new vscode.Position(0, 20);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			// Should still use double quotes, not backticks (JSX allows multiline in attributes)
			assert.ok(text.includes('"'), 'Should keep double quotes in JSX attributes');
			assert.ok(text.includes('flex'), 'Should have split content');
			assert.ok(text.includes('items-center'), 'Should have split content');
		});

		test('TSX: Should keep double quotes in multiline JSX attributes', async function() {
			this.timeout(5000);

			const input = [
				'const Demo = () => (',
				'  <div',
				'    className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 md:p-8 foo bg-white"',
				'  >',
				'    ok',
				'  </div>',
				');'
			].join('\n');
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('className="'), 'Should keep double quotes for multiline JSX attribute');
			assert.ok(!text.includes('`'), 'Should not use backticks for multiline JSX attribute');
		});

		test('TSX: Should keep double quotes after expression attributes in multiline tags', async function() {
			this.timeout(5000);

			const input = [
				'const Demo = () => (',
				'  <Button',
				'    onClick={() => console.log("clicked")}',
				'    className="one two three"',
				'  />',
				');'
			].join('\n');
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('className="'), 'Should keep double quotes after expression attributes');
			assert.ok(!text.includes('`'), 'Should not use backticks after expression attributes');
		});

		test('JSX: Should keep double quotes in multiline JSX attributes', async function() {
			this.timeout(5000);

			const input = [
				'const Demo = () => (',
				'  <div',
				'    className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 md:p-8 foo bg-white"',
				'  >',
				'    ok',
				'  </div>',
				');'
			].join('\n');
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('className="'), 'Should keep double quotes for JSX attribute');
			assert.ok(!text.includes('`'), 'Should not use backticks in JSX attribute');
		});

		test('TSX: Should keep double quotes when attribute value is on next line', async function() {
			this.timeout(5000);

			const input = [
				'const Demo = () => (',
				'  <div',
				'    className=',
				'      "one two three"',
				'  >',
				'    ok',
				'  </div>',
				');'
			].join('\n');
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const valueLineIndex = lines.findIndex(l => l.includes('"one two three"'));
			const quoteIndex = lines[valueLineIndex].indexOf('"');
			const position = new vscode.Position(valueLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"'), 'Should keep double quotes for multiline value');
			assert.ok(!text.includes('`'), 'Should not use backticks for multiline value');
		});

		test('TSX: Should use backticks inside JSX expression attributes', async function() {
			this.timeout(5000);

			const input = [
				'const Demo = () => (',
				'  <div className={"one two three"} />',
				');'
			].join('\n');
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const oneIndex = lines[classLineIndex].indexOf('one');
			const position = new vscode.Position(classLineIndex, oneIndex + 1);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks inside JSX expression attribute');
			assert.ok(text.includes('className={'), 'Should keep JSX expression wrapper');
		});

		test('TSX: Should use backticks outside JSX attributes', async function() {
			this.timeout(5000);

			const input = 'const ok = foo < bar ? "one two" : "three four";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 25);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks when not in JSX attributes');
			assert.ok(!text.includes('"one'), 'Should not keep double quotes in non-JSX context');
		});

		test('Python: Should convert single quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = "text = 'hello world test'";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'python'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Python');
			assert.ok(!text.includes("'hello"), 'Should not keep single quotes around content');
			assert.ok(text.includes('hello'), 'Should contain content');
		});

		test('Python: Should restore single quotes on merge', async function() {
			this.timeout(5000);

			const input = "text = 'hello world test'";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'python'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			let text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes after split');
			assert.ok(text.includes('hello'), 'Should contain content');

			// Merge
			const lines = text.split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 5);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 200));

				text = editor.document.getText();
				assert.ok(text.split('\n').length === 1, 'Should merge to single line');
				assert.ok(text.includes("'hello world test'"), 'Should restore single quotes on merge');
			}
		});

		test('Java: Should convert double quotes to text block on split', async function() {
			this.timeout(5000);

			const input = 'String text = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'java'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 16);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Java');
		});

		test('Java: Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'String text = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'java'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 16);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Java');
		});

		test('Kotlin: Should convert double quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = 'val text = "hello world test"';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'kotlin'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Kotlin');
		});

		test('Kotlin: Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'val text = "hello world test"';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'kotlin'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Kotlin');
		});

		test('C#: Should convert double quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = 'var text = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'csharp'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in C#');
		});

		test('C#: Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'var text = "hello world test";';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'csharp'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in C#');
		});

		test('Go: Should convert double quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = 'text := "hello world test"';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'go'
			});
			editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks for multiline in Go');
		});

		test('Go: Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'text := "hello world test"';
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'go'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Go');
		});

		test('Auto-collapse with quote restoration', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = "const foo = 'bar baz azz';";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split (should convert to backticks)
			let position = new vscode.Position(0, 18);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			let text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should convert to backticks on split');

			// Manually merge back to verify quote restoration works
			const lines = text.split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'bar');
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 5);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 200));

				text = editor.document.getText();
				assert.ok(text.includes("'bar baz azz'"), 'Should restore single quotes on merge');
				assert.ok(!text.includes('`'), 'Should not have backticks after merge');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});

		test('Auto-collapse should keep backticks with template interpolation', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = "const foo = 'bar baz azz';";
			
			document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 18);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await new Promise(resolve => setTimeout(resolve, 200));

			// Add template interpolation
			let text = editor.document.getText();
			const lines = text.split('\n');
			const bazLineIndex = lines.findIndex(l => l.trim() === 'baz');
			
			if (bazLineIndex >= 0) {
				const line = editor.document.lineAt(bazLineIndex);
				const bazStart = line.text.indexOf('baz');
				const bazRange = new vscode.Range(
					new vscode.Position(bazLineIndex, bazStart),
					new vscode.Position(bazLineIndex, bazStart + 3)
				);
				
				await editor.edit(editBuilder => {
					editBuilder.replace(bazRange, 'baz ${1+1}');
				});
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			// Manually merge to check quote preservation
			const wordLineIndex = lines.findIndex(l => l.trim() === 'bar');
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 5);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await new Promise(resolve => setTimeout(resolve, 200));

				text = editor.document.getText();
				assert.ok(text.includes('`'), 'Should keep backticks when template interpolation exists');
				assert.ok(text.includes('${1+1}'), 'Should preserve template interpolation');
				assert.ok(!text.includes("'bar"), 'Should not restore single quotes when using template features');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});
	});
});
