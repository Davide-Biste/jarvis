function calculateRSI(data, window) {
    const deltas = data.map((v, i, arr) => i === 0 ? 0 : v.close - arr[i - 1].close);
    const gains = deltas.map(delta => delta > 0 ? delta : 0);
    const losses = deltas.map(delta => delta < 0 ? -delta : 0);

    const avgGains = [], avgLosses = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window) {
            avgGains.push(gains.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
            avgLosses.push(losses.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
        } else {
            avgGains.push((avgGains[i - 1] * (window - 1) + gains[i]) / window);
            avgLosses.push((avgLosses[i - 1] * (window - 1) + losses[i]) / window);
        }
    }

    const rs = avgGains.map((avgGain, i) => avgGain / avgLosses[i]);
    return rs.map(r => 100 - (100 / (1 + r)));
}

function calculateATR(data, window) {
    const trueRanges = data.map((v, i, arr) => {
        if (i === 0) return 0; // Assume zero for the first element
        const highLow = v.high - v.low;
        const highClose = Math.abs(v.high - arr[i - 1].close);
        const lowClose = Math.abs(v.low - arr[i - 1].close);
        return Math.max(highLow, highClose, lowClose);
    });

    const atr = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window) {
            atr.push(trueRanges.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
        } else {
            atr.push((atr[i - 1] * (window - 1) + trueRanges[i]) / window);
        }
    }

    return atr;
}

function main(data) {
    const rsiValues = calculateRSI(data, 14);
    const atrValues = calculateATR(data, 14);
    const lastData = data[data.length - 1];
    const lastRSI = rsiValues[rsiValues.length - 1];
    const lastATR = atrValues[atrValues.length - 1];

    // Condizioni per rilevare i livelli di Quasimodo non sono direttamente traducibili senza ulteriori dettagli
    // Assumiamo quindi semplicemente di analizzare l'RSI e l'ATR dell'ultima candela

    if (lastRSI < 30) {
        // Logica per determinare il punto di ingresso Buy
        const tp = lastData.close + 2 * lastATR;
        const sl = lastData.close - lastATR;
        return {
            operation: 'buy',
            entry: lastData.close,
            tp: tp,
            percent_tp: ((tp - lastData.close) / lastData.close) * 100,
            sl: sl,
            percent_sl: ((lastData.close - sl) / lastData.close) * 100,
        };
    } else if (lastRSI > 70) {
        // Logica per determinare il punto di ingresso Sell
        const tp = lastData.close - 2 * lastATR;
        const sl = lastData.close + lastATR;
        return {
            operation: 'sell',
            entry: lastData.close,
            tp: tp,
            percent_tp: ((lastData.close - tp) / lastData.close) * 100,
            sl: sl,
            percent_sl: ((sl - lastData.close) / lastData.close) * 100,
        };
    } 
        // Nessuna condizione soddisfatta
        return null;
    
}