const Budget = require('../models/budget.js');
const Group = require('../models/group.js');
const OtherCategory = require('../models/otherCategory.js');
const { parseCategoryFilter } = require('../utils/transactionHelpers.js');

// GET /budgets/new  (personal)  or  GET /groups/:id/budgets/new  (group)
const newBudget = async (req, res) => {
    try {
        let group = null;

        if (req.params.id) {
            group = await Group.findById(req.params.id);
            const membership = group.members.find(m => m.user.toString() === req.session.user._id);

            // only admins can set a group's budget
            if (!membership || membership.role !== 'admin') {
                return res.redirect(`/groups/${group._id}`);
            }
        }

        // budgets only ever track expenses, so only offer expense categories
        const customCategories = await OtherCategory.find({ user: req.session.user._id, type: 'expense' });

        res.render('budgets/new.ejs', { group, customCategories });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// POST /budgets  (personal)  OR  POST /groups/:id/budgets  (group)
const create = async (req, res) => {
    try {
        const { category, monthlyLimit } = req.body;

        if (isNaN(monthlyLimit) || Number(monthlyLimit) < 0) {
            return res.redirect(req.params.id ? `/groups/${req.params.id}/budgets/new` : '/budgets/new');
        }

        // empty string means "overall"; "other:<id>" (from the custom category options)
        // splits into category: 'other' + customCategory: <id> so spend can be matched
        // back to the exact custom category instead of the generic "other" bucket
        const budgetData = {
            monthlyLimit,
            ...(category ? parseCategoryFilter(category) : {})
        };

        if (req.params.id) {
            const group = await Group.findById(req.params.id);
            const membership = group.members.find(member => member.user.toString() === req.session.user._id);

            if (!membership || membership.role !== 'admin') {
                return res.redirect(`/groups/${group._id}`);
            }

            budgetData.group = group._id;
            await Budget.create(budgetData);
            return res.redirect(`/groups/${group._id}`);
        }

        budgetData.user = req.session.user._id;
        await Budget.create(budgetData);
        res.redirect('/transactions');

    } catch (error) {
        console.log(error);
        res.redirect(req.params.id ? `/groups/${req.params.id}/budgets/new` : '/budgets/new');
    }
};

// GET /budgets/:budgetId/edit  (personal)  or  GET /groups/:id/budgets/:budgetId/edit  (group)
const editBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.budgetId).populate('customCategory');
        if (!budget) {
            return res.redirect(req.params.id ? `/groups/${req.params.id}` : '/transactions');
        }

        let group = null;

        if (req.params.id) {
            group = await Group.findById(req.params.id);
            const membership = group.members.find(m => m.user.toString() === req.session.user._id);

            if (!membership || membership.role !== 'admin') {
                return res.redirect(`/groups/${req.params.id}`);
            }
        } else if (budget.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        // budgets only ever track expenses, so only offer expense categories
        const customCategories = await OtherCategory.find({ user: req.session.user._id, type: 'expense' });

        // the value the category <select> should have preselected
        const currentCategoryValue = budget.customCategory
            ? `other:${budget.customCategory._id}`
            : (budget.category || '');

        res.render('budgets/edit.ejs', { budget, group, customCategories, currentCategoryValue });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

// PUT /budgets/:budgetId  (personal)  OR  PUT /groups/:id/budgets/:budgetId  (group)
const update = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.budgetId);
        if (!budget) {
            return res.redirect(req.params.id ? `/groups/${req.params.id}` : '/transactions');
        }

        if (req.params.id) {
            const group = await Group.findById(req.params.id);
            const membership = group.members.find(member => member.user.toString() === req.session.user._id);

            if (!membership || membership.role !== 'admin') {
                return res.redirect(`/groups/${group._id}`);
            }
        } else if (budget.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        const editUrl = req.params.id
            ? `/groups/${req.params.id}/budgets/${req.params.budgetId}/edit`
            : `/budgets/${req.params.budgetId}/edit`;

        const { category, monthlyLimit } = req.body;

        if (isNaN(monthlyLimit) || Number(monthlyLimit) < 0) {
            return res.redirect(editUrl);
        }

        // same "other:<id>" convention as create: empty means "overall", a plain slug
        // means a fixed category, "other:<id>" means one specific custom category
        const parsed = category ? parseCategoryFilter(category) : {};

        const changes = { $set: { monthlyLimit }, $unset: {} };
        if (parsed.category) changes.$set.category = parsed.category;
        else changes.$unset.category = '';

        if (parsed.customCategory) changes.$set.customCategory = parsed.customCategory;
        else changes.$unset.customCategory = '';

        if (Object.keys(changes.$unset).length === 0) delete changes.$unset;

        await Budget.findByIdAndUpdate(req.params.budgetId, changes, { runValidators: true });

        res.redirect(req.params.id ? `/groups/${req.params.id}` : '/transactions');
    } catch (error) {
        console.log(error);
        res.redirect(req.params.id ? `/groups/${req.params.id}` : '/transactions');
    }
};

// DELETE /budgets/:budgetId  (personal)  OR  DELETE /groups/:id/budgets/:budgetId  (group)
const deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.budgetId);
        if (!budget) {
            return res.redirect(req.params.id ? `/groups/${req.params.id}` : '/transactions');
        }

        if (req.params.id) {
            const group = await Group.findById(req.params.id);
            const membership = group.members.find(member => member.user.toString() === req.session.user._id);

            if (!membership || membership.role !== 'admin') {
                return res.redirect(`/groups/${group._id}`);
            }

            await Budget.findByIdAndDelete(req.params.budgetId);
            return res.redirect(`/groups/${group._id}`);
        }

        // personal budget
        if (budget.user.toString() !== req.session.user._id) {
            return res.redirect('/transactions');
        }

        await Budget.findByIdAndDelete(req.params.budgetId);
        res.redirect('/transactions');

    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

module.exports = {
    newBudget,
    create,
    editBudget,
    update,
    deleteBudget
};