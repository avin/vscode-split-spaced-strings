import * as assert from 'assert';
import * as vscode from 'vscode';
import { wait, cleanupEditor } from './test-helpers';

suite('Smart Quotes', function() {
	teardown(async () => {
		await cleanupEditor();
	});

	suite('JavaScript', () => {
		test('Should convert single quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks after split');
			assert.ok(!text.includes("'hello"), 'Should not have single quotes around content');
		});

		test('Should restore single quotes on merge (no template features)', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			await wait(200);

			text = editor.document.getText();
			assert.ok(text.includes("'hello world test'"), 'Should restore single quotes on merge');
			assert.ok(!text.includes('`'), 'Should not have backticks after merge');
		});

		test('Should keep backticks when using template interpolation', async function() {
			this.timeout(5000);

			const input = "const x = 'hello world test';";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split to backticks
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			await wait(200);

			// Now merge - should keep backticks
			position = new vscode.Position(worldLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should keep backticks when template interpolation is used');
			assert.ok(text.includes('${1+1}'), 'Should preserve template interpolation');
		});
	});

	suite('TypeScript', () => {
		test('Should convert double quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = 'const x = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks after split');
			assert.ok(!text.includes('"hello'), 'Should not have double quotes around content');
		});

		test('Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'const x = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescript'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 15);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			// Merge back
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge');
		});
	});

	suite('TSX/JSX', () => {
		test('TSX: Should keep double quotes in JSX attributes', async function() {
			this.timeout(5000);

			const input = '<div className="flex items-center gap-4 p-6">test</div>';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 20);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const quoteIndex = lines[classLineIndex].indexOf('"');
			const position = new vscode.Position(classLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const valueLineIndex = lines.findIndex(l => l.includes('"one two three"'));
			const quoteIndex = lines[valueLineIndex].indexOf('"');
			const position = new vscode.Position(valueLineIndex, quoteIndex + 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const lines = input.split('\n');
			const classLineIndex = lines.findIndex(l => l.includes('className='));
			const oneIndex = lines[classLineIndex].indexOf('one');
			const position = new vscode.Position(classLineIndex, oneIndex + 1);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks inside JSX expression attribute');
			assert.ok(text.includes('className={'), 'Should keep JSX expression wrapper');
		});

		test('TSX: Should use backticks outside JSX attributes', async function() {
			this.timeout(5000);

			const input = 'const ok = foo < bar ? "one two" : "three four";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'typescriptreact'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 25);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks when not in JSX attributes');
			assert.ok(!text.includes('"one'), 'Should not keep double quotes in non-JSX context');
		});
	});

	suite('Python', () => {
		test('Should convert single quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = "text = 'hello world test'";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'python'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Python');
			assert.ok(!text.includes("'hello"), 'Should not keep single quotes around content');
			assert.ok(text.includes('hello'), 'Should contain content');
		});

		test('Should restore single quotes on merge', async function() {
			this.timeout(5000);

			const input = "text = 'hello world test'";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'python'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
				await wait(200);

				text = editor.document.getText();
				assert.ok(text.split('\n').length === 1, 'Should merge to single line');
				assert.ok(text.includes("'hello world test'"), 'Should restore single quotes on merge');
			}
		});
	});

	suite('Java', () => {
		test('Should convert double quotes to text block on split', async function() {
			this.timeout(5000);

			const input = 'String text = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'java'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 16);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Java');
		});

		test('Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'String text = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'java'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 16);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Java');
		});
	});

	suite('Kotlin', () => {
		test('Should convert double quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = 'val text = "hello world test"';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'kotlin'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in Kotlin');
		});

		test('Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'val text = "hello world test"';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'kotlin'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Kotlin');
		});
	});

	suite('C#', () => {
		test('Should convert double quotes to triple quotes on split', async function() {
			this.timeout(5000);

			const input = 'var text = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'csharp'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"""'), 'Should use triple quotes for multiline in C#');
		});

		test('Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'var text = "hello world test";';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'csharp'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 13);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in C#');
		});
	});

	suite('Go', () => {
		test('Should convert double quotes to backticks on split', async function() {
			this.timeout(5000);

			const input = 'text := "hello world test"';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'go'
			});
			const editor = await vscode.window.showTextDocument(document);

			const position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should use backticks for multiline in Go');
		});

		test('Should restore double quotes on merge', async function() {
			this.timeout(5000);

			const input = 'text := "hello world test"';
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'go'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 12);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			// Merge
			const lines = editor.document.getText().split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'hello');
			position = new vscode.Position(wordLineIndex, 5);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			const text = editor.document.getText();
			assert.ok(text.includes('"hello world test"'), 'Should restore double quotes on merge in Go');
		});
	});

	suite('Auto-collapse with quotes', () => {
		test('Auto-collapse with quote restoration', async function() {
			this.timeout(5000);
			
			const config = vscode.workspace.getConfiguration('splitSpacedStrings');
			await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

			const input = "const foo = 'bar baz azz';";
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split (should convert to backticks)
			let position = new vscode.Position(0, 18);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

			let text = editor.document.getText();
			assert.ok(text.includes('`'), 'Should convert to backticks on split');

			// Manually merge back to verify quote restoration works
			const lines = text.split('\n');
			const wordLineIndex = lines.findIndex(l => l.trim() === 'bar');
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 5);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await wait(200);

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
			
			const document = await vscode.workspace.openTextDocument({
				content: input,
				language: 'javascript'
			});
			const editor = await vscode.window.showTextDocument(document);

			// Split
			let position = new vscode.Position(0, 18);
			editor.selection = new vscode.Selection(position, position);
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(200);

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
				await wait(200);
			}

			// Manually merge to check quote preservation
			const wordLineIndex = lines.findIndex(l => l.trim() === 'bar');
			if (wordLineIndex >= 0) {
				position = new vscode.Position(wordLineIndex, 5);
				editor.selection = new vscode.Selection(position, position);
				await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
				await wait(200);

				text = editor.document.getText();
				assert.ok(text.includes('`'), 'Should keep backticks when template interpolation exists');
				assert.ok(text.includes('${1+1}'), 'Should preserve template interpolation');
				assert.ok(!text.includes("'bar"), 'Should not restore single quotes when using template features');
			}

			await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
		});
	});
});
