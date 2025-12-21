import * as assert from 'assert';
import { testToggle, cleanupEditor } from './test-helpers';

suite('Cursor Outside String', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should not toggle when cursor is before JSX attribute value', async () => {
		const input = [
			'function TestMeButton() {',
			'  return (',
			'    <div>',
			'      <div className="flex flex-col md:flex-row items-center justify-between">',
			'        I love you',
			'      </div>',
			'      <div clasName="flex flex-col md:flex-row items-center justify-between gap-4 p-6 md:p-8 foo bg-white">',
			'        I love you++',
			'      </div>',
			'    </div>',
			'  );',
			'}'
		].join('\n');
		const lines = input.split('\n');
		const lineIndex = 6;
		const cursorChar = lines[lineIndex].indexOf('clasName') + 4;
		const result = await testToggle(input, lineIndex, cursorChar, 'typescriptreact');

		assert.strictEqual(result, input, 'Should not modify when cursor is outside the string');
	});

	test('Should not toggle when cursor is after JSX attribute value', async () => {
		const line = '<div className="foo bar">Hello</div>';
		const cursorChar = line.indexOf('>');
		const result = await testToggle(line, 0, cursorChar, 'typescriptreact');

		assert.strictEqual(result, line, 'Should not modify when cursor is after the attribute value');
	});

	test('Should not toggle when cursor is between separate strings on different lines', async () => {
		const input = [
			'const a = "first";',
			'const b = 123;',
			'const c = "second third";'
		].join('\n');
		const lines = input.split('\n');
		const lineIndex = 1;
		const cursorChar = lines[lineIndex].indexOf('b');
		const result = await testToggle(input, lineIndex, cursorChar, 'typescript');

		assert.strictEqual(result, input, 'Should not modify when cursor is on a non-string line');
	});

	test('Should not toggle when cursor is between strings on the same line', async () => {
		const input = 'const a = "first"; const b = "second third";';
		const cursorChar = input.indexOf('const b') + 2;
		const result = await testToggle(input, 0, cursorChar, 'typescript');

		assert.strictEqual(result, input, 'Should not modify when cursor is outside any string');
	});
});
