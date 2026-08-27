const express = require('express');
const router = express.Router({ mergeParams: true });

const budgetsCtrl = require('../controllers/budgetsCtrl.js');

router.get('/new', budgetsCtrl.newBudget);
router.post('', budgetsCtrl.create);
router.get('/:budgetId/edit', budgetsCtrl.editBudget);
router.put('/:budgetId', budgetsCtrl.update);
router.delete('/:budgetId', budgetsCtrl.deleteBudget);

module.exports = router;