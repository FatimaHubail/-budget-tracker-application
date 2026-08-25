const Group = require('../models/group.js');
const Invitation = require('../models/invitation.js');
const User = require('../models/user.js');
const Transaction = require('../models/transaction.js');
const OtherCategory = require('../models/otherCategory.js');
const moment = require('moment');;

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

const show = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('customCategory');

        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        res.render('transactions/show.ejs', { transaction });
    } catch (error) {
        console.log(error);
        res.redirect('/transactions');
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

// Delete item route
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.redirect(`/transactions`)
    } catch (error) {
        console.log(error);
        res.redirect('/');
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
    deleteTransaction,
    edit,
    update,
    summary,
};