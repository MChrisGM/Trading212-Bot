

window.onload = function () {

    let acc_val_label = document.getElementById('acc_val');
    let live_val_label = document.getElementById('live_val');
    let candle_time_label = document.getElementById('candle_time');
    let qrcode = document.getElementById('QRCode');

    setInterval(function () {
        fetch(window.location.href+'server-data', { method: 'POST' })
            .then(response => response.json())
            .then(response => handleDataResponse(response))
            .catch(error => console.error(error))
    }, 250);

    function createAccountGraph(response){
        let xaxis = Object.keys(response['Account'].history).map(function (x) { return new Date(x * 60 * 1000) });
        let yaxis = Object.values(response['Account'].history).map(function (x) { return parseFloat(x) })
        var trace1 = {
            x: xaxis,
            y: yaxis,
            mode: 'lines',
            line: {
                color: 'rgb(55, 128, 191)',
                width: 3
            }
        };
        var data = [trace1];
        var layout = {
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
                color:'white',
                showexponent: 'all'
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
                color:'white',
                showexponent: 'all'
            },
            margin: {
                l: 50,
                r: 20,
                b: 20,
                t: 20,
                pad: 0
              },
            paper_bgcolor:'rgb(71,71,71)',
            plot_bgcolor:'rgb(51,51,51)',

        };
        Plotly.newPlot('AccountGraph', data, layout,{displayModeBar: false, responsive: true});
    }

    function createPriceGraph(response){
        let xaxis = Object.keys(response['Instrument'].history).map(function (x) { return new Date(x * 60 * 1000) });
        let yaxis = Object.values(response['Instrument'].history).map(function (x) { return parseFloat(x) })
        var trace1 = {
            x: xaxis,
            y: yaxis,
            mode: 'lines',
            line: {
                color: 'rgb(55, 128, 191)',
                width: 3
            }
        };
        var data = [trace1];
        var layout = {
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
                color:'white',
                showexponent: 'all'
            },
            yaxis: {
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
                color:'white',
                showexponent: 'all'
            },
            margin: {
                l: 50,
                r: 20,
                b: 20,
                t: 20,
                pad: 0
              },
            paper_bgcolor:'rgb(71,71,71)',
            plot_bgcolor:'rgb(51,51,51)',

        };
        Plotly.newPlot('PriceGraph', data, layout,{displayModeBar: false, responsive: true});
    }

    function handleDataResponse(response) {

        let av = parseFloat(response['Account'].acc_value);
        let lr = parseFloat(response['Account'].live_res);
        let cd = response['Instrument'].time;
        let currency = response['Account'].currency;
        acc_val_label.textContent = av.toLocaleString()+currency;
        live_val_label.textContent = lr.toLocaleString()+currency;
        candle_time_label.textContent = ("0" + cd[0]).slice(-2)+':'+("0" + cd[1]).slice(-2);
        qrcode.src = response['QRCode'];

        if (parseFloat(lr) > 0) {
            live_val_label.style.color = 'rgb(0,255,0)';
        } else if (parseFloat(lr) < 0) {
            live_val_label.style.color = 'rgb(255,0,0)';
        } else {
            live_val_label.style.color = 'rgb(255,255,255)';
        }

        createAccountGraph(response);
        createPriceGraph(response);

    }

}

