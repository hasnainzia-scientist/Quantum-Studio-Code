import type { editor, languages } from "monaco-editor";
import { formatCode } from "./execute";

export function registerCppIntellisense(editorLib: any, getFiles: () => { name: string, content: string }[]) {
  const providers: any[] = [];

  // Register completion item provider
  providers.push(editorLib.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', ':', '>'],
    provideCompletionItems: (model: editor.ITextModel, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: languages.CompletionItem[] = [];
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      // Handle std:: completion
      if (textUntilPosition.endsWith('std::')) {
        const stdMembers = [
          // I/O
          'cout', 'cin', 'cerr', 'clog', 'endl', 'flush', 'ofstream', 'ifstream', 'fstream', 'stringstream', 'istringstream', 'ostringstream',
          // Containers
          'vector', 'string', 'wstring', 'string_view', 'map', 'unordered_map', 'multimap', 'unordered_multimap', 'set', 'unordered_set', 'multiset', 'unordered_multiset', 'array', 'deque', 'list', 'forward_list', 'stack', 'queue', 'priority_queue', 'tuple', 'pair', 'bitset', 'variant', 'optional', 'any', 'function',
          // Algorithms
          'find', 'sort', 'copy', 'move', 'swap', 'transform', 'accumulate', 'max', 'min', 'binary_search', 'count', 'count_if', 'find_if', 'remove', 'remove_if', 'reverse', 'fill', 'generate', 'all_of', 'any_of', 'none_of', 'lower_bound', 'upper_bound', 'distance', 'advance',
          // Memory
          'make_unique', 'make_shared', 'unique_ptr', 'shared_ptr', 'weak_ptr', 'allocator',
          // Concurrency
          'mutex', 'thread', 'future', 'async', 'promise', 'packaged_task', 'condition_variable', 'lock_guard', 'unique_lock', 'atomic',
          // Exceptions
          'exception', 'runtime_error', 'logic_error', 'invalid_argument', 'out_of_range', 'bad_alloc', 'bad_cast',
          // Math & Numeric
          'abs', 'pow', 'sqrt', 'sin', 'cos', 'tan', 'round', 'ceil', 'floor', 'numeric_limits',
          // Utilities
          'chrono', 'regex', 'hash', 'declval', 'initializer_list', 'size_t', 'ptrdiff_t', 'nullopt'
        ];
        stdMembers.forEach(mem => {
          suggestions.push({
            label: mem,
            kind: editorLib.languages.CompletionItemKind.Function,
            insertText: mem,
            documentation: `std::${mem}`,
            range
          });
        });
        return { suggestions };
      }

      // Handle object. method completions via basic heuristic
      if (textUntilPosition.endsWith('.')) {
        // very basic heuristics for vector and string methods
        // A complete C++ intellisense requires an AST, but we provide common standard methods.
        const commonMethods = [
          'push_back', 'pop_back', 'push_front', 'pop_front', 'emplace_back', 'emplace', 'insert', 'erase',
          'size', 'empty', 'clear', 'begin', 'end', 'rbegin', 'rend', 'cbegin', 'cend', 'capacity', 'reserve', 'shrink_to_fit',
          'length', 'substr', 'find', 'rfind', 'find_first_of', 'find_last_of', 'c_str', 'data', 'replace', 'append', 'compare',
          'top', 'push', 'pop', 'front', 'back', 'first', 'second', 'count', 'contains', 'find', 'at'
        ];
        commonMethods.forEach(mem => {
          suggestions.push({
            label: mem,
            kind: editorLib.languages.CompletionItemKind.Method,
            insertText: mem + '()',
            documentation: `Method: ${mem}()`,
            range
          });
        });
        return { suggestions };
      }

      // Handle pointer-> method completions
      if (textUntilPosition.endsWith('->')) {
        const commonMethods = [
          'push_back', 'pop_back', 'push_front', 'pop_front', 'emplace_back', 'emplace', 'insert', 'erase',
          'size', 'empty', 'clear', 'begin', 'end', 'rbegin', 'rend', 'cbegin', 'cend', 'capacity', 'reserve', 'shrink_to_fit',
          'length', 'substr', 'find', 'rfind', 'find_first_of', 'find_last_of', 'c_str', 'data', 'replace', 'append', 'compare',
          'top', 'push', 'pop', 'front', 'back', 'first', 'second', 'count', 'contains', 'find', 'at'
        ];
        commonMethods.forEach(mem => {
          suggestions.push({
            label: mem,
            kind: editorLib.languages.CompletionItemKind.Method,
            insertText: mem + '()',
            documentation: `Method: ${mem}()`,
            range
          });
        });
        return { suggestions };
      }

      // 1. Snippets
      suggestions.push({
        label: 'main',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: 'int main() {\n\t$0\n\treturn 0;\n}',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Main function boilerplate',
        range
      });
      suggestions.push({
        label: 'for',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ++${1:i}) {\n\t$0\n}',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop',
        range
      });
      suggestions.push({
        label: '#include <iostream>',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: '#include <iostream>\n',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Include iostream',
        range
      });
      suggestions.push({
        label: '#include <vector>',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: '#include <vector>\n',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Include vector',
        range
      });
      suggestions.push({
        label: '#include <string>',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: '#include <string>\n',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Include string',
        range
      });
      suggestions.push({
        label: 'class',
        kind: editorLib.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~${1:Name}();\nprivate:\n\t$0\n};',
        insertTextRules: editorLib.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Class boilerplate',
        range
      });

      // 2. Extra keywords
      const keywords = ['const', 'constexpr', 'virtual', 'override', 'public', 'private', 'protected', 'template', 'typename', 'auto', 'inline', 'static', 'nullptr', 'friend', 'explicit', 'noexcept', 'volatile', 'mutable', 'extern', 'final', 'decltype', 'sizeof', 'new', 'delete', 'try', 'catch', 'throw', 'typedef', 'using', 'namespace'];
      keywords.forEach(kw => {
        suggestions.push({
          label: kw,
          kind: editorLib.languages.CompletionItemKind.Keyword,
          insertText: kw,
          documentation: `Keyword: ${kw}`,
          range
        });
      });

      // 3. Document Symbols extraction (Variables, Functions, Classes)
      const files = getFiles();
      const uniqueSymbols = new Set<string>();
      
      files.forEach(file => {
        const text = file.content;
        
        // Extract functions
        const funcRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*|std::[a-zA-Z_][a-zA-Z0-9_]*)\s*\*?&\?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;
        while ((match = funcRegex.exec(text)) !== null) {
          const type = match[1];
          const name = match[2];
          if (name !== 'main' && !['if', 'for', 'while', 'switch', 'return', 'catch'].includes(name)) {
            if (!uniqueSymbols.has('func_' + name)) {
              uniqueSymbols.add('func_' + name);
              suggestions.push({
                label: name,
                kind: editorLib.languages.CompletionItemKind.Function,
                insertText: name,
                documentation: `Function: ${type} ${name}()`,
                range
              });
            }
          }
        }

        // Extract classes/structs/enums
        const classRegex = /\b(class|struct|enum(?:\s+class)?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        while ((match = classRegex.exec(text)) !== null) {
          const kindType = match[1];
          const name = match[2];
          if (!uniqueSymbols.has('class_' + name)) {
            uniqueSymbols.add('class_' + name);
            suggestions.push({
              label: name,
              kind: kindType === 'class' ? editorLib.languages.CompletionItemKind.Class : (kindType === 'struct' ? editorLib.languages.CompletionItemKind.Struct : editorLib.languages.CompletionItemKind.Enum),
              insertText: name,
              documentation: `${kindType}: ${name}`,
              range
            });
          }
        }

        // Extract using/typedef
        const typedefRegex = /\b(?:using\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=|typedef\s+[^;]+\s+([a-zA-Z_][a-zA-Z0-9_]*))\s*;/g;
        while ((match = typedefRegex.exec(text)) !== null) {
          const name = match[1] || match[2];
          if (!uniqueSymbols.has('type_' + name)) {
            uniqueSymbols.add('type_' + name);
            suggestions.push({
              label: name,
              kind: editorLib.languages.CompletionItemKind.Struct,
              insertText: name,
              documentation: `Type alias: ${name}`,
              range
            });
          }
        }

        // Extract variables (enhanced)
        // Match standard types, common user types (capitalized usually), pointer/references.
        const varRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*|std::[a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]+>)?\s*\*?&?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=;,\)]/g;
        while ((match = varRegex.exec(text)) !== null) {
          const type = match[1];
          const name = match[2];
          const badNames = ['return', 'const', 'if', 'else', 'while', 'for', 'switch', 'class', 'struct', 'enum', 'public', 'private', 'protected', 'virtual'];
          if (!badNames.includes(name) && !badNames.includes(type)) {
            if (!uniqueSymbols.has('var_' + name)) {
              uniqueSymbols.add('var_' + name);
              suggestions.push({
                label: name,
                kind: editorLib.languages.CompletionItemKind.Variable,
                insertText: name,
                documentation: `Variable: ${type} ${name}`,
                range
              });
            }
          }
        }
      });

      return { suggestions };
    }
  }));

  // Document Formatting Provider using our backend format API
  providers.push(editorLib.languages.registerDocumentFormattingEditProvider('cpp', {
    provideDocumentFormattingEdits: async (model: editor.ITextModel) => {
      try {
        const text = model.getValue();
        const formatted = await formatCode(text);
        if (formatted && formatted !== text) {
          return [{
            range: model.getFullModelRange(),
            text: formatted
          }];
        }
      } catch (err) {
        console.error("Format via provider failed", err);
      }
      return [];
    }
  }));

  // Hover Provider (Type Inference and Docs)
  providers.push(editorLib.languages.registerHoverProvider('cpp', {
    provideHover: async (model: editor.ITextModel, position: any) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // Provide immediate fallback regex logic if AI is slow
      const files = getFiles();
      let fallbackDesc = '';
      files.forEach(file => {
        const text = file.content;
        const funcRegex = new RegExp(`\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\*?&?\\s+(${word.word})\\s*\\(`, 'g');
        const funcMatch = funcRegex.exec(text);
        if (funcMatch) fallbackDesc = `**Function**\n\n\`${funcMatch[1]} ${word.word}()\``;
        else {
          const classRegex = new RegExp(`\\b(class|struct)\\s+(${word.word})\\b`, 'g');
          const classMatch = classRegex.exec(text);
          if (classMatch) fallbackDesc = `**${classMatch[1] === 'class' ? 'Class' : 'Struct'}**\n\n\`${classMatch[1]} ${word.word}\``;
        }
      });

      // Try fetching rich AI type inference
      const textUntilPosition = model.getValue();
      try {
        const res = await fetch('/api/hover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: textUntilPosition,
            word: word.word,
            line: position.lineNumber,
            column: position.column
          })
        });
        
        if (res.ok) {
           const data = await res.json();
           if (data.type && data.type !== 'unknown') {
              return {
                 range: new editorLib.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                 contents: [
                   { value: `\`\`\`cpp\n${data.type} ${word.word}\n\`\`\`` },
                   { value: data.description }
                 ]
              };
           }
        }
      } catch (e) {
         // ignore
      }

      if (fallbackDesc) {
        return {
          range: new editorLib.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [{ value: fallbackDesc }]
        };
      }
      return null;
    }
  }));

  // Inline Completions Provider for AI-powered suggestions
  providers.push(editorLib.languages.registerInlineCompletionsProvider('cpp', {
    provideInlineCompletions: async (model: editor.ITextModel, position: any, context: any, token: any) => {
      // We only want to trigger this when asked or when typing naturally, Monaco handles debounce.
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      if (textUntilPosition.trim().length === 0) return { items: [] };

      try {
        const response = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: textUntilPosition,
            line: position.lineNumber,
            column: position.column
          })
        });

        if (!response.ok) return { items: [] };
        
        const data = await response.json();
        const completion = data.completion;

        if (completion) {
          return {
            items: [{
              insertText: completion,
              range: new editorLib.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              )
            }]
          };
        }
      } catch (err) {
        console.error("AI Completion error:", err);
      }

      return { items: [] };
    },
    freeInlineCompletions: (completions: any) => {}
  }));

  return {
    dispose: () => {
      providers.forEach(p => p.dispose());
    }
  };
}
