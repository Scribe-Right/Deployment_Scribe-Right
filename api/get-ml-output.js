let lastMlOutput = ''; // Store last output in memory

module.exports = (req, res) => {
  if (lastMlOutput) {
    res.json({ output: lastMlOutput });
  } else {
    res.status(404).json({ error: 'No ML output available yet.' });
  }
};

// Setter function for updating lastMlOutput
module.exports.setMlOutput = (output) => {
  lastMlOutput = output;
};
