import axios from "axios";

async function testBackend() {
  try {
    const res = await axios.post("http://localhost:3000/api/run", {
      code: "#include <iostream>\nint main(){std::cout<<\"working!\\n\";return 0;}"
    });
    console.log(res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
testBackend();
