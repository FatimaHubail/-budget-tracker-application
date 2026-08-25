const express = require('express');
const router = express.Router({ mergeParams: true });
const invitationsCtrl = require('../controllers/invitationsCtrl');
const isSignedIn = require('../middleware/isSignedIn.js');

// public routes
router.get('/:id', invitationsCtrl.show);

// private routes
router.post('/:id/accept', isSignedIn, invitationsCtrl.accept);
router.post('/:id/decline', isSignedIn, invitationsCtrl.decline);

module.exports = router;
