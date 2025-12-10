const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

router.get('/search', scrapeController.searchImmediate);

module.exports = router;
