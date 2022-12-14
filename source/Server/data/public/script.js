window.onload = function () {

    let show_last_points = 30;
    let point_left = show_last_points;

    let acc_val_label = document.getElementById('acc_val');
    let live_val_label = document.getElementById('live_val');
    let candle_time_label = document.getElementById('candle_time');
    let qrcode = document.getElementById('QRCode');

    let accountPlot = document.getElementById("AccountGraph");

    let xaxis;
    let yaxis;
    let xaxisPrice;
    let yaxisPrice;
    let xaxisSMA;
    let yaxisSMA;
    let xaxisEMA;
    let yaxisEMA;
    let data;

    let layout = {
        xaxis: {
            titlefont: {
                family: 'Arial, sans-serif',
                size: 18,
                color: 'white'
            },
            showticklabels: true,
            tickangle: 0,
            tickfont: {
                family: 'Old Standard TT, serif',
                size: 18,
                color: 'white'
            },
            color: 'white',
            showexponent: 'all',
            type: 'date'
        },
        yaxis: {
            title: 'Account Value',
            titlefont: {
                family: 'Arial, sans-serif',
                size: 20,
                color: 'white'
            },
            showticklabels: true,
            tickangle: -90,
            tickfont: {
                family: 'Old Standard TT, serif',
                size: 18,
                color: 'white'
            },
            color: 'white',
            showexponent: 'all'
        },
        yaxis2: {
            title: 'Price',
            titlefont: {
                family: 'Arial, sans-serif',
                size: 20,
                color: 'white'
            },
            showticklabels: true,
            tickangle: -90,
            tickfont: {
                family: 'Old Standard TT, serif',
                size: 18,
                color: 'white'
            },
            color: 'white',
            showexponent: 'all',
            overlaying: 'y',
            side: 'right',
        },
        margin: {
            l: 50,
            r: 50,
            b: 20,
            t: 20,
            pad: 0
        },
        showlegend: false,
        paper_bgcolor: 'rgb(71,71,71)',
        plot_bgcolor: 'rgb(51,51,51)',

    };

    Plotly.newPlot(accountPlot, data, layout, { displayModeBar: true, responsive: true });

    setInterval(function () {
        fetch(window.location.href + 'server-data', { method: 'POST' })
            .then(response => response.json())
            .then(response => handleDataResponse(response))
            .catch(error => console.error(error))
    }, 250);

    function notZero(x) {
        if (x == 0) { return null; }
        else { return x; }
    }

    function updateGraphData(response) {
        xaxis = Object.keys(response['Account'].history).map(function (x) { return new Date(x * 60 * 1000) });
        yaxis = Object.values(response['Account'].history).map(function (x) { return notZero(parseFloat(x)) });
        var trace1 = {
            x: xaxis,
            y: yaxis,
            mode: 'lines',
            line: {
                color: 'rgb(125, 255, 150)',
                width: 3
            }
        };

        xaxisPrice = Object.keys(response['Instrument'].history).map(function (x) { return new Date(x * 60 * 1000) });
        yaxisPrice = Object.values(response['Instrument'].history).map(function (x) { return notZero(parseFloat(x['Price']['SELL'])) });
        var price = {
            x: xaxisPrice,
            y: yaxisPrice,
            yaxis: 'y2',
            mode: 'lines',
            line: {
                color: 'rgb(55, 128, 191)',
                width: 3
            }
        };

        xaxisSMA = Object.keys(response['Instrument'].tools.sma1).map(function (x) { return new Date(x * 60 * 1000) });
        yaxisSMA = Object.values(response['Instrument'].tools.sma1).map(function (x) { return notZero(parseFloat(x)) });
        var sma = {
            x: xaxisSMA,
            y: yaxisSMA,
            yaxis: 'y2',
            mode: 'lines',
            line: {
                color: 'rgb(255, 255, 255)',
                width: 3
            }
        };

        xaxisEMA = Object.keys(response['Instrument'].tools.ema1).map(function (x) { return new Date(x * 60 * 1000) });
        yaxisEMA = Object.values(response['Instrument'].tools.ema1).map(function (x) { return notZero(parseFloat(x)) });
        var ema = {
            x: xaxisEMA,
            y: yaxisEMA,
            yaxis: 'y2',
            mode: 'lines',
            line: {
                color: 'rgb(255, 255, 0)',
                width: 3
            }
        };
        data = [trace1, price, sma, ema];
    }

    function handleDataResponse(response) {

        let av = parseFloat(response['Account'].acc_value);
        let lr = parseFloat(response['Account'].live_res);
        let cd = response['Instrument'].time;
        let currency = response['Account'].currency;
        acc_val_label.textContent = av.toLocaleString() + currency;
        live_val_label.textContent = lr.toLocaleString() + currency;
        candle_time_label.textContent = ("0" + cd[0]).slice(-2) + ':' + ("0" + cd[1]).slice(-2);
        qrcode.src = response['QRCode'];

        if (parseFloat(lr) > 0) {
            live_val_label.style.color = '#1bc47d';
        } else if (parseFloat(lr) < 0) {
            live_val_label.style.color = '#fa6464';
        } else {
            live_val_label.style.color = 'rgb(255,255,255)';
        }

        updateGraphData(response);
        Plotly.react(accountPlot, data, layout);

    }

}

