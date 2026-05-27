import http from "http";

http.get("http://localhost:3000/src/App.tsx", (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log("Status App.tsx:", res.statusCode);
    if (res.statusCode !== 200) {
      console.log(data);
    } else {
      console.log("Success fetching App.tsx, lengths is: ", data.length);
    }
  });
}).on("error", (err) => {
  console.log("Error:", err.message);
});
