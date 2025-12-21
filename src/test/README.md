# Test Structure

This directory contains all tests for the Split Spaced Strings extension, organized by functionality.

## Test Files

### `test-helpers.ts`
Common helper functions used across all test files:
- `testToggle()` - Helper to create a document and execute the toggle command
- `testCursorPosition()` - Helper to test cursor position after toggle
- `cleanupEditor()` - Teardown function to close active editor
- `wait()` - Helper to wait for async operations

### `basic-toggle.test.ts`
Tests for basic split/merge functionality:
- Double quote strings
- Single quote strings
- Template literal strings
- Real-world cases (Tailwind CSS classes, mixed quotes)
- Toggle back and forth

### `edge-cases.test.ts`
Tests for edge cases and boundary conditions:
- Single word strings
- Empty strings
- Multiple spaces
- Cursor positions (beginning, end, outside string)
- Special characters
- Indentation preservation
- JSX className attributes

### `cursor-position.test.ts`
Tests for cursor position preservation:
- Cursor in middle/start/end of words
- Repeated words
- Merging from multiline
- Cursor in spaces between words
- Double toggle (split then merge)
- Special characters in words

### `auto-collapse.test.ts`
Tests for auto-collapse on save feature:
- Basic auto-collapse functionality
- Decoration clearing
- Disabled setting behavior
- Multiple split strings tracking
- Manual merge and tracking removal
- Split/merge cycles
- Edge cases (pressing Enter, multiple strings on same line, editing content)

### `smart-quotes.test.ts`
Tests for smart quote selection based on language:
- **JavaScript**: Single quotes ↔ backticks, template interpolation preservation
- **TypeScript**: Double quotes ↔ backticks
- **TSX/JSX**: Double quotes preservation in JSX attributes, backticks in expressions
- **Python**: Single quotes ↔ triple quotes
- **Java**: Double quotes ↔ text blocks (triple quotes)
- **Kotlin**: Double quotes ↔ triple quotes
- **C#**: Double quotes ↔ raw string literals (triple quotes)
- **Go**: Double quotes ↔ backticks
- Auto-collapse with quote restoration

### `multiple-strings.test.ts`
Tests for handling multiple strings:
- Two different strings
- Two identical strings
- Editing one of multiple identical strings
- Three different strings
- Independent tracking

## Running Tests

Tests can be run using the VS Code Extension Test Runner or via npm:

```bash
npm test
```

## Test Coverage

All tests from the original `extension.test.ts` have been preserved and organized into logical groups. No tests were lost during the reorganization.
