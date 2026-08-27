const Group = require('../models/group.js');
const Invitation = require('../models/invitation.js');
const User = require('../models/user.js');
const Transaction = require('../models/transaction.js');
const OtherCategory = require('../models/otherCategory.js');
const moment = require('moment');
const { sendInviteEmail } = require('../utils/mailer.js');
const { getExchangeRate, decimalsFor } = require('../utils/currencyHelper.js');
const {
    processCustomCategory,
    isFutureDate,
    buildTransactionFilter,
    buildSummary
} = require('../utils/transactionHelpers.js');
const {
    getGroupAndMembership,
    getGroupTransaction,
    canModifyTransaction
} = require('../utils/groupHelpers.js');
const { calculateBudgetStatus } = require('../utils/budgetHelpers.js');

// -------------------------- Groups Controller --------------------------

// index route (groups list)
const index = async (req, res) => {
    try {
        const groups = await Group.find({
            'members.user': req.session.user._id
        }).populate('owner');

        res.render('groups/index.ejs', { groups });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// route to render the 'add group' form
const newGroup = async (req, res) => {
    try {
        res.render('groups/new.ejs');
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}

// route to add group
const create = async (req, res) => {
    try {
        const { name } = req.body;

        const group = await Group.create({
            name,
            owner: req.session.user._id,
            members: [{
                user: req.session.user._id,
                role: 'admin'
            }]
        });

        res.redirect(`/groups/${group._id}`);
    } catch (error) {
        console.log(error);
        res.redirect('/groups/new');
    }
};

// route to show group details
const show = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id).populate('owner').populate('members.user');

        if (!group) {
            return res.redirect('/groups');
        };

        // find this user's membership entry to determine their role
        const membership = group.members.find(
            member => member.user._id.toString() === req.session.user._id
        );

        if (!membership) {
            return res.redirect('/groups');
        };

        const userRole = membership.role;

        // find this group's transactions, filtered by category/type/month if requested
        const filter = buildTransactionFilter({ group: group._id }, req.query);
        const transactions = await Transaction.find(filter)
            .populate('customCategory')
            .populate('user')
            .sort({ date: -1 });

        const budgets = await calculateBudgetStatus({ group: group._id }, moment().format('YYYY-MM'));

        const customCategories = await OtherCategory.find({ user: req.session.user._id });

        // ===== display currency conversion =====
        const displayCurrency = req.query.displayCurrency || 'BHD';

        if (displayCurrency !== 'BHD') {
            const rate = await getExchangeRate('BHD', displayCurrency);
            budgets.forEach(budget => {
                budget.spent *= rate;
                budget.limit *= rate;
            });
        }

        res.render('groups/show.ejs', {
            group,
            transactions,
            userRole,
            query: req.query,
            budgets,
            user: req.session.user,
            displayCurrency,
            decimals: decimalsFor(displayCurrency),
            customCategories
        });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
};

// route to show the edit page
const edit = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group } = result;

        // every member can rename the group
        res.render('groups/edit.ejs', { group });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
};

// update route
const update = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group } = result;

        const { name } = req.body;

        // any member can rename the group
        if (!name || !name.trim()) {
            return res.redirect(`/groups/${group._id}/edit`);
        }

        await Group.findByIdAndUpdate(group._id, { name: name.trim() }, { runValidators: true });

        res.redirect(`/groups/${group._id}`);

    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}/edit`);
    }
};

const deleteGroup = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group, membership } = result;

        // only admins can delete the group
        if (membership.role !== 'admin') {
            return res.redirect(`/groups/${group._id}`);
        }

        // clean up everything that belongs to the group
        await Transaction.deleteMany({ group: group._id });
        await Invitation.deleteMany({ group: group._id });
        await Group.findByIdAndDelete(group._id);

        res.redirect('/groups');
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }
};

// route for a member to leave the group
const leave = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group } = result;

        const isOwner = group.owner.toString() === req.session.user._id;
        const remainingMembers = group.members.filter(
            member => member.user.toString() !== req.session.user._id
        );

        if (isOwner) {
            if (remainingMembers.length === 0) {
                // no one left to hand the group to, so it goes away with its owner
                await Transaction.deleteMany({ group: group._id });
                await Invitation.deleteMany({ group: group._id });
                await Group.findByIdAndDelete(group._id);
                return res.redirect('/groups');
            }

            // hand ownership to the next member in line and make sure they're admin
            const newOwner = remainingMembers[0];
            newOwner.role = 'admin';
            group.owner = newOwner.user;
        }

        group.members = remainingMembers;
        await group.save();

        res.redirect('/groups');
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }
};

// ---------------------------------- Group Transactions Controller --------------------------

// route to add a new transaction form to the group
const addTransaction = async (req, res) => {
    const group = await Group.findById(req.params.id);
    const customCategories = await OtherCategory.find({ user: req.session.user._id });
    res.render('transactions/new.ejs', { group, customCategories });
};

// route to create a new transaction for the group
const createTransaction = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        const membership = group.members.find(member => member.user.toString() === req.session.user._id);

        if (!membership || membership.role === 'viewer') {
            return res.redirect(`/groups/${group._id}`);
        }

        const { title, description, amount, type, category, newCategory, date } = req.body;

        // transactions can't be dated in the future
        if (isFutureDate(date)) {
            return res.redirect(`/groups/${group._id}/transactions/new`);
        }

        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);

        await Transaction.create({
            title, description, amount, type, category,
            customCategory: customCategoryId,
            date,
            user: req.session.user._id,
            group: group._id
        });

        res.redirect(`/groups/${group._id}`);
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}/transactions/new`);
    }
};

const showTransaction = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group, membership } = result;

        const transaction = await getGroupTransaction(group._id, req.params.transactionId);
        if (!transaction) {
            return res.redirect(`/groups/${group._id}`);
        }

        res.render('transactions/show.ejs', {
            transaction, group, userRole: membership.role, userId: req.session.user._id
        });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
};

const editTransaction = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group, membership } = result;

        const transaction = await getGroupTransaction(group._id, req.params.transactionId);

        if (!transaction) {
            return res.redirect(`/groups/${group._id}`);
        }

        if (!canModifyTransaction(transaction, membership, req.session.user._id)) {
            return res.redirect(`/groups/${group._id}/transactions/${transaction._id}`);
        }

        const customCategories = await OtherCategory.find({ user: req.session.user._id });

        res.render('transactions/edit.ejs', { transaction, customCategories, group });
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }
};


const updateTransaction = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group, membership } = result;

    
        const transaction = await getGroupTransaction(group._id, req.params.transactionId);

        if (!transaction) {
            return res.redirect(`/groups/${group._id}`);
        }

        if (!canModifyTransaction(transaction, membership, req.session.user._id)) {
            return res.redirect(`/groups/${group._id}/transactions/${transaction._id}`);
        }

        const { title, description, amount, type, category, newCategory, date } = req.body;

        // transactions can't be dated in the future
        if (isFutureDate(date)) {
            return res.redirect(`/groups/${group._id}/transactions/${req.params.transactionId}/edit`);
        }

        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);

        const payload = { title, description, amount, type, category, customCategory: customCategoryId, date };
        await Transaction.findByIdAndUpdate(req.params.transactionId, payload, { runValidators: true });

        res.redirect(`/groups/${group._id}/transactions/${req.params.transactionId}`);
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}/transactions/${req.params.transactionId}/edit`);
    }
};

const deleteTransaction = async (req, res) => { 
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group, membership } = result;


        const transaction = await getGroupTransaction(group._id, req.params.transactionId);

        if (!transaction) {
            return res.redirect(`/groups/${group._id}`);
        }

        if (!canModifyTransaction(transaction, membership, req.session.user._id)) {
            return res.redirect(`/groups/${group._id}/transactions/${transaction._id}`);
        }

        await Transaction.findByIdAndDelete(req.params.transactionId);

        res.redirect(`/groups/${group._id}`);
    } catch (error) { 
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }

};

// ---------------------------------- Membership and Invitation Controller --------------------------
// route to show the 'add member' form
const newInvite = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        const membership = group.members.find(m => m.user.toString() === req.session.user._id);

        // only admins can access the invite form
        if (!membership || membership.role !== 'admin') {
            return res.redirect(`/groups/${group._id}`);
        }

        res.render('groups/members/new.ejs', { group });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
}

const invite = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        const membership = group.members.find(m => m.user.toString() === req.session.user._id);

        // only admins can invite
        if (!membership || membership.role !== 'admin') {
            return res.redirect(`/groups/${group._id}`);
        }

        const { email, role } = req.body;

        // reuse a still-pending invite
        let invitation = await Invitation.findOne({
            group: group._id,
            email: email.toLowerCase(),
            status: 'pending',
        });

        if (invitation) {
            invitation.role = role;
            await invitation.save();
        } else {
            invitation = await Invitation.create({
                group: group._id,
                email: email.toLowerCase(),
                invitedBy: req.session.user._id,
                role
            });
        }

        // invitation link, invitation id as token
        const inviteLink = `${process.env.BASE_URL}/invitations/${invitation._id}`;
        await sendInviteEmail(email, inviteLink, group.name);
        res.redirect(`/groups/${group._id}`);
    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}/members/new`);
    }
};

const summary = async (req, res) => {
    try {
        const result = await getGroupAndMembership(req.params.id, req.session.user._id);
        if (!result) {
            return res.redirect('/groups');
        }
        const { group } = result;

        // specify summary month
        const month = req.query.month || moment().format('YYYY-MM');

        const summaryData = await buildSummary({ group: group._id }, month);

        res.render('transactions/summary.ejs', { ...summaryData, group });

    } catch (error) {
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }
};


module.exports = {
    index,
    newGroup,
    create,
    show,
    edit,
    update,
    deleteGroup,
    leave,

    // transactions
    addTransaction,
    createTransaction,
    showTransaction,
    editTransaction,
    updateTransaction,
    deleteTransaction,

    //invites
    newInvite,
    invite,
    summary,
};