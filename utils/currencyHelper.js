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

// BHD uses 3 decimal places, 2 for other currencies 
function decimalsFor(currency) {
    return currency === 'BHD' ? 3 : 2;
}

module.exports = {
    getExchangeRate,
    convertToBHD,
    convertFromBHD,
    decimalsFor
};