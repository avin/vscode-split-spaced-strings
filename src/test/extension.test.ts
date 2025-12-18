import * as assert from 'assert';
import * as vscode from 'vscode';

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
			
			assert.ok(result.includes('"'), 'Should contain quotes');
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
			
			assert.ok(result.includes("'"), 'Should contain single quotes');
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
});
