const express = require('express');

const router = express.Router({ mergeParams: true });

const transactionsCtrl = require('../controllers/transactionsCtrl');

router.get('', transactionsCtrl.index);
router.get('/new', transactionsCtrl.newTransaction);
router.post('', transactionsCtrl.create);
router.get('/summary', transactionsCtrl.summary);
router.get('/:id', transactionsCtrl.show);
router.get('/:id/edit', transactionsCtrl.edit);
router.put('/:id', transactionsCtrl.update);
router.delete('/:id', transactionsCtrl.deleteTransaction);

module.exports = router;