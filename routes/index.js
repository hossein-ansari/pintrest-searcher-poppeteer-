const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

router.get('/search', scrapeController.searchImmediate);
router.post('/download', scrapeController.downloadImmediate);
router.get('/convertAndDownload', scrapeController.downloadAndConverterImageImmediate);

module.exports = router;
