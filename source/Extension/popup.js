let bgPage = chrome.extension.getBackgroundPage();

function clog(message) {
	bgPage.log('Pop-Up -> ' + message);
}

let executingScript = false;

let connection_established = false;
document.getElementById('server_status').innerText = 'Not Connected!';
document.getElementById('server_status').style.color = '#fa6464';


// {
//     "tradingType": "CFD",
//     "accountId": 11971552,
//     "accountSession": "4eb0b138-3071-4255-a84d-73c6bd305b0b",
//     "customerSession": "4eb0b138-3071-4255-a84d-73c6bd305b0b",
//     "email": "mchrisgm@gmail.com",
//     "rememberMeCookie": null,
//     "subSystem": "DEMO",
//     "customerId": "4d9c9251-c07f-4f0f-851a-eeab5d8df995",
//     "backupCode": null,
//     "loginToken": null,
//     "sessionCookieName": "TRADING212_SESSION_DEMO",
//     "customerCookieName": "CUSTOMER_SESSION",
//     "customer": {
//         "id": 6049671,
//         "uuid": "4d9c9251-c07f-4f0f-851a-eeab5d8df995",
//         "email": "mchrisgm@gmail.com",
//         "dealer": "AVUSUK",
//         "lang": "EN",
//         "timezone": "Europe/London",
//         "registerDate": "2020-07-25T06:41:41+03:00"
//     },
//     "account": {
//         "id": 11971552,
//         "customerId": 6049671,
//         "type": "DEMO",
//         "createdDate": "2020-07-25T12:56:42.000+00:00",
//         "lastSwitchedDate": "2020-11-06T21:13:00.000+00:00",
//         "tradingType": "CFD",
//         "status": "ACTIVE",
//         "registerSource": "IOS",
//         "currencyCode": "EUR",
//         "readyToTrade": true
//     },
//     "serverTimestamp": "2022-11-09T17:44:04.809411433+02:00"
// }

// X-Trader-Client: application=WC4, version=2.2.62, accountId=11971552, dUUID=ed270909-eea8-417e-aa59-2b6ea8d66c39
// X-Trader-Id: 29767d24-3ac9-7cca-b189-bf4e5fc498be
// X-Trader-SeqId: 43

function buy() {
	if (executingScript) { return }
	executingScript = true;
	const code = `(function getUrls(){
	// New order trigger:  
	document.getElementsByClassName("trading-actions")[0].children[0].children[0].click();

	// Set buy: 
	document.getElementsByClassName("instrument-prices-active-direction active-buy")[0].children[0].children[1].click()

	// Set sell: document.getElementsByClassName("instrument-price sell")[1].click()
	
	// Take Profit Trigger:  
	document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[3].children[0].click();

	// Stop Loss Trigger: 
	document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[4].children[0].click();
	
	// Take Profit distance amount: document.getElementsByClassName("input css-jjd680")[3]
	// Stop Loss distance amount: document.getElementsByClassName("input css-jjd680")[6]

	// Confirm Order: 
	document.getElementsByClassName("order-dialog-helper-node")[0].children[4].click();

	const price = parseFloat(document.getElementsByClassName("current-price-label current-buy-price-label")[0].children[1].textContent);

	fetch('http://localhost:8000/get-last-position',{method: "POST",})
		.then(response => response.json())
		.then(response => {
			console.log(response);
			let trade_id = response.id || '';
			console.log(trade_id);
			if(trade_id != ''){
				fetch('https://demo.trading212.com/rest/v2/pending-orders/associated/'+trade_id,{
					method: 'PUT',
					headers:{
					'Content-Type':'application/json',
					'X-Trader-Client': 'application=WC4, version=2.2.61-1, accountId=11971552, dUUID=ed270909-eea8-417e-aa59-2b6ea8d66c39',
                    'X-Trader-Id': '1dcb9284-ccd0-fe93-f588-f99572c149eb'
					},
					body: JSON.stringify({"tp_sl":{"takeProfit":(price*(1+response.tp/100)).toFixed(2),"stopLoss":(price*(1-response.sl/100)).toFixed(2)},"notify":"NONE"})
				}).then(response => console.log('Sent TP & SL'))
			}
		})
		.catch(error => console.dir(error));
	
	return true;

	})()`;

	chrome.tabs.getSelected(null, function (tab) {
		chrome.tabs.executeScript(tab.id, { code }, function (result) {
			// chrome.runtime.sendMessage({'addr':'data','data':result[0]}, (response) => {

			// });
			executingScript = false;
		});
	});
}

function sell() {
	if (executingScript) { return }
	executingScript = true;
	const code = `(function getUrls(){
	// New order trigger:  
	document.getElementsByClassName("trading-actions")[0].children[0].children[0].click();

	// Set buy: document.getElementsByClassName("instrument-price buy")[1].click();

	// Set sell: 
	document.getElementsByClassName("instrument-prices-active-direction active-buy")[0].children[0].children[0].click()
	
	// Take Profit Trigger:  
	document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[3].children[0].click();

	// Stop Loss Trigger: 
	document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[4].children[0].click();
	
	// Take Profit distance amount: document.getElementsByClassName("input css-jjd680")[3]
	// Stop Loss distance amount: document.getElementsByClassName("input css-jjd680")[6]

	// Confirm Order: 
	document.getElementsByClassName("order-dialog-helper-node")[0].children[4].click();

	const price = parseFloat(document.getElementsByClassName("current-price-label current-sell-price-label")[0].children[1].textContent);

	fetch('http://localhost:8000/get-last-position',{method: "POST",})
		.then(response => response.json())
		.then(response => {
			let trade_id = response.id || '';
			console.log(trade_id);
			if(trade_id != ''){
				fetch('https://demo.trading212.com/rest/v2/pending-orders/associated/'+trade_id,{
					method: 'PUT',
					headers:{
					'Content-Type':'application/json',
					'X-Trader-Client': 'application=WC4, version=2.2.61-1, accountId=11971552, dUUID=ed270909-eea8-417e-aa59-2b6ea8d66c39',
                    'X-Trader-Id': '1dcb9284-ccd0-fe93-f588-f99572c149eb'
					},
					body: JSON.stringify({"tp_sl":{"takeProfit":(price*(1-response.tp/100)).toFixed(2),"stopLoss":(price*(1+response.sl/100)).toFixed(2)},"notify":"NONE"})
				}).then(response => console.log('Sent TP & SL'));
			}
		})
		.catch(error => console.dir(error));

	return true;

	})()`;

	chrome.tabs.getSelected(null, function (tab) {
		chrome.tabs.executeScript(tab.id, { code }, function (result) {
			// chrome.runtime.sendMessage({'addr':'data','data':result[0]}, (response) => {

			// });
			executingScript = false;
		});
	});
}

function closeAll() {
	if (executingScript) { return }
	executingScript = true;
	const code = `(function getUrls(){
		
		// Quick close: 
		document.getElementsByClassName("svg-icon-holder close-all-icon")[0].click();
		
		// Close all: 
		document.getElementsByClassName("quick-close-all-content")[0].children[0].children[0].click();
		
		// Confirm Close: 
		document.getElementsByClassName("quick-close-all-content")[0].children[0].children[1].children[0].click();

		// Quick close: 
		document.getElementsByClassName("svg-icon-holder close-all-icon")[0].click();
	
		return true;
	
		})()`;

	chrome.tabs.getSelected(null, function (tab) {
		chrome.tabs.executeScript(tab.id, { code }, function (result) {
			// chrome.runtime.sendMessage({'addr':'data','data':result[0]}, (response) => {

			// });
			executingScript = false;
		});
	});
}

$(function () {
	$('#buy').click(function () {
		buy();
	})
});

$(function () {
	$('#sell').click(function () {
		sell();
	})
});

$(function () {
	$('#close').click(function () {
		closeAll();
	})
});

setInterval(function () {
	const code2 = `(function removeDialog(){
			console.log('Checking for dialog box');
			if(document.getElementsByClassName("dialog white").length>0){
				document.getElementsByClassName("dialog white")[0].children[1].children[0].click();
			}
			return;
		})()`;
	chrome.tabs.getSelected(null, function (tab) {
		chrome.tabs.executeScript(tab.id, { code2 }, function (result) { });
	});
}, 100);

$(function () {
	$('#connect').click(function () {
		if (!connection_established) {
			clog("Connecting to server...");
			chrome.runtime.sendMessage({ 'addr': 'conn' }, (response) => {
				if (response.farewell.code == 200) {
					connection_established = true;
					document.getElementById('server_status').innerText = 'Connected!';
					document.getElementById('server_status').style.color = '#1bc47d';
					clog("Connected to server");
				} else if (response.farewell.code == 400) {
					clog("Failed to connect to server");
				} else {
					clog("Something went wrong. Can not connect to server. Error code: " + response.farewell.code);
				}
			});

			// const xmlCode = `
			// (function xhrIntercept(){
			// 	let responses = [];
			// 	(function(XHR) {
			// 		"use strict";
			// 		var open = XHR.prototype.open;
			// 		var send = XHR.prototype.send;
			// 		XHR.prototype.open = function(method, url, async, user, pass) {
			// 			this._url = url;
			// 			open.call(this, method, url, async, user, pass);
			// 		};
			// 		XHR.prototype.send = function(data) {
			// 			var self = this;
			// 			var oldOnReadyStateChange;
			// 			var url = this._url;
			// 			function onReadyStateChange() {
			// 				if(self.readyState == 4 /* complete */) {
			// 					/* This is where you can put code that you want to execute post-complete*/
			// 					/* URL is kept in this._url */
			// 					// console.dir(this._url);
			// 					if(this._url == '/rest/v2/trading/open-positions'){
			// 						let obj = JSON.parse(this.responseText);
			// 						responses.push(obj);
			// 						// console.dir(responses);
            //                         fetch('http://localhost:8000/open-positions', {
            //                 			method: "POST",
            //                 			headers: { 'Content-Type': 'application/json' },
            //                 			body: JSON.stringify(responses)
            //                 		}).catch(error => console.dir(error));
			// 					}
			// 				}
			// 				if(oldOnReadyStateChange) {
			// 					oldOnReadyStateChange();
			// 				}
			// 			}
			// 			/* Set xhr.noIntercept to true to disable the interceptor for a particular call */
			// 			if(!this.noIntercept) {            
			// 				if(this.addEventListener) {
			// 					this.addEventListener("readystatechange", onReadyStateChange, false);
			// 				} else {
			// 					oldOnReadyStateChange = this.onreadystatechange; 
			// 					this.onreadystatechange = onReadyStateChange;
			// 				}
			// 			}
			// 			send.call(this, data);
			// 		}
			// 	})(XMLHttpRequest);
			// 	console.log('Script injected');
			// 	return;
			// })();`;
			// chrome.tabs.getSelected(null, function (tab) {
			// 	chrome.tabs.executeScript(tab.id, { xmlCode }, function (result) {
			// 		// chrome.runtime.sendMessage({'addr':'data','data':result[0]}, (response) => {

			// 		// });
			// 	});
			// });
			setInterval(function () {
				chrome.runtime.sendMessage({ 'addr': 'conn' }, (response) => {
					if (response.farewell.code == 200) {
						connection_established = true;
						document.getElementById('server_status').innerText = 'Connected!';
						document.getElementById('server_status').style.color = '#1bc47d';
						clog("Connected to server");
					} else if (response.farewell.code == 400) {
						clog("Failed to connect to server");
					} else {
						clog("Something went wrong. Can not connect to server. Error code: " + response.farewell.code);
					}
				});
			}, 60000);

			
		}
	});
});

setInterval(function () {
	if (connection_established) {
		const code = `(function getUrls(){
			let data = {
				'sp':0,
				'bp':0,
				'ct':'00:00',
				'av':0,
				'lr':0
			}
			try {
				let sell_p = document.getElementsByClassName("current-price-label current-sell-price-label")[0].children[1].textContent || '0';
				let buy_p = document.getElementsByClassName("current-price-label current-buy-price-label")[0].children[1].textContent || '0';
				let candle_time = document.getElementsByClassName("candle-timer-label")[0].children[1].textContent || '00:00';
				let acc_val = document.getElementsByClassName("account-status-header-value")[0].textContent || '0';
				let live_res = document.getElementsByClassName("status-bar")[0].children[0].children[1].textContent || '0';
				data = {
					'sp':sell_p,
					'bp':buy_p,
					'ct':candle_time,
					'av':acc_val,
					'lr':live_res
				}
				return data;
			  }
			  catch(err) {}
			  return data;
		})()`;

		chrome.tabs.getSelected(null, function (tab) {
			chrome.tabs.executeScript(tab.id, { code }, function (result) {
				chrome.runtime.sendMessage({ 'addr': 'data', 'data': result[0] }, (response) => {
					clog('Decision: --' + response.farewell.object.decision + '-- Reason: ' + response.farewell.object.reason);
					if (response.farewell.object.decision == 'buy') {
						buy();
					} else if (response.farewell.object.decision == 'sell') {
						sell();
					} else if (response.farewell.object.decision == 'close') {
						closeAll();
					}
				});
			});
		});
	}
}, 500);