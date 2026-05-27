import { JSDOM } from "jsdom";
import http from "http";

// Need to make a proper request and execute the scripts
JSDOM.fromURL("http://localhost:3000/", {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  dom.window.addEventListener("error", (event) => {
    console.log("JSDOM Error Caught:", event.error ? event.error.message : event.message);
    if (event.error && event.error.stack) {
       console.log(event.error.stack);
    }
  });

  dom.window.addEventListener("unhandledrejection", (event) => {
     console.log("JSDOM Unhandled Rejection:", event.reason);
  });

  setTimeout(() => {
    console.log("Body innerHTML after 2s:");
    console.log(dom.window.document.body.innerHTML.substring(0, 500));
    
    // Check if there's any rendered content
    const root = dom.window.document.getElementById("root");
    console.log("Root content length:", root ? root.innerHTML.length : "NO ROOT");
    
    process.exit(0);
  }, 2000);
}).catch(err => {
  console.log("JSDOM setup error:", err);
});
