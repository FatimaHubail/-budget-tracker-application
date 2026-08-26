const express = require('express');
const router = express.Router({ mergeParams: true });

const budgetsCtrl = require('../controllers/budgetsCtrl.js');

router.get('/new', budgetsCtrl.newBudget);
router.post('', budgetsCtrl.create);
router.delete('/:budgetId', budgetsCtrl.deleteBudget);

module.exports = router;