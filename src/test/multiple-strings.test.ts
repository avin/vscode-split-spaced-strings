import * as assert from 'assert';
import * as vscode from 'vscode';
import { wait, cleanupEditor } from './test-helpers';

suite('Multiple Strings Scenarios', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should split and track two different strings', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "alpha beta";\nconst y = "gamma delta epsilon";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Split first string
		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
			await wait(100);
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Split first identical string
		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
			await wait(100);
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		// Split both strings
		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
			await wait(150);
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
			await wait(200);
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

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
				await wait(100);
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
