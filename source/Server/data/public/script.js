

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
                tickangle: 'auto',
                tickfont: {
                    family: 'Old Standard TT, serif',
                    size: 14,
                    color: 'white'
                },
                color:'white',
                showexponent: 'all'
            },
            yaxis: {
                title: 'Account Value',
                titlefont: {
                    family: 'Arial, sans-serif',
                    size: 18,
                    color: 'white'
                },
                showticklabels: true,
                tickangle: 45,
                tickfont: {
                    family: 'Old Standard TT, serif',
                    size: 14,
                    color: 'white'
                },
                color:'white',
                showexponent: 'all'
            },
            paper_bgcolor:'rgb(51,51,51)',
            plot_bgcolor:'rgb(51,51,51)',

        };
        Plotly.newPlot('myDiv', data, layout,{displayModeBar: false, responsive: true});

        // console.log(response['Instrument']);
    }


}

