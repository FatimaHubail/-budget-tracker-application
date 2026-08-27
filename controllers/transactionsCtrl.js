const User = require('../models/user.js');
const Transaction = require('../models/transaction.js');
const OtherCategory = require('../models/otherCategory.js');
const moment = require('moment');
const { calculateBudgetStatus } = require('../utils/budgetHelpers.js');
const { convertToBHD, convertFromBHD, decimalsFor, getExchangeRate } = require('../utils/currencyHelper.js');
const {
    processCustomCategory,
    isFutureDate,
    getMonthRange,
    parseCategoryFilter,
    buildTransactionFilter,
    buildSummary
} = require('../utils/transactionHelpers.js');

// index route (dashboard)
const index = async (req, res) => {
    try {
        const { category, type, month, search } = req.query;

        // build the filter object for the displayed list
        const filter = { user: req.session.user._id };
        if (category) Object.assign(filter, parseCategoryFilter(category));
        if (type) filter.type = type;
        if (search) filter.title = { $regex: search, $options: 'i' };

        if (month) {
            const { start, end } = getMonthRange(month);
            filter.date = { $gte: start, $lte: end };
        }

        const transactions = await Transaction.find(filter).populate('customCategory').sort({ date: -1 });

        const customCategories = await OtherCategory.find({ user: req.session.user._id });

        // unfiltered, all user's transactions, used for totals
        const allTransactions = await Transaction.find({ user: req.session.user._id });

        let income = 0;
        let expense = 0;

        allTransactions.forEach(transaction => {
            if (transaction.type === 'income') {
                income += transaction.amount;
            } else if (transaction.type === 'expense') {
                expense += transaction.amount;
            }
        });

        let balance = income - expense;

        // budget status for the current month, always calculated in BHD
        const budgets = await calculateBudgetStatus(
            { user: req.session.user._id },
            moment().format('YYYY-MM')
        );

        // display currency conversion 
        const displayCurrency = req.query.displayCurrency || 'BHD';

        if (displayCurrency !== 'BHD') {
            const rate = await getExchangeRate('BHD', displayCurrency);

            income *= rate;
            expense *= rate;
            balance *= rate;

            budgets.forEach(budget => {
                budget.spent *= rate;
                budget.limit *= rate;
            });
        }

        res.render('transactions/index.ejs', {
            transactions,
            income,
            expense,
            balance,
            query: req.query,
            budgets,
            displayCurrency,
            decimals: decimalsFor(displayCurrency),
            customCategories
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// route to render the 'add transaction' form 
const newTransaction = async (req, res) => {
    try {
        const customCategories = await OtherCategory.find({ user: req.session.user._id });
        res.render('transactions/new.ejs', {customCategories, group: null});
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}

// route to add transaction
const create = async (req, res) => {
    try {
        const { title, description, amount, currency, type, category, newCategory, date } = req.body;

        // transactions can't be dated in the future
        if (isFutureDate(date)) {
            return res.redirect('/transactions/new');
        }

        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);

        let bhdAmount = Number(amount);
        let originalAmount, originalCurrency;

        // exchange currency if user picked something other than BHD
        if (currency && currency !== 'BHD') {
            bhdAmount = await convertToBHD(Number(amount), currency);

            originalAmount = Number(amount);
            originalCurrency = currency;
        }

        await Transaction.create({
            title,
            description,
            amount: bhdAmount,
            originalAmount,
            originalCurrency,
            type,
            category,
            customCategory: customCategoryId,
            date,
            user: req.session.user._id
        });

        res.redirect('/transactions');
    } catch (error) {
        console.log(error);
        res.redirect('/transactions/new');
    }
};

const show = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('customCategory'); 

        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        res.render('transactions/show.ejs', { transaction, group: null });
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

        res.render('transactions/edit.ejs', { transaction, customCategories, group: null });
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

        // transactions can't be dated in the future
        if (isFutureDate(date)) {
            return res.redirect(`/transactions/${req.params.id}/edit`);
        }

        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);

        const payload = { title, description, amount, type, category, customCategory: customCategoryId, date }
        await Transaction.findByIdAndUpdate(req.params.id, payload, {runValidators: true});

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

        const summaryData = await buildSummary({ user: req.session.user._id }, month);

        res.render('transactions/summary.ejs', { ...summaryData, group: null });

    } catch (error) {
        console.log(error);
        res.redirect('/transactions');
    }
};


module.exports = {
    index,
    newTransaction,
    create,
    show,
    deleteTransaction,
    edit,
    update,
    summary,
};