const express = require('express');

const router = express.Router({ mergeParams: true });

const groupsCtrl = require('../controllers/groupsCtrl');

router.get('', groupsCtrl.index);
// router.get('/new', groupsCtrl.newGroup);
// router.post('', groupsCtrl.create);
// router.get('/summary', groupsCtrl.summary);
// router.get('/:id', groupsCtrl.show);
// router.get('/:id/edit', groupsCtrl.edit);
// router.put('/:id', groupsCtrl.update);
// router.delete('/:id', groupsCtrl.deleteGroup);

module.exports = router;