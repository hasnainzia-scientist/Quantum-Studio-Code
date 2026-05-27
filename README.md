# Online C++ IDE 

A production-ready Online C++ IDE built with React, Monaco Editor, Tailwind CSS, and Express. 

## Architecture 

- **Frontend**: React + Vite, Monaco Editor (VS Code Editor), Tailwind CSS.
- **Backend**: Express Server handles proxying and static file serving.
- **Execution Sandbox Layer**: 
  - For the provided implementation, we use the robust [Piston API](https://github.com/engineer-man/piston), a high-performance execution engine that utilizes Docker to sandbox code execution and prevent malicious system access, infinite loops, and memory abuse. 
  - To implement your own local Docker container sandbox directly using a local executor, use the `Dockerfile.sandbox` included in the root to create your own isolated containers where users' C++ code is executed.

## Features

- **VS Code Experience**: Integrates the official Monaco Editor.
- **Secure Code Execution**: Code is isolated.
- **Standard Input Configuration**: Send input over stdin.
- **Shortcuts**: `Ctrl+Enter` to run, `Ctrl+S` to save.
- **Night/Light Mode**: Full theme customization.
- **Save & Download**: Local storage persistence and download as `.cpp` functionality.

## Setup Instructions

### 1. Install Dependencies
Run the following at the root of the project:
```bash
npm install
```

### 2. Run the Development Server (Frontend + Backend)
The project runs using a unified Express server that proxy's Vite in development mode:
```bash
npm run dev
```
The IDE will be available at `http://localhost:3000`.

### 3. Production Build
To create a production-ready build:
```bash
npm run build
npm start
```

### 4. Running Custom Docker Sandbox (If self-hosting execution)
If you wish to detach from the Piston proxy and write your own execution engine logic using the provided Dockerfile:
1. Build the image: `docker build -t cpp-sandbox -f Dockerfile.sandbox .`
2. Run securely: `docker run --rm --network none --memory 256m --cpus 1 -v $(pwd)/user_code:/sandbox cpp-sandbox`

### 5. Testing Code Execution
- Open the UI and head to the C++ code editor.
- Type in standard C++ code like `std::cout << "Hello" << std::endl;`.
- Add an `std::cin >> x;` and head over to the **Standard Input** tab to provide input.
- Click **Run** or `Ctrl+Enter` and observe the isolated execution logs in the bottom terminal panel.
