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

let tr_param = JSON.parse(fs.readFileSync('./data/trading_parameters.json', 'utf8'));
let sr_param = JSON.parse(fs.readFileSync('./data/server_parameters.json', 'utf8'));

let IndexPageURLCode = '';

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

