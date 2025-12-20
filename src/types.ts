import * as vscode from 'vscode';

export interface StringInfo {
	start: vscode.Position;
	end: vscode.Position;
	quote: string;
	content: string;
	isMultiline: boolean;
	originalQuote?: string;
}

export interface TrackedString {
	uri: string;
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
	quote: string;
	content: string;
	contentHash: string;
	originalQuote?: string;
}

export interface QuoteRules {
	multilineQuotes: string[];
	preferredMultilineQuote: string;
	hasSpecialFeatures: (content: string, quote: string) => boolean;
	allowsMultilineInRegularQuotes: boolean;
}
