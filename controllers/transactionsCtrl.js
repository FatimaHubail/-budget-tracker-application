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

// index route (dashboard)
const index = async (req, res) => {
    try {
        const allTransactions = await Transaction.find({ user: req.session.user._id }).sort({date: -1}); 

        // Calculating balance, expenses, and income
        let income = 0;
        let expense = 0;
        let balance = 0;

        allTransactions.forEach(transaction => {
            if (transaction.type === 'income') {
                income += transaction.amount;
            } else if (transaction.type === 'expense') {
                expense += transaction.amount;
            }
        });

        balance = income - expense;

        // filtering transactions
        const filter = { user: req.session.user._id };

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.type) {
            filter.type = req.query.type;
        }

        if (req.query.month) {
            const { start, end } = getMonthRange(req.query.month);
            filter.date = { $gte: start, $lte: end };
        }

        const filteredTransactions = await Transaction.find(filter).sort({date: -1});


        res.render('transactions/index.ejs', {filteredTransactions, income, expense, balance, query:req.query});
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
        const { title, description, amount, type, category, newCategory, date } = req.body;

        const customCategoryId = await processCustomCategory(category, newCategory, type, req.session.user._id);
        
        await Transaction.create({
            title,
            description,
            amount,
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
    newTransaction,
    create,
    show,
    deleteTransaction,
    edit,
    update,
    summary,
};