const error = "prog.cc:1:20: error: cannot initialize a variable of type 'char *' with an rvalue of type 'int'\n    1 | int main() { char *p = 5; return 0; }\n      |                    ^   ~\n1 error generated.\n";

function parseClangError(errOutput) {
  const lines = errOutput.split('\n');
  const errorMatch = errOutput.match(/(?:[^:]+):(\d+):(\d+):\s*(?:fatal )?error:\s*(.*)/);
  if (!errorMatch) return null;

  const lineNum = errorMatch[1];
  const explanation = errorMatch[3];
  
  // Try to find the code snippet and squiggles
  let codeSnippet = "";
  let suggestion = "Check the types of your variables or function arguments.";

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/\u001b\[.*?m/g, ''); // strip ansi
    // The code line usually starts with the line number or just spaces depending on clang formatting.
    // Actually Clang 18+ includes line number like `    1 | int main() { `
    if (text.includes(` ${lineNum} | `) || text.trim().startsWith(`${lineNum} |`)) { // wait clang outputs `    1 | int main()`
       let codeLine = lines[i].replace(/\u001b\[.*?m/g, '').split('|').slice(1).join('|').trim();
       codeSnippet = codeLine;
       break;
    }
  }
  
  return {
    line: \`Line \${lineNum}\`,
    codeSnippet: codeSnippet || "N/A",
    explanation: explanation || "Unknown logic error",
    suggestion: "Review the highlighted code carefully and ensure valid syntax/types."
  };
}

console.log(parseClangError(error));
