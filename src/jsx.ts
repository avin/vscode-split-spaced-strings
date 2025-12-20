import * as vscode from 'vscode';
import * as ts from 'typescript';

export function isInJSXAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
	const languageId = document.languageId;
	if (languageId !== 'javascriptreact' && languageId !== 'typescriptreact') {
		return false;
	}

	const scriptKind = languageId === 'typescriptreact'
		? ts.ScriptKind.TSX
		: ts.ScriptKind.JSX;

	const sourceFile = ts.createSourceFile(
		document.fileName,
		document.getText(),
		ts.ScriptTarget.Latest,
		true,
		scriptKind
	);

	const offset = document.offsetAt(position);
	const node = findNodeAtOffset(sourceFile, offset);
	if (!node || !ts.isStringLiteral(node)) {
		return false;
	}

	const parent = node.parent;
	return !!(parent && ts.isJsxAttribute(parent) && parent.initializer === node);
}

function findNodeAtOffset(sourceFile: ts.SourceFile, offset: number): ts.Node | null {
	let result: ts.Node | null = null;

	const visit = (node: ts.Node): void => {
		const start = node.getStart(sourceFile, false);
		const end = node.getEnd();
		if (offset < start || offset >= end) {
			return;
		}

		result = node;
		node.forEachChild(visit);
	};

	visit(sourceFile);
	return result;
}
