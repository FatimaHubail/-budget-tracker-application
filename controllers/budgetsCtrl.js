const Budget = require('../models/budget.js');
const Group = require('../models/group.js');
const OtherCategory = require('../models/otherCategory.js');

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

        const budgetData = {
            monthlyLimit,
            category: category || undefined // empty string means "overall"
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
    deleteBudget
};