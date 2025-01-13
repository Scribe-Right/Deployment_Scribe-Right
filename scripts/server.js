const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { spawn,exec } = require('child_process');
const axios = require('axios');
const app = express();
const port = 5000;

app.use(cors());

let lastMlOutput = ''; // Store last ML output for retrieval

// Configure upload directory
const UPLOAD_FOLDER = 'data/images';
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

// Route to execute shell commands
app.get('/execute-copy', (req, res) => {
  const copyCommands = `
    cp -r /app/htr_pipeline /usr/local/lib/python3.10/site-packages/ &&
    cp -r /app/htr_pipeline.egg-info /usr/local/lib/python3.10/site-packages/
  `;

  exec(copyCommands, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing shell commands:', error);
      return res.status(500).json({ error: 'Failed to execute shell commands', details: error.message });
    }
    if (stderr) {
      console.error('Shell stderr:', stderr);
    }
    console.log('Shell stdout:', stdout);
    res.json({ message: 'Shell commands executed successfully', stdout });
  });
});

// Path to Python script
const pythonScriptPath = 'scripts/analyse_for_server.py';

// Health check route
app.get('/', (req, res) => {
  res.send('API is up and running');
});

// API endpoint to retrieve last ML output
app.get('/get-ml-output', (req, res) => {
  if (lastMlOutput) {
    res.json({ output: lastMlOutput });
  } else {
    res.status(404).json({ error: 'No ML output available yet.' });
  }
});

// ML processing endpoint
app.post('/run-ml', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadedFilePath = req.file.path;
  console.log('Processing uploaded file:', uploadedFilePath);

  const pythonProcess = spawn('python3', [pythonScriptPath, uploadedFilePath], { shell: true });

  let scriptOutput = '';
  
  // Capture standard output from the Python script
  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });

  // Capture standard error from the Python script
  pythonProcess.stderr.on('data', (data) => {
    console.error('Python stderr:', data.toString());
  });

  // Handle process close event
  pythonProcess.on('close', (code) => {
    // Clean up the uploaded file after processing
    fs.unlink(uploadedFilePath, (err) => {
      if (err) console.error('Error cleaning up uploaded file:', err);
    });

    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      return res.status(500).json({ error: 'Python script execution failed' });
    }

    lastMlOutput = scriptOutput;
    res.json({ message: 'ML processing complete', output: scriptOutput });
  });

  // Handle error if the Python process fails to start
  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python script:', err);
    res.status(500).json({ error: 'Failed to start Python script' });
  });
});

// Additional test route for debugging
app.get('/test', (req, res) => {
  res.send('Test route reached successfully');
});

// Start the server and call /execute-copy
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);

  try {
    // Automatically call /execute-copy endpoint
    const response = await axios.get(`http://localhost:5000/execute-copy`);
    console.log('Automatic execute-copy response:', response.data);
  } catch (error) {
    console.error('Error calling execute-copy endpoint:', error.message);
  }
});