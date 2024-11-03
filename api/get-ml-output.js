let lastMlOutput = ''; // Store last output in memory

module.exports = (req, res) => {
  if (lastMlOutput) {
    res.send(lastMlOutput);
  } else {
    res.status(404).send('No ML output available yet.');
  }
};
