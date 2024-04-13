import { Algorithm } from '../../api/algorithm/model.js';
import vm from 'vm';
import moment from 'moment';

export const executeAlgo = async (historicalData, algo) => {
    try {
        let res = null;
        switch (algo.language) {
            case 'python':
                res = await executePythonAlgorithm(algo.script, historicalData);
                break;
            case 'javascript':
                res = await executeNodeJsAlgorithm(algo.script, historicalData);
                break;
        }
        return res;
    } catch (e) {
        console.log(e)
    }
}


export const executePythonAlgorithm = async (script, historicalData) => {
    // return new Promise((resolve, reject) => {
    //     exec(`python -c "${script}" "${historicalData}"`, (error, stdout, stderr) => {
    //         if (error) {
    //             reject(error);
    //         }
    //         resolve(stdout);
    //     });
    // });
    return 'Not implemented yet.'
}

export const executeNodeJsAlgorithm = async (script, historicalData) => {
    return new Promise((resolve, reject) => {
        try {
            let sandbox = {
                console: console,
                data: historicalData,
                result: null,
            };
            // console.log('Esecuzione del codice con data finale:', moment(historicalData[historicalData.length - 1].timestamp).format('YYYY-MM-DD HH:mm:ss'), 'e risultati:', historicalData[historicalData.length - 1]);
            const decodedScript = Buffer.from(script, 'base64').toString('ascii');
            const executionScript = decodedScript + ' result = main(data);';
            // Crea un contesto sandbox per eseguire il tuo codice in modo sicuro
            vm.createContext(sandbox);

            // Esegue il codice, compresa la funzione con i suoi argomenti
            vm.runInContext(executionScript, sandbox);

            // Se il sandbox result ha qualcosa diverso da nullo, invia il risultato a tutte le subscription
            resolve(sandbox.result);
        } catch (err) {
            console.error('Si è verificato un errore durante l\'esecuzione del codice:', err);
        }
    });
}