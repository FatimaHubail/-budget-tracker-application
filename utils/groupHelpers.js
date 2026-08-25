const Group = require('../models/group.js');
const Transaction = require('../models/transaction.js');

// finds the group and confirms the user is a member, returns null if either fails
async function getGroupAndMembership(groupId, userId) {
    const group = await Group.findById(groupId);
    if (!group) return null;

    const membership = group.members.find(m => m.user.toString() === userId);
    if (!membership) return null;

    return { group, membership };
}

// finds a transaction and confirms it actually belongs to this group
async function getGroupTransaction(groupId, transactionId) {
    const transaction = await Transaction.findById(transactionId)
        .populate('customCategory')
        .populate('user');

    if (!transaction || transaction.group.toString() !== groupId.toString()) {
        return null;
    }

    return transaction;
}

// admin can modify any transaction; anyone else can only modify what they created
function canModifyTransaction(transaction, membership, userId) {
    return membership.role === 'admin' || transaction.user._id.toString() === userId;
}

module.exports = {
    getGroupAndMembership,
    getGroupTransaction,
    canModifyTransaction
};