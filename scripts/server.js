const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 5000;
const { spawn } = require('child_process');

app.use(cors());

// API endpoint to retrieve the last ML output (to be displayed in the FlutterFlow app)
app.get('/get-ml-output', (req, res) => {
  console.log('Received request at /get-ml-output');
  if (lastMlOutput) {
    console.log('Sending ML output:', lastMlOutput);
    res.send(lastMlOutput);
  } else {
    console.log('No ML output available');
    res.status(404).send('No ML output available yet.');
  }
});

let lastMlOutput = '';

// Configure upload directory
const UPLOAD_FOLDER = 'D:/Analysis_ML/data/images';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Ensure the upload folder exists
fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });

// Path to Python executable in the virtual environment
const pythonExecutable = 'D:/Analysis_ML/venv/Scripts/python.exe';
const pythonScriptPath = 'analyse_for_server.py';

app.post('/run-ml', upload.single('file'), (req, res) => {
  console.log('Received request to /run-ml');
  console.log('Uploaded file:', req.file);

  const uploadedFilePath = req.file.path;

  // Spawn the Python script process
  const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, uploadedFilePath], { shell: true });

  let scriptOutput = '';

  // Capture stdout data (listens for the data sent by py script and appends it to scriptOutput)
  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
    console.log(`Stdout: ${data}`);
  });

  // Capture stderr data(listens for error logs from py script and prints them to the console)
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Stderr: ${data.toString()}`);
  });

  // Handle process close event
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      return res.status(500).json({ error: 'Python script failed to execute properly' });
    }

    lastMlOutput = `Python script executed successfully. Output:\n${scriptOutput}`;
    console.log(`Updated lastMlOutput: ${lastMlOutput}`);
    // try {
    //   // Try to parse the script output as JSON
    //   const result = JSON.parse(scriptOutput);
    //   res.json({ message: 'Python script executed successfully', output: result });
    // } catch (error) {
    //   console.error('Failed to parse JSON:', error);
    //   res.status(500).json({ error: 'Failed to parse Python script output', details: scriptOutput });
    // }

    // Send the raw output of the Python script as plain text
    res.send(`Python script executed successfully. Output:\n${scriptOutput}`);
  });
});
// lastMlOutput = `Python script executed successfully. Output:\n${scriptOutput}`;
// console.log(`Updated lastMlOutput: ${lastMlOutput}`);

//test route for health check
app.get('/test', (req, res) => {
  console.log('Test route reached');
  res.send('Test route reached successfully');
});



// Default route for FlutterFlow health check (optional but useful for debugging)
app.get('/', (req, res) => {
  res.send('API is up and running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});