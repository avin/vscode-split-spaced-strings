import * as vscode from 'vscode';

async function testEnterOnLastLine() {
	// Enable setting
	const config = vscode.workspace.getConfiguration('splitSpacedStrings');
	await config.update('autoCollapseOnSave', true, vscode.ConfigurationTarget.Global);

	// Create test document
	const input = 'const x = "one two three";';
	const document = await vscode.workspace.openTextDocument({
		content: input,
		language: 'typescript'
	});
	const editor = await vscode.window.showTextDocument(document);

	console.log('=== STEP 1: Split string ===');
	let position = new vscode.Position(0, 15);
	editor.selection = new vscode.Selection(position, position);
	await vscode.commands.executeCommand('split-spaced-strings.toggleSplit');
	await new Promise(resolve => setTimeout(resolve, 200));

	let text = editor.document.getText();
	console.log('After split:\n', text);
	console.log('Lines:', text.split('\n').length);

	console.log('\n=== STEP 2: Find last line with closing quote ===');
	const lines = text.split('\n');
	lines.forEach((line, i) => console.log(`Line ${i}: "${line}"`));
	
	const lastLineIndex = lines.findIndex(l => l.trim() === '"' || (l.includes('"') && l.trim().startsWith('"')));
	console.log('Last line index:', lastLineIndex);
	
	if (lastLineIndex >= 0) {
		const quoteLine = lines[lastLineIndex];
		console.log('Quote line:', quoteLine);
		const quotePos = quoteLine.indexOf('"');
		console.log('Quote position:', quotePos);
		
		console.log('\n=== STEP 3: Insert newline before closing quote ===');
		position = new vscode.Position(lastLineIndex, quotePos);
		editor.selection = new vscode.Selection(position, position);
		
		await editor.edit(editBuilder => {
			editBuilder.insert(position, '\n  ');
		});
		await new Promise(resolve => setTimeout(resolve, 300));
		
		text = editor.document.getText();
		console.log('\nAfter Enter:\n', text);
		console.log('Lines:', text.split('\n').length);
	}

	await config.update('autoCollapseOnSave', false, vscode.ConfigurationTarget.Global);
	await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('test.enterOnLastLine', testEnterOnLastLine);
	context.subscriptions.push(disposable);
}

export function deactivate() {}
