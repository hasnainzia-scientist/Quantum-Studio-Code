import { execSync } from "child_process";
try {
  console.log("clang-format version:", execSync("clang-format --version", { encoding: "utf-8" }));
} catch(e) {
  console.log("clang-format not found");
}
