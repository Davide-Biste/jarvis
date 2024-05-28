function main(ohlcv) {
    const smaShort = calculateSMA(ohlcv, 10);
    const smaLong = calculateSMA(ohlcv, 50);

    const lastPrice = ohlcv[ohlcv.length - 1][4]; // Prezzo di chiusura dell'ultima candela
    const previousPrice = ohlcv[ohlcv.length - 2][4];

    const currentSignal = smaShort[smaShort.length - 1] > smaLong[smaLong.length - 1] ? 'buy' : 'sell';
    const previousSignal = smaShort[smaShort.length - 2] > smaLong[smaLong.length - 2] ? 'buy' : 'sell';

    if (currentSignal !== previousSignal) {
        const action = currentSignal === 'buy' ? 'Buy' : 'Sell';
        const stopLoss = action === 'Buy' ? lastPrice - 0.0010 : lastPrice + 0.0010; // 10 pips SL
        const takeProfit = action === 'Buy' ? lastPrice + 0.0020 : lastPrice - 0.0020; // 20 pips TP

        return {
            action,
            entryPrice: lastPrice,
            stopLoss,
            takeProfit,
            recommendation: `It is recommended to ${action} at ${lastPrice} with a stop loss at ${stopLoss} and take profit at ${takeProfit}.`
        };
    }
    return null;

}

function calculateSMA(data, window_size) {
    let sma = [];
    for (let i = window_size - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < window_size; j++) {
            sum += data[i - j][4]; // indice 4 è il prezzo di chiusura (close)
        }
        sma.push(sum / window_size);
    }
    return sma;
}
