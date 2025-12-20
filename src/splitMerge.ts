import * as vscode from 'vscode';
import { getMultilineQuote, resolveLanguageId, shouldRestoreOriginalQuote } from './quotes';
import { isInJSXAttribute } from './jsx';
import { StringInfo } from './types';

export function splitString(stringInfo: StringInfo, document: vscode.TextDocument): string {
	const words = stringInfo.content.trim().split(/\s+/);
	const lineText = document.lineAt(stringInfo.start.line).text;
	const lineIndent = lineText.substring(0, lineText.length - lineText.trimStart().length);
	const additionalIndent = '  ';

	const isJSXAttr = isInJSXAttribute(document, stringInfo.start);
	const languageId = resolveLanguageId(document, stringInfo);
	const multilineQuote = getMultilineQuote(languageId, stringInfo.quote, isJSXAttr);

	if (multilineQuote !== stringInfo.quote) {
		stringInfo.originalQuote = stringInfo.quote;
	}

	let result = multilineQuote + '\n';
	words.forEach((word) => {
		result += lineIndent + additionalIndent + word + '\n';
	});
	result += lineIndent + multilineQuote;

	return result;
}

export function mergeString(stringInfo: StringInfo, document: vscode.TextDocument): string {
	const content = stringInfo.content
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join(' ');

	let finalQuote = stringInfo.quote;
	const languageId = resolveLanguageId(document, stringInfo);
	if (shouldRestoreOriginalQuote(languageId, content, stringInfo.quote, stringInfo.originalQuote)) {
		finalQuote = stringInfo.originalQuote!;
	}

	return finalQuote + content + finalQuote;
}
