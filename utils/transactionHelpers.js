const moment = require('moment');
const OtherCategory = require('../models/otherCategory.js');
const Transaction = require('../models/transaction.js');

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

// function to convert "YYYY-MM" String to start/end date range for a month
const getMonthRange = (monthString) => {
    // creating moment obj, parsing month String according to format YYYY-MM, then snaping the date from the beginning of the month
    const start = moment(monthString, 'YYYY-MM').startOf('month').toDate(); // convert moment obj to native js date obj

    const end = moment(monthString, 'YYYY-MM').endOf('month').toDate(); // snaping end of month

    return { start, end };
};

// function to check whether a submitted date is after today, comparing whole calendar days so "today" itself always passes
const isFutureDate = (dateValue) => {
    if (!dateValue) return false;
    return moment(dateValue).isAfter(moment().endOf('day'));
};

// function to build a mongo filter from category/type/month query params, merged onto a base filter (e.g. by user or by group)
const buildTransactionFilter = (baseFilter, query) => {
    const filter = { ...baseFilter };

    if (query.category) {
        filter.category = query.category;
    }

    if (query.type) {
        filter.type = query.type;
    }

    if (query.month) {
        const { start, end } = getMonthRange(query.month);
        filter.date = { $gte: start, $lte: end };
    }

    return filter;
};

// function to group into per category totals splitted by income/expense
function groupTransactionsByCategory(transactions) {
    const incomeTotals = {};
    const expenseTotals = {};
    let categoryName = '';
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
        // use fixed category name otherwise use custom category name if it is custom
        if (transaction.category === 'other' && transaction.customCategory) {
            categoryName = transaction.customCategory.name;
        } else {
            categoryName = transaction.category;
        }

        // sum of each category of type income
        if (transaction.type === 'income') {
            // if category isn't added before to income obj
            if (!incomeTotals[categoryName]) {
                // initialize it with total = 0
                incomeTotals[categoryName] = 0;
            }

            // add amount to exsiting total
            incomeTotals[categoryName] += transaction.amount;
            totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            if (!expenseTotals[categoryName]) {
                expenseTotals[categoryName] = 0;
            }

            expenseTotals[categoryName] += transaction.amount;
            totalExpense += transaction.amount;
        }
    });

    return { incomeTotals, expenseTotals, totalIncome, totalExpense };
}

// function to convert a totals object into a sorted array with percentages
function buildBreakdown(totals, grandTotal) {
    const breakdown = []; // convert from obj to arr

    for (const category in totals) {
        const total = totals[category];
        let percentage = 0;

        if (grandTotal > 0) {
            percentage = total / grandTotal * 100;
        } else {
            percentage = 0;
        }

        breakdown.push({ category, total, percentage });
    }

    breakdown.sort((a, b) => b.total - a.total); // sort on descending order

    return breakdown;
}

// builds the full spend-breakdown summary for a scope (personal or group) for a given month
// scopeFilter is either { user: userId } or { group: groupId }
async function buildSummary(scopeFilter, month) {
    const { start, end } = getMonthRange(month);

    const transactions = await Transaction.find({
        ...scopeFilter,
        date: { $gte: start, $lte: end }
    }).populate('customCategory');

    const { incomeTotals, expenseTotals, totalIncome, totalExpense } = groupTransactionsByCategory(transactions);

    const incomeBreakDown = buildBreakdown(incomeTotals, totalIncome);
    const expenseBreakDown = buildBreakdown(expenseTotals, totalExpense);

    return { month, incomeBreakDown, expenseBreakDown, totalIncome, totalExpense };
}

module.exports = {
    processCustomCategory,
    getMonthRange,
    isFutureDate,
    buildTransactionFilter,
    groupTransactionsByCategory,
    buildBreakdown,
    buildSummary
};