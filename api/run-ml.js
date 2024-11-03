const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define upload folder within Vercel's temporary `/tmp` directory
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

// Use Vercel's default Python interpreter
const pythonExecutable = '/usr/bin/python3';
const pythonScriptPath = path.join(__dirname, 'analyse_for_server.py');

module.exports = (req, res) => {
  // Handle file upload using multer
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(500).send('File upload failed');
    }

    const uploadedFilePath = req.file.path;
    const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, uploadedFilePath]);

    let scriptOutput = '';

    // Capture stdout from Python script
    pythonProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    // Capture errors from the Python script
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data}`);
    });

    // Send back Python script output when process finishes
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Python script failed to execute properly' });
      }

      // Send script output to client
      res.send(`Python script executed successfully. Output:\n${scriptOutput}`);
    });
  });
};
