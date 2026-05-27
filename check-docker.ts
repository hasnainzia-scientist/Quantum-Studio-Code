import { exec } from "child_process";
exec("docker --version", (err, stdout, stderr) => {
    if (err) {
        console.log("docker not found");
    } else {
        console.log(stdout);
    }
});
