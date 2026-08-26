const express = require('express');

const router = express.Router({ mergeParams: true });

const groupsCtrl = require('../controllers/groupsCtrl');

// routes for groups
router.get('', groupsCtrl.index);
router.get('/new', groupsCtrl.newGroup);
router.post('', groupsCtrl.create);
router.get('/:id', groupsCtrl.show);
router.get('/:id/summary', groupsCtrl.summary);
router.get('/:id/edit', groupsCtrl.edit);
router.put('/:id', groupsCtrl.update);
router.delete('/:id', groupsCtrl.deleteGroup);
router.delete('/:id/leave', groupsCtrl.leave);

// Transaction routes for groups
router.get('/:id/transactions/new', groupsCtrl.addTransaction);
router.post('/:id/transactions', groupsCtrl.createTransaction);
router.get('/:id/transactions/:transactionId', groupsCtrl.showTransaction);
router.get('/:id/transactions/:transactionId/edit', groupsCtrl.editTransaction);
router.put('/:id/transactions/:transactionId', groupsCtrl.updateTransaction);
router.delete('/:id/transactions/:transactionId', groupsCtrl.deleteTransaction);

// invite routes for groups
router.get('/:id/members/new', groupsCtrl.newInvite);
router.post('/:id/invite', groupsCtrl.invite);

module.exports = router;