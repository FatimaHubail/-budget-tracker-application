// fetches the conversion rate from one currency to another
async function getExchangeRate(from, to) {
    if (from === to) return 1;

    const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/pair/${from}/${to}`
    );
    const data = await response.json();

    if (data.result !== 'success') {
        throw new Error(`Exchange rate lookup failed for ${from} -> ${to}`);
    }

    return data.conversion_rate;
}

// converts an amount from a given currency to BHD (used on create)
async function convertToBHD(amount, fromCurrency) {
    const rate = await getExchangeRate(fromCurrency, 'BHD');
    return amount * rate;
}

// converts an amount stored in BHD to a chosen display currency (used on dashboards)
async function convertFromBHD(amount, toCurrency) {
    const rate = await getExchangeRate('BHD', toCurrency);
    return amount * rate;
}

// currencies that can be picked for entry or for displaying totals
const SUPPORTED_CURRENCIES = ['BHD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'EGP'];

// BHD and KWD use 3 decimal places, 2 for other currencies
const THREE_DECIMAL_CURRENCIES = ['BHD', 'KWD'];

function decimalsFor(currency) {
    return THREE_DECIMAL_CURRENCIES.includes(currency) ? 3 : 2;
}

module.exports = {
    SUPPORTED_CURRENCIES,
    getExchangeRate,
    convertToBHD,
    convertFromBHD,
    decimalsFor
};