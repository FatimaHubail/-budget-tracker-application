const User = require('../models/user.js');
const Transaction = require('../models/transaction.js');
const OtherCategory = require('../models/otherCategory.js');

// function for processing and validating the custom category data during creation/updating
const processCustomCategory = async (category, newCategory, type, userId) => {
    if (category !== 'other' || !newCategory) {
        return null;
    }

    // remove extra spaces and convert tp lower case
    const cleanName = newCategory.trim().toLowerCase();

    // find if the custom category already added before for this user
    let otherCategory = await OtherCategory.findOne({ name: cleanName, type, user: userId });

    // doesn't exist before - add to db 
    if (!otherCategory) {
        otherCategory = await OtherCategory.create({ name: cleanName, type, user: userId });
    }

    return otherCategory._id;
};

// index route (dashboard)
const index = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.session.user._id }).sort({ date: -1 });
        res.render('transactions/index.ejs', {transactions});
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// route to render the 'add transaction' form 
const newTransaction = async (req, res) => {
    try {
        res.render('transactions/new.ejs');
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
        const transaction = await Transaction.findById(req.params.id); 

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

        if (!transaction || transaction.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        res.render('transactions/edit.ejs', { transaction });
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


module.exports = {
    index,
    newTransaction,
    create,
    show,
    deleteTransaction,
    edit,
    update,
};