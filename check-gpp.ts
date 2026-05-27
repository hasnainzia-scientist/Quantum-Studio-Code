import { exec } from "child_process";
exec("g++ --version", (err, stdout, stderr) => {
    if (err) {
        console.log("g++ not found");
    } else {
        console.log(stdout);
    }
});
