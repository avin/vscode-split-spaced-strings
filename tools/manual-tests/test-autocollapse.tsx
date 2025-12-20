// Test file for Split Spaced Strings extension with auto-collapse feature

import React from 'react';

// Example 1: Simple className string
export function Example1() {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <span>Test content</span>
    </div>
  );
}

// Example 2: Multiple strings in one component
export function Example2() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Title</h1>
      <p className="text-base text-gray-600 leading-relaxed">Paragraph</p>
    </div>
  );
}

// Example 3: Template literal
export function Example3() {
  const classes = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6`;
  return <div className={classes}>Content</div>;
}

// Instructions for testing:
// 1. Enable "splitSpacedStrings.autoCollapseOnSave": true in settings
// 2. Place cursor inside any string above
// 3. Press Alt+Shift+S to split the string
// 4. Notice the yellow highlighting on split strings
// 5. Save the file (Ctrl+S)
// 6. Split strings will automatically collapse back to single line
