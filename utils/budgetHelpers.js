const Transaction = require('../models/transaction.js');
const Budget = require('../models/budget.js');
const { getMonthRange } = require('./transactionHelpers.js');

// scopeFilter is either { user: userId } or { group: groupId }
// returns an array of { category, limit, spent, percentage, exceeded }
// one entry per Budget doc that matches this scope
async function calculateBudgetStatus(scopeFilter, month) {
    const { start, end } = getMonthRange(month);

    // get every budget limit set for this scope
    const budgets = await Budget.find(scopeFilter).populate('customCategory');

    const results = [];

    for (const budget of budgets) {
        // build the transaction filter: same scope + this month + expenses only
        const transactionFilter = {
            ...scopeFilter,
            type: 'expense',
            date: { $gte: start, $lte: end }
        };

        // if this budget is for a specific category, narrow the spend calculation to it
        // (an unset category means "overall", so we leave the filter as-is to include everything)
        if (budget.category) {
            transactionFilter.category = budget.category;
        }

        // a budget on one specific custom category also needs to match its id,
        // since every custom category shares category: 'other' on the transaction itself
        if (budget.customCategory) {
            transactionFilter.customCategory = budget.customCategory._id;
        }

        const transactions = await Transaction.find(transactionFilter);

        let spent = 0;
        transactions.forEach(transaction => {
            spent += transaction.amount;
        });

        const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

        results.push({
            id: budget._id,
            // null = overall limit; a custom category displays its own name instead of "other"
            category: budget.customCategory ? budget.customCategory.name : (budget.category || null),
            limit: budget.monthlyLimit,
            spent,
            percentage,
            exceeded: spent > budget.monthlyLimit
        });
    }

    return results;
}

module.exports = { calculateBudgetStatus };