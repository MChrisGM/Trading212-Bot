const path = require('path');
var express = require("express");
var app = express();
const cors = require("cors");
const util = require('util');
const ngrok = require('ngrok');
const QRCode = require('qrcode');
const fs = require('fs');

const dotenv = require('dotenv').config({ path: path.join(__dirname, '.env') });
const config = dotenv.parsed;


let tr_param = require('./data/trading_parameters.json');
let sr_param = require('./data/server_parameters.json');

console.log('\nServer Parameters:');
console.dir(sr_param, { depth: null });
console.log('\nTrading Parameters:');
console.dir(tr_param, { depth: null });

let IndexPageURLCode = '';

try {
    (async function () {
        const url = await ngrok.connect({
            proto: 'http',
            addr: sr_param.address,
            authtoken: config.NGROK_AUTH_TOKEN,
            region: config.NGROK_REGION,
        });
        console.log(url);
        const opts = {
            errorCorrectionLevel: 'H',
            type: 'terminal',
            quality: 1,
            margin: 1,
            color: {
                dark: '#FFF',
                light: '#333',
            },
        }
        QRCode.toDataURL(url, opts).then(qrImage => { IndexPageURLCode = qrImage; }).catch(err => { console.error(err) });
    })();
} catch (err) {
    console.error(err);
}

let account = {
    acc_value: 0,
    live_res: 0,
    currency: '',
    history: {}
};

let instrument = {
    currently_open: false,
    has_rolledover: false,
    time: [0, 0],
    price: {
        sell_p: 0,
        buy_p: 0,
        sell_open: 0,
        sell_high: -1000000,
        sell_low: 10000000,
    },
    tp: 0,
    sl: 0,
    current_decision: '',
    tools: {
        current_bias: 0,
        trade_influence: 0,
        ema1: {},
        sma1: {},
        rsi: {},
    },
    rollover_turn: tr_param.rollover.rollover_period,
    history: {}
};

let open_position_ids = {};

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors());

app.listen(sr_param.address, () => {
    console.log("Server running on port " + sr_param.address);

    tr_param = JSON.parse(fs.readFileSync('./data/trading_parameters.json', 'utf8'));
    sr_param = JSON.parse(fs.readFileSync('./data/server_parameters.json', 'utf8'));

    setInterval(function () {
        let imported_tr_param = JSON.parse(fs.readFileSync('./data/trading_parameters.json', 'utf8'));
        let changed_tr_param = filter(tr_param, imported_tr_param);
        tr_param = imported_tr_param;
        let imported_sr_param = JSON.parse(fs.readFileSync('./data/server_parameters.json', 'utf8'));
        let changed_sr_param = filter(sr_param, imported_sr_param);
        sr_param = imported_sr_param;
        console.log('\n---Changed Parameters---');
        console.dir(changed_tr_param, { depth: null });
        console.dir(changed_sr_param, { depth: null });
        console.log('------------------------\n');
    }, sr_param.parameter_update_time * 1000);

    setInterval(function () {
        if (sr_param.reset_account) {
            account = {
                acc_value: 0,
                live_res: 0,
                currency: '',
                history: {}
            };
        }

        if (sr_param.reset_instrument) {
            instrument = {
                currently_open: false,
                has_rolledover: false,
                time: [0, 0],
                price: {
                    sell_p: 0,
                    buy_p: 0,
                    sell_open: 0,
                    sell_high: -1000000,
                    sell_low: 10000000,
                },
                tp: 0,
                sl: 0,
                current_decision: '',
                tools: {
                    current_bias: 0,
                    trade_influence: 0,
                    ema1: {},
                    sma1: {},
                    rsi: {},
                },
                rollover_turn: tr_param.rollover.rollover_period,
                history: {}
            };
        }
    }, 100);

});

app.use(express.static('./data/public'));

app.post('/server-data', (req, res, next) => {
    res.json({ 'Account': account, 'Instrument': instrument, 'Parameters': tr_param, 'QRCode': IndexPageURLCode });
});

app.post("/conn", (req, res, next) => {
    console.log('Extension Connected!');
    let r = { 'code': '200' };
    res.json(r);
});

app.post("/data", (req, res, next) => {

    let data = req.body;
    parseData(data)

    const t = getTime();
    calculateIndicators(t);

    let { decision, reason } = makeDecision();

    let r = { 'code': '200', 'object': { 'decision': decision, 'reason': reason } };
    res.json(r);
});

function filter(obj1, obj2) {
    var result = {};
    for (key in obj1) {
        if (obj2[key] != obj1[key]) result[key] = obj2[key];
        if (typeof obj2[key] == 'array' && typeof obj1[key] == 'array')
            result[key] = arguments.callee(obj1[key], obj2[key]);
        if (typeof obj2[key] == 'object' && typeof obj1[key] == 'object')
            result[key] = arguments.callee(obj1[key], obj2[key]);
    }
    return result;
}

function parseData(data) {
    const b = parseFloat(data.bp);
    const s = parseFloat(data.sp);

    let t_array = data.ct.split(':');
    const candle = [parseInt(t_array[0]), parseInt(t_array[1])];
    instrument.time = candle || [0, 0];

    if (instrument.time[0] >= tr_param.timeframe - 1 && instrument.time[0] < tr_param.timeframe && instrument.time[1] > 58) {
        instrument.price.sell_high = -1000000;
        instrument.price.sell_low = 10000000;
        instrument.has_rolledover = false;
    }
    if (instrument.time[1] > 58) {
        instrument.has_rolledover = false;
    }
    if (s > instrument.price.sell_high) {
        instrument.price.sell_high = s;
    }
    if (instrument.price.sell_low > s) {
        instrument.price.sell_low = s;
    }

    instrument.price.buy_p = b || instrument.price.buy_p;
    instrument.price.sell_p = s || instrument.price.sell_p;


    account.currency = data.av || '€';
    account.currency = account.currency.charAt(0);
    account.live_res = data.lr || account.live_res;
    account.live_res = parseFloat(String(account.live_res).replace(account.currency, '').replace(',', '')).toFixed(2);
    account.acc_value = data.av || account.acc_value;
    account.acc_value = parseFloat(String(account.acc_value).replace(account.currency, '').replace(',', '')).toFixed(2);
    account.acc_value = parseFloat(account.acc_value - account.live_res).toFixed(2);

}

function calculateIndicators(t) {
    account.history[t['TS']] = account.acc_value;

    if (instrument.history[t['TS']]) {
        instrument.history[t['TS']]['Time'] = t['R'];
        instrument.history[t['TS']]['Price']['BUY'] = instrument.price.buy_p;
        instrument.history[t['TS']]['Price']['SELL'] = instrument.price.sell_p;
        instrument.history[t['TS']]['Price']['HIGH'] = instrument.price.sell_high;
        instrument.history[t['TS']]['Price']['LOW'] = instrument.price.sell_low;
    } else {
        instrument.history[t['TS']] = {
            'Time': t['R'],
            'Price': {
                'BUY': instrument.price.buy_p,
                'SELL': instrument.price.sell_p,
                'HIGH': instrument.price.sell_high,
                'LOW': instrument.price.sell_low
            },
            'Decision': {

            }
        }
    }


    instrument.tools.ema1[t['TS']] = 0;
    let ema_mult = 2 / (tr_param.tools.ema_period + 1);
    if (!instrument.tools.ema1[t['TS'] - 1]) {
        instrument.tools.ema1[t['TS']] = instrument.price.sell_p;
    } else {
        let prev_ema = instrument.tools.ema1[t['TS'] - 1] * (1 - ema_mult);
        let new_ema = instrument.tools.sell_p * ema_mult + prev_ema;
        instrument.tools.ema1[t['TS']] = new_ema;
    }
    instrument.tools.sma1[t['TS']] = 0;
    let sum = 0;
    let idx = 0;
    if (Object.keys(instrument.tools.sma1).length > tr_param.tools.sma_period) {
        for (let i = 0; i < tr_param.tools.sma_period * tr_param.tools.timeframe; i) {
            if (instrument.history[t['TS'] - i]) {
                sum += instrument.history[t['TS'] - i]['Price']['SELL'];
                idx++;
            } else {
                break;
            }
            i += tr_param.timeframe;
        }
        sum = sum / idx;
        instrument.tools.sma1[t['TS']] = sum;
    }
}

function makeDecision() {
    let decision = 'No decision';
    let reason = '';
    let options = tr_param.trading_options;
    const t = getTime();
    if (!instrument.currently_open && !instrument.history[t['TS']]['Decision']['Closed']) {
        if (instrument.tools.sma1[t['TS'] - tr_param.timeframe] && instrument.tools.ema1[t['TS'] - tr_param.timeframe]) {
            const ema = instrument.tools.ema1[t['TS'] - tr_param.timeframe];
            const sma = instrument.tools.sma1[t['TS'] - tr_param.timeframe];
            let difference = ema - sma;
            let bias = normal(difference, -tr_param.bias.bias_range, tr_param.bias.bias_range);
            let trade_influence = 0;
            let h1 = account.history[t['TS'] - 2];
            let h2 = account.history[t['TS'] - 1];
            if (instrument.history[t['TS'] - 1]['Decision']) {
                if (h1 < h2) {
                    if (instrument.history[t['TS'] - 1]['Decision']['Decision'] == 'buy') {
                        trade_influence += tr_param.bias.last_trade_influence;
                    } else {
                        trade_influence -= tr_param.bias.last_trade_influence;
                    }
                } else if (h1 > h2) {
                    if (instrument.history[t['TS'] - 1]['Decision']['Decision'] == 'buy') {
                        trade_influence -= tr_param.bias.last_trade_influence;
                    } else {
                        trade_influence += tr_param.bias.last_trade_influence;
                    }
                }
            }
            bias += trade_influence;
            let d = getRndBias(0, 1, bias, tr_param.bias.bias_influence);
            instrument.tools.current_bias = bias;
            instrument.tools.trade_influence = trade_influence;
            decision = options[Math.round(d)];
            instrument.currently_open = true;
            reason = 'Bias was: ' + bias + '. Choice was: ' + d + '. Trade influence was: ' + trade_influence;
            instrument.history[t['TS']]['Decision'] = { 'Decision': decision, 'Reason': reason, 'Closed': false };
        } else {
            reason = 'No EMA or SMA data';
        }
    } else {
        reason = 'Can not open position';
    }

    return { decision, reason }
}

function getTime() {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = ("0" + date_ob.getHours()).slice(-2);
    let minutes = ("0" + date_ob.getMinutes()).slice(-2);
    return {
        'TS': Math.floor(((Date.now() / 1000) / 60)),
        'R': year + "-" + month + "-" + date + " " + hours + ":" + minutes
    };
}

function getRndBias(min, max, bias, influence) {
    var rnd = Math.random() * (max - min) + min,
        mix = Math.random() * influence;
    return rnd * (1 - mix) + bias * mix;
}

function normal(val, min, max) {
    return (val - min) / (max - min);
}

function getRandomElement(list) {
    let index = Math.floor((Math.random() * list.length))
    return { el: list[index], idx: index };
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
};