const express = require('express');

const router = express.Router({ mergeParams: true });

const transactionCtrl = require('../controllers/authCtrl');

router.get('', transactionCtrl.index);
router.get('/new', transactionCtrl.new);
router.post('', transactionCtrl.create);
router.get('/:id', transactionCtrl.show);
router.get('/:id/edit', transactionCtrl.edit);
router.put('/:id', transactionCtrl.update);
router.delete('/:id', transactionCtrl.delete);

module.exports = router;