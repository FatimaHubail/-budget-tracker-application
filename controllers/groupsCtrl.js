const Group = require('../models/group.js');
const Invitation = require('../models/invitation.js');
const User = require('../models/user.js');
const Transaction = require('../models/transaction.js');
const OtherCategory = require('../models/otherCategory.js');
const moment = require('moment');
const {
    processCustomCategory,
    getMonthRange,
    groupTransactionsByCategory,
    buildBreakdown
} = require('../utils/transactionHelpers.js');

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
        const { name, budgetLimit } = req.body;

        // validate budgetLimit if the user provided one
        if (budgetLimit && (isNaN(budgetLimit) || Number(budgetLimit) < 0)) {
            return res.redirect('/groups/new');
        };

        const group = await Group.create({
            name,
            budgetLimit,
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

        // find all transactions for this group
        const transactions = await Transaction.find({ group: group._id })
            .populate('customCategory')
            .populate('user')
            .sort({ date: -1 });

        res.render('groups/show.ejs', { group, transactions, userRole });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
};

// route to show the edit page
const edit = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        const customCategories = await OtherCategory.find({ user: req.session.user._id });

        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        res.render('transactions/edit.ejs', { transaction, customCategories });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// update route
const update = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        const { title, description, amount, type, category, newCategory, date } = req.body;
        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);

        const payload = { title, description, amount, type, category, customCategory: customCategoryId, date }
        await Transaction.findByIdAndUpdate(req.params.id, payload, { runValidators: true });

        res.redirect(`/transactions/${req.params.id}`);

    } catch (error) {
        console.log(error);
        res.redirect(`/transactions/${req.params.id}/edit`);
    }
};

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
        const group = await Group.findById(req.params.id);

        const membership = group.members.find(m => m.user.toString() === req.session.user._id);
        if (!membership) {
            return res.redirect('/groups');
        }
        const userRole = membership.role;

        const transaction = await Transaction.findById(req.params.transactionId)
            .populate('customCategory')
            .populate('user');

        if (!transaction || transaction.group.toString() !== group._id.toString()) {
            return res.redirect(`/groups/${group._id}`);
        }

        res.render('transactions/show.ejs', { transaction, group, userRole });
    } catch (error) {
        console.log(error);
        res.redirect('/groups');
    }
};

const editTransaction = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        const membership = group.members.find(m => m.user.toString() === req.session.user._id);
        if (!membership) {
            return res.redirect('/groups');
        }
        const userRole = membership.role;

        const transaction = await Transaction.findById(req.params.transactionId).populate('customCategory');

        if (!transaction || transaction.group.toString() !== group._id.toString()) {
            return res.redirect(`/groups/${group._id}`);
        }

        // allowed if: admin (can edit anyone's), OR the person who created this specific transaction
        const isCreator = transaction.user.toString() === req.session.user._id;
        const canEdit = userRole === 'admin' || isCreator;

        if (!canEdit) {
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
        const group = await Group.findById(req.params.id);

        const membership = group.members.find(m => m.user.toString() === req.session.user._id);
        if (!membership) {
            return res.redirect('/groups');
        }

        const transaction = await Transaction.findById(req.params.transactionId);

        if (!transaction || transaction.group.toString() !== group._id.toString()) {
            return res.redirect(`/groups/${group._id}`);
        }

        const isCreator = transaction.user.toString() === req.session.user._id;
        const canEdit = membership.role === 'admin' || isCreator;

        if (!canEdit) {
            return res.redirect(`/groups/${group._id}/transactions/${transaction._id}`);
        }

        const { title, description, amount, type, category, newCategory, date } = req.body;
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
        const group = await Group.findById(req.params.id);

        const membership = group.members.find(m => m.user.toString() === req.session.user._id);
        if (!membership) {
            return res.redirect('/groups');
        }

        const transaction = await Transaction.findById(req.params.transactionId);

        if (!transaction || transaction.group.toString() !== group._id.toString()) {
            return res.redirect(`/groups/${group._id}`);
        }

        const isCreator = transaction.user.toString() === req.session.user._id;
        const canDelete = membership.role === 'admin' || isCreator;

        if (!canDelete) {
            return res.redirect(`/groups/${group._id}/transactions/${transaction._id}`);
        }

        await Transaction.findByIdAndDelete(req.params.transactionId);

        res.redirect(`/groups/${group._id}`);
    } catch (error) { 
        console.log(error);
        res.redirect(`/groups/${req.params.id}`);
    }

};

const summary = async (req, res) => {
    try {
        // specify summary month
        const month = req.query.month || moment().format('YYYY-MM');
        const { start, end } = getMonthRange(month);

        // query to find transactions within that month chosen by user
        const transactions = await Transaction.find({
            user: req.session.user._id,
            date: { $gte: start, $lte: end }
        }).populate('customCategory');

        // calc totals for each category + total income/expenses
        const { incomeTotals, expenseTotals, totalIncome, totalExpense } = groupTransactionsByCategory(transactions);

        // calculate percentage for each income category
        const incomeBreakDown = buildBreakdown(incomeTotals, totalIncome);

        // calculate percentage for each expense category
        const expenseBreakDown = buildBreakdown(expenseTotals, totalExpense);

        res.render('transactions/summary.ejs', {
            month,
            incomeBreakDown,
            expenseBreakDown,
            totalIncome,
            totalExpense,
        });

    } catch (error) {
        console.log(error);
        res.redirect('/transactions');
    }
};


module.exports = {
    index,
    newGroup,
    create,
    show,
    edit,
    update,
    addTransaction,
    createTransaction,
    showTransaction,
    editTransaction,
    updateTransaction,
    deleteTransaction,
    summary,
};