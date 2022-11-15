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

let clog = console.log;
console.log = function(data){clog(getTime()['R']+' -> '+data);}

let cdir = console.dir;
console.dir = function(data){console.log('');cdir(data);}

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
        if (sr_param.show_changed_parameters) {
            console.log('\n---Changed Parameters---');
            console.dir(changed_tr_param, { depth: null });
            console.dir(changed_sr_param, { depth: null });
            console.log('------------------------\n');
        }
    }, sr_param.parameter_update_time * 1000);

    setInterval(function () {
        if (sr_param.show_instrument) {
            console.log('\n---Instrument---');
            console.dir(instrument, { depth: null });
            console.log('------------------------\n');
        }
    }, sr_param.instrument_update_time * 1000);

    setInterval(function () {
        if (sr_param.show_account) {
            console.log('\n---Account---');
            console.dir(account, { depth: null });
            console.log('------------------------\n');
        }
    }, sr_param.account_update_time * 1000);

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

function makeDecision() {
    let decision = 'No decision';
    let reason = '';
    let options = tr_param.trading_options;
    const t = getTime();

    if(instrument.currently_open){
        
        if(instrument.tools.ema1.length >= instrument.tools.ema_period && instrument.tools.sma1.length >= instrument.tools.sma_period){
            
            let last_price = instrument.history[t['TS']-1]['Price']['SELL'];

            let emaN = instrument.tools.ema1[t['TS']-1];
            let emaO = instrument.tools.ema1[t['TS']-2];
            let ema_angle = Math.atan2(emaN - emaO, 1) * 180 / Math.PI;

            let smaN = instrument.tools.sma1[t['TS']-1];
            let smaO = instrument.tools.sma1[t['TS']-2];
            let sma_angle = Math.atan2(smaN - smaO, 1) * 180 / Math.PI;

            if(ema_angle > 0 && sma_angle > 0){
                decision = 'buy';
                reason = 'Both EMA and SMA going up. Angles: '+ema_angle+', '+sma_angle;
            }else if(ema_angle < 0 && sma_angle < 0){
                decision = 'sell';
                reason = 'Both EMA and SMA going down. Angles: '+ema_angle+', '+sma_angle;
            }else if(emaN > last_price){
                decision = 'buy';
                reason = 'EMA above last price.';
            }else if(emaN < last_price){
                decision = 'sell';
                reason = 'EMA below last price.';
            }
        }else{
            reason = 'Not enough SMA or EMA data.';
        }

        if(decision == 'buy' || decision == 'sell'){
            instrument.currently_open = false;
            instrument.current_decision = decision;
        }
    }else{
        if(instrument.time[1] < 1){
            decision = 'close';
            reason = 'Candle time.';
        }
    }

    return { decision, reason }
}

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
        instrument.currently_open = true;
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

    instrument.tools.ema1[t['TS']] = instrument.price.sell_p;
    let ema_mult = 2 / (tr_param.tools.ema_period + 1);
    if (!instrument.tools.ema1[t['TS'] - 1]) {
        instrument.tools.ema1[t['TS']] = instrument.price.sell_p;
    } else {
        let prev_ema = instrument.tools.ema1[t['TS'] - 1] * (1 - ema_mult);
        let new_ema = instrument.price.sell_p * ema_mult + prev_ema;
        instrument.tools.ema1[t['TS']] = new_ema;
    }
    instrument.tools.sma1[t['TS']] = instrument.price.sell_p;
    let sum = 0;
    let idx = 0;
    if (Object.keys(instrument.tools.sma1).length > tr_param.tools.sma_period) {
        for (let i = 0; i < tr_param.tools.sma_period * tr_param.timeframe; i) {
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