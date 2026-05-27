let hoverProviderRegistered = false;

export const defineMonacoThemes = (monaco: any) => {
  if (!hoverProviderRegistered) {
    hoverProviderRegistered = true;
    monaco.languages.registerHoverProvider('cpp', {
      provideHover: function (model: any, position: any) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const concepts: Record<string, string> = {
          'std': 'Standard C++ namespace containing standard library features like `cout`, `string`, `vector`, etc.',
          'cout': 'Standard output stream object in C++ used for printing data (characters, numbers, etc.) to the console.',
          'cin': 'Standard input stream object in C++ used for reading data from the console.',
          'endl': 'Inserts a new-line character (**\\n**) and flushes the stream.',
          'string': 'C++ standard library string class representing a sequence of characters.',
          'vector': 'C++ standard library dynamic array container that can dynamically change its size.',
          'map': 'C++ standard library associative container that stores key-value pairs with unique keys.',
          'int': 'Integer data type (typically 32 bits), storing whole numbers.',
          'float': 'Single-precision floating-point data type.',
          'double': 'Double-precision floating-point data type.',
          'char': 'Character data type, storing a single character like `\'a\'`.',
          'void': 'Specifies that a function does not return a value.',
          'class': 'User-defined data type representing an object with attributes and methods.',
          'struct': 'Similar to class, but members are public by default.',
          'return': 'Terminates execution of the current function and optionally returns a value.'
        };
        const description = concepts[word.word];
        if (description) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${word.word}**` },
              { value: description }
            ]
          };
        }
        return null;
      }
    });
  }

  monaco.editor.defineTheme('quantum-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'string.include', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ff7b72' },
      { token: 'identifier', foreground: 'c9d1d9' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'predefined', foreground: 'ff7b72' }
    ],
    colors: {
      'editorError.foreground': '#ff7b72',
      'editorWarning.foreground': '#d29922',
      'editorInfo.foreground': '#58a6ff',
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#484f58',
      'editorCursor.foreground': '#58a6ff',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
    }
  });

  monaco.editor.defineTheme('quantum-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e' },
      { token: 'string', foreground: '0a3069' },
      { token: 'string.include', foreground: '0a3069' },
      { token: 'number', foreground: '0550ae' },
      { token: 'type', foreground: 'cf222e' },
      { token: 'identifier', foreground: '24292f' },
      { token: 'function', foreground: '8250df' },
      { token: 'predefined', foreground: 'cf222e' }
    ],
    colors: {
      'editorError.foreground': '#cf222e',
      'editorWarning.foreground': '#9a6700',
      'editorInfo.foreground': '#0969da',
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'editorLineNumber.foreground': '#8c959f',
      'editorCursor.foreground': '#0969da',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#b3d4fc',
      'editorIndentGuide.background': '#d0d7de',
      'editorIndentGuide.activeBackground': '#8c959f',
    }
  });
};
