// api/run-ml.js

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Store the last ML output in memory
let lastMlOutput = '';

// Configure multer for file uploads in tmp directory
const UPLOAD_FOLDER = '/tmp/uploads';
fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Get last ML output endpoint
app.get('/api/get-ml-output', (req, res) => {
  if (lastMlOutput) {
    res.status(200).send(lastMlOutput);
  } else {
    res.status(404).send('No ML output available yet.');
  }
});

// Main ML processing endpoint
app.post('/api/run-ml', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.filename);

    const uploadedFilePath = req.file.path;
    
    // Use Python script from the same directory
    const pythonScriptPath = path.join(__dirname, 'analyse_writing.py');
    
    // Create a promise to handle the Python process
    const processML = new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [pythonScriptPath, uploadedFilePath]);
      
      let scriptOutput = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        scriptOutput += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}\nError: ${errorOutput}`));
        } else {
          resolve(scriptOutput);
        }
      });
    });

    // Wait for ML processing to complete
    const output = await processML;
    lastMlOutput = output;

    // Clean up uploaded file
    fs.unlink(uploadedFilePath, (err) => {
      if (err) console.error('Error cleaning up file:', err);
    });

    // Try to parse the output as JSON
    try {
      const jsonOutput = JSON.parse(output);
      return res.status(200).json(jsonOutput);
    } catch (e) {
      // If not JSON, send as text
      return res.status(200).send(output);
    }

  } catch (error) {
    console.error('Error processing ML request:', error);
    return res.status(500).json({
      error: 'ML processing failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    details: err.message
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express API
module.exports = app;
