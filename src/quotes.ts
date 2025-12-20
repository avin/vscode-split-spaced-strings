import * as vscode from 'vscode';
import { QuoteRules, StringInfo } from './types';

export function getQuoteRules(languageId: string): QuoteRules {
	switch (languageId) {
		case 'javascript':
		case 'typescript':
		case 'javascriptreact':
		case 'typescriptreact':
			return {
				multilineQuotes: ['`'],
				preferredMultilineQuote: '`',
				hasSpecialFeatures: (content: string, quote: string) => {
					if (quote === '`') {
						return /\$\{[^}]*\}/.test(content);
					}
					return false;
				},
				allowsMultilineInRegularQuotes: false
			};
		case 'python':
			return {
				multilineQuotes: ['"""', "'''"],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string) => /\{[^}]*\}/.test(content),
				allowsMultilineInRegularQuotes: false
			};
		case 'csharp':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string) => /\{[^}]*\}/.test(content),
				allowsMultilineInRegularQuotes: false
			};
		case 'go':
			return {
				multilineQuotes: ['`'],
				preferredMultilineQuote: '`',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: false
			};
		case 'ruby':
			return {
				multilineQuotes: ['"', "'"],
				preferredMultilineQuote: '"',
				hasSpecialFeatures: (content: string) => /#\{[^}]*\}/.test(content),
				allowsMultilineInRegularQuotes: true
			};
		case 'java':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: false
			};
		case 'kotlin':
			return {
				multilineQuotes: ['"""'],
				preferredMultilineQuote: '"""',
				hasSpecialFeatures: (content: string) => /\$\{[^}]*\}/.test(content),
				allowsMultilineInRegularQuotes: false
			};
		case 'php':
			return {
				multilineQuotes: ['"'],
				preferredMultilineQuote: '"',
				hasSpecialFeatures: (content: string) => /\$[a-zA-Z_]/.test(content),
				allowsMultilineInRegularQuotes: true
			};
		default:
			return {
				multilineQuotes: [],
				preferredMultilineQuote: '"',
				hasSpecialFeatures: () => false,
				allowsMultilineInRegularQuotes: true
			};
	}
}

export function resolveLanguageId(document: vscode.TextDocument, stringInfo?: StringInfo): string {
	const languageId = document.languageId;
	if (languageId !== 'plaintext' || !stringInfo) {
		return languageId;
	}

	const lineText = document.lineAt(stringInfo.start.line).text;
	const beforeString = lineText.substring(0, stringInfo.start.character);
	if (/\b(val|var)\b/.test(beforeString)) {
		return 'kotlin';
	}

	return languageId;
}

export function getMultilineQuote(languageId: string, originalQuote: string, isJSXAttr: boolean): string {
	if (isJSXAttr) {
		return originalQuote;
	}

	const rules = getQuoteRules(languageId);
	if (rules.multilineQuotes.length === 0 || rules.allowsMultilineInRegularQuotes) {
		return originalQuote;
	}

	return rules.preferredMultilineQuote;
}

export function shouldRestoreOriginalQuote(
	languageId: string,
	content: string,
	currentQuote: string,
	originalQuote: string | undefined
): boolean {
	if (!originalQuote || originalQuote === currentQuote) {
		return false;
	}

	const rules = getQuoteRules(languageId);
	if (rules.hasSpecialFeatures(content, currentQuote)) {
		return false;
	}

	return true;
}
