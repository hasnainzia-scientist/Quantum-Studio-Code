import cf from "clang-format";
import { execFile } from "child_process";
import fs from "fs";

const code = "int main(){return 0;}";
const child = execFile(cf.getNativeBinary(), [], (err, stdout, stderr) => {
  console.log("OUT:", stdout);
});
child.stdin.write(code);
child.stdin.end();
