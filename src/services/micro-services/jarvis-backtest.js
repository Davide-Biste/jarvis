import axios from 'axios'

export const jarvisBacktest = axios.create({
    baseURL: process.env.JARVIS_BACKTEST_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    }
})