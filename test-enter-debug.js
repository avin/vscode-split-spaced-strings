"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
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
function activate(context) {
    const disposable = vscode.commands.registerCommand('test.enterOnLastLine', testEnterOnLastLine);
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=test-enter-debug.js.map