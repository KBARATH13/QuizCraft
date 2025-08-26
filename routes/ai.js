const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const gemmaService = require('../services/gemmaService');

router.post('/generate-from-pdf', authMiddleware, (req, res, next) => req.app.uploadPdf.single('pdfFile')(req, res, next), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded.' });
    }
    res.json({ message: 'PDF uploaded successfully', filePath: req.file.path });
  } catch (err) {
    
    res.status(500).json({ message: err.message || 'Failed to upload PDF.' });
  }
});

router.post('/doubt', authMiddleware, async (req, res) => {
  const { questionText } = req.body;
  try {
    
    const gemmaResponse = await gemmaService.askGemma(questionText);
    res.status(200).json({ response: gemmaResponse });
  } catch (err) {
    
    res.status(500).json({ message: 'Failed to process doubt' });
  }
});

module.exports = router;