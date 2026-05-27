import axios from "axios";

export interface SimplifiedError {
  line?: string;
  codeSnippet?: string;
  explanation?: string;
  suggestion?: string;
}

export interface ExecutionResult {
  compile: {
    output: string;
    error?: boolean;
    simplifiedError?: SimplifiedError;
  };
  run: {
    output: string;
    stdout: string;
    stderr: string;
    code: number;
    signal?: string;
  };
  language: string;
  version: string;
}

export const executeCode = async (
  code: string,
  input: string,
  codes: { file: string; code: string; }[] = []
): Promise<ExecutionResult> => {
  const response = await axios.post("/api/run", { code, input, codes });
  return response.data;
};

export const lintCode = async (
  code: string,
  codes: { file: string; code: string; }[] = []
): Promise<{ output: string }> => {
  const response = await axios.post("/api/lint", { code, codes });
  return response.data;
};

export const formatCode = async (code: string): Promise<string> => {
  const response = await axios.post("/api/format", { code });
  return response.data.formatted;
};
