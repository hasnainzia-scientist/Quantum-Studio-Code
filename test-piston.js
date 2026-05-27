import axios from "axios";

async function testPiston() {
  try {
    const res = await axios.post("https://emkc.org/api/v2/piston/execute", {
      language: "cpp",
      version: "10.2.0",
      files: [{ content: "#include <iostream>\nint main() { std::cout << \"Hello from piston\\n\"; return 0; }" }]
    });
    console.log(res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
testPiston();
