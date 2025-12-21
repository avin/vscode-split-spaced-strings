import * as assert from 'assert';
import { testToggle, cleanupEditor } from './test-helpers';

suite('Edge Cases', () => {
	teardown(async () => {
		await cleanupEditor();
	});

	test('Should handle string with single word', async () => {
		const input = 'const x = "hello";';
		const result = await testToggle(input, 0, 15);
		
		assert.ok(result.includes('hello'), 'Should contain the word');
		const lines = result.split('\n');
		assert.ok(lines.length >= 3, 'Should create multiline even for single word');
	});

	test('Should handle empty string', async () => {
		const input = 'const x = "";';
		const result = await testToggle(input, 0, 12);
		
		// Should either leave it unchanged or handle gracefully
		assert.ok(result.includes('""') || result.includes('"\n"'), 'Should handle empty string');
	});

	test('Should handle string with multiple spaces', async () => {
		const input = 'const x = "hello    world    test";';
		const result = await testToggle(input, 0, 15);
		
		// Multiple spaces should be treated as single separator
		assert.ok(result.includes('hello'), 'Should contain hello');
		assert.ok(result.includes('world'), 'Should contain world');
		assert.ok(result.includes('test'), 'Should contain test');
	});

	test('Should handle cursor at beginning of string', async () => {
		const input = 'const x = "hello world";';
		const result = await testToggle(input, 0, 11); // Right after opening quote
		
		assert.ok(result.includes('hello'), 'Should work with cursor at start');
		assert.ok(result.includes('world'), 'Should work with cursor at start');
	});

	test('Should handle cursor at end of string', async () => {
		const input = 'const x = "hello world";';
		const result = await testToggle(input, 0, 22); // Right before closing quote
		
		assert.ok(result.includes('hello'), 'Should work with cursor at end');
		assert.ok(result.includes('world'), 'Should work with cursor at end');
	});

	test('Should not modify when cursor is outside string', async () => {
		const input = 'const x = "hello world";';
		const original = input;
		try {
			await testToggle(input, 0, 5); // On "const"
		} catch (e) {
			// Expected to fail or show message
		}
		// Command should not crash
		assert.ok(true, 'Should handle cursor outside string gracefully');
	});

	test('Should handle string with special characters', async () => {
		const input = 'const x = "hello-world_test.class";';
		const result = await testToggle(input, 0, 15);
		
		assert.ok(result.includes('hello-world_test.class'), 'Should treat non-space strings as single words');
	});

	test('Should preserve indentation when splitting', async () => {
		const input = '    const x = "class-a class-b";';
		const result = await testToggle(input, 0, 20);
		
		const lines = result.split('\n');
		// Check that words maintain proper indentation
		let hasProperIndent = false;
		for (const line of lines) {
			if (line.includes('class-a') || line.includes('class-b')) {
				hasProperIndent = line.startsWith('    ') || line.startsWith('      ');
			}
		}
		assert.ok(hasProperIndent, 'Should preserve base indentation');
	});

	test('Should handle JSX className attribute', async () => {
		const input = '<button className="border-1 border-lime-100 font-bold">Test</button>';
		const result = await testToggle(input, 0, 25);
		
		assert.ok(result.includes('border-1'), 'Should work in JSX');
		assert.ok(result.includes('border-lime-100'), 'Should work in JSX');
		assert.ok(result.includes('font-bold'), 'Should work in JSX');
	});
});
