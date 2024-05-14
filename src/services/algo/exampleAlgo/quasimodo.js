const main = (data) => {
    const length = data.length;
    if (length < 5) {
        return null; // Non abbastanza dati per formare un pattern
    }

    // Trova i picchi e i minimi
    let peaks = [];
    let troughs = [];

    for (let i = 1; i < length - 1; i++) {
        if (data[i - 1].close < data[i].close && data[i + 1].close < data[i].close) {
            peaks.push({ index: i, price: data[i].close });
        } else if (data[i - 1].close > data[i].close && data[i + 1].close > data[i].close) {
            troughs.push({ index: i, price: data[i].close });
        }
    }

    // Analizza i picchi e i minimi per il pattern Quasimodo
    if (peaks.length < 3 || troughs.length < 2) {
        return null; // Non abbastanza picchi e minimi per formare un Quasimodo
    }

    // Verifica la formazione del Quasimodo
    const lastPeak = peaks[peaks.length - 1];
    const lastTrough = troughs[troughs.length - 1];
    const head = peaks.find(p => p.price === Math.max(...peaks.map(p => p.price)));

    if (head && lastTrough.price < troughs[0].price && lastPeak.price < head.price && lastPeak.index > lastTrough.index) {
        return {
            operation: lastPeak.price > data[length - 1].close ? 'buy' : 'sell',
            entry: data[length - 1].close,
            tp: lastPeak.price + (lastPeak.price - lastTrough.price), // semplice calcolo di take profit
            percent_tp: 10,
            sl: lastTrough.price, // stop loss al minimo pi recente
            percent_sl: 5
        };
    }

    return null;
};
