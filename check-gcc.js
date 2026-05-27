import { execSync } from "child_process";
try {
  console.log("g++ version:", execSync("g++ --version", { encoding: "utf-8" }));
} catch(e) {
  console.log("g++ not found");
}
try {
  console.log("gcc version:", execSync("gcc --version", { encoding: "utf-8" }));
} catch(e) {
  console.log("gcc not found");
}
