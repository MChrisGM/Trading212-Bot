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
            addr: 8000,
            authtoken: config.NGROK_AUTH_TOKEN,
            region: config.NGROK_REGION,
        });
        console.log(url);
        const opts = {
            errorCorrectionLevel: 'H',
            type: 'terminal',
            quality: 1,
            margin: 2,
            color: {
                dark: '#FFF',
                light: '#333333',
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
    console.log("Server running on port "+sr_param.address);

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