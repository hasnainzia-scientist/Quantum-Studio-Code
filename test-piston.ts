import axios from 'axios';

async function test() {
  try {
    const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language: "c++",
        version: "10.2.0",
        files: [
          {
            name: "main.cpp",
            content: "#include <iostream>\nint main(){ std::cout << \"Hello\" << std::endl; return 0; }",
          },
        ],
        stdin: "",
      });
      console.log("Success:", response.data);
  } catch (error: any) {
      console.log("Error:", error.response?.data || error.message);
  }
}

test();
