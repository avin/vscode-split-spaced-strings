import * as assert from 'assert';
import * as vscode from 'vscode';
import { testToggle, cleanupEditor } from './test-helpers';

suite('Basic Toggle Tests', () => {
	vscode.window.showInformationMessage('Running basic toggle tests');

	teardown(async () => {
		await cleanupEditor();
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
			
			await cleanupEditor();
			
			// Test second string
			const result2 = await testToggle(input, 0, 38);
			assert.ok(result2.includes('foo') && result2.includes('bar'), 'Should split second string');
		});

		test('Should toggle back and forth correctly', async () => {
			const input = 'const x = "one two three";';
			
			// First toggle - split
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			const editor = await vscode.window.showTextDocument(document);
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			const afterSplit = editor.document.getText();
			
			assert.ok(afterSplit.split('\n').length > 1, 'Should be multiline after split');
			
			// Second toggle - merge back
			position = new vscode.Position(1, 3); // Inside "one"
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			const afterMerge = editor.document.getText();
			
			assert.ok(afterMerge.includes('one two three'), 'Should merge back with spaces');
			assert.strictEqual(afterMerge.split('\n').length, 1, 'Should be single line after merge');
		});
	});
});
