import * as assert from 'assert';
import * as vscode from 'vscode';
import { __test__ } from '../extension';
import { wait, cleanupEditor } from './test-helpers';

suite('Auto-Collapse on Save', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should auto-collapse split strings when saving with setting enabled', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "flex items-center justify-between";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const afterSplit = editor.document.getText();
		assert.ok(afterSplit.split('\n').length > 3, 'Should be multiline after split');

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});

	test('Should clear decorations after auto-collapse on save', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "one two three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

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

		await wait(50);

		const rangesAfterCollapse = __test__.getLastDecorationRanges();
		assert.strictEqual(rangesAfterCollapse.length, 0, 'Should clear decorations after auto-collapse');

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});

	test('Should NOT auto-collapse when setting is disabled', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);

		const input = 'const x = "one two three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		const afterSplit = editor.document.getText();
		const lineCountAfterSplit = afterSplit.split('\n').length;
		assert.ok(lineCountAfterSplit > 3, 'Should be multiline after split');
		
		const setting = config.get('autoCollapseOnSave');
		assert.strictEqual(setting, false, 'Setting should be disabled');
	});

	test('Should track multiple split strings', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "flex items-center";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		await wait(50);

		const afterSplit = editor.document.getText();
		assert.ok(afterSplit.includes('flex') && afterSplit.includes('items-center'), 
			'String should be split');
		assert.ok(afterSplit.split('\n').length > 2, 'Should be multiline');

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});

	test('Should manually merge string and remove from tracking', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "one two three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');

		await wait(100);
		
		let currentText = editor.document.getText();
		assert.ok(currentText.split('\n').length > 1, 'Should be multiline after split');
		
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

			await wait(100);

			const afterManualMerge = editor.document.getText();
			assert.ok(afterManualMerge.includes('one two three'), 
				'Should be merged back to single line with all words');
		}

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});

	test('Should verify tracking system can handle split/merge cycles', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "test one two";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 15);
		
		// Split
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);
		
		let text = editor.document.getText();
		assert.ok(text.split('\n').length > 1, 'Should be split');
		
		// Find word position and merge
		const lines = text.split('\n');
		let wordLine = lines.findIndex(l => l.includes('test') || l.includes('one'));
		if (wordLine >= 0) {
			editor.selection = new vscode.Selection(new vscode.Position(wordLine, 2), new vscode.Position(wordLine, 2));
			await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
			await wait(100);
		}
		
		text = editor.document.getText();
		assert.ok(text.includes('test one two'), 'Should be merged');
		
		// Split again
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);
		
		text = editor.document.getText();
		assert.ok(text.split('\n').length > 1, 'Should be split again');

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});
});

suite('Auto-Collapse Edge Cases', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should track string after pressing Enter inside it', async function() {
		this.timeout(5000);
		
		const config = vscode.workspace.getConfiguration('splitSpacedStrings');
		await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

		const input = 'const x = "one two three";';
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

		let text = editor.document.getText();
		const lines = text.split('\n');
		let wordLineIndex = lines.findIndex(l => l.trim() === 'one');
		
		if (wordLineIndex >= 0) {
			const lineLength = lines[wordLineIndex].length;
			position = new vscode.Position(wordLineIndex, lineLength);
			editor.selection = new vscode.Selection(position, position);
			
			await editor.edit(editBuilder => {
				editBuilder.insert(position, '\n');
			});
			await wait(200);
			
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(0, 33);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

		let text = editor.document.getText();
		let lines = text.split('\n');
		const lastLineIndex = lines.findIndex(l => l.includes('"') && l.trim().startsWith('"'));
		
		if (lastLineIndex >= 0) {
			const quoteLine = lines[lastLineIndex];
			const quotePos = quoteLine.indexOf('"');
			position = new vscode.Position(lastLineIndex, quotePos);
			editor.selection = new vscode.Selection(position, position);
			
			await editor.edit(editBuilder => {
				editBuilder.insert(position, '\n  ');
			});
			await wait(200);
			
			text = editor.document.getText();
			assert.ok(text.split('\n').length > 4, 'Should still be multiline after Enter on last line');
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 18);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(200);

		let text = editor.document.getText();
		assert.ok(text.includes('\n'), 'String should be split into multiple lines');
		
		let lines = text.split('\n');
		
		let closingQuoteLine = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '`;' || lines[i].trim() === '";') {
				closingQuoteLine = i;
				break;
			}
		}
		
		assert.ok(closingQuoteLine >= 0, 'Should find closing quote line');
		
		const linesBefore = lines.length;
		
		const lineLength = lines[closingQuoteLine].length;
		position = new vscode.Position(closingQuoteLine, lineLength);
		editor.selection = new vscode.Selection(position, position);
		
		await editor.edit(editBuilder => {
			editBuilder.insert(position, '\n');
		});
		await wait(200);
		
		text = editor.document.getText();
		lines = text.split('\n');
		assert.strictEqual(lines.length, linesBefore + 1, 'Should have one more line after Enter');
		
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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
		
		const document = await vscode.workspace.openTextDocument({
			content: input,
			language: 'typescript'
		});
		const editor = await vscode.window.showTextDocument(document);

		let position = new vscode.Position(0, 15);
		editor.selection = new vscode.Selection(position, position);
		await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
		await wait(100);

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
			await wait(200);
			
			text = editor.document.getText();
			assert.ok(text.includes('MODIFIED'), 'Should contain modified content');
			assert.ok(text.includes('one') && text.includes('three'), 'Should still have other words');
		}

		await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	});
});
