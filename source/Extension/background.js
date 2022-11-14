var serverhost = 'http://localhost:8000';

chrome.browserAction.onClicked.addListener(function(tab){
	chrome.tabs.create({ 'url': chrome.extension.getURL('normal_popup.html') }, function (tab) {
		// Tab opened. 
	});
})

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		var url = serverhost + '/' + request.addr;
		fetch(url, {
			method: "POST",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request.data) || ''
		})
			.then(response => response.json())
			.then(response => {
				let result = {
					'code': response.code || 400,
					'object': response.object || {}
				};
				sendResponse({ farewell: result });
			})
			.catch(error => error = 0);
		return true;
	});

function log(message) {
	console.log(message);
}





// fetch('https://demo.trading212.com/rest/v2/pending-orders/associated/cddfbc67-e830-4725-a58a-0ef5e4cd8fdf',{
// 	method: 'PUT',
// 	headers:{
// 	'Content-Type':'application/json'
// 	},
// 	body: JSON.stringify({"tp_sl":{"takeProfit":11561.85,"stopLoss":11800.97},"notify":"NONE"})
// })

// New order trigger:  document.getElementsByClassName("trading-actions")[0].children[0].children[0].click()
// Set buy: document.getElementsByClassName("instrument-price buy")[1].click()
// Set sell: document.getElementsByClassName("instrument-price sell")[1].click()
// Take Profit Trigger:  document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[3].children[0].click()
// Stop Loss Trigger: document.getElementsByClassName("css-u0d0cr scrollable-area")[2].children[0].children[4].children[0].click()
// Take Profit distance amount: document.getElementsByClassName("input css-jjd680")[3]
// Stop Loss distance amount: document.getElementsByClassName("input css-jjd680")[6]
// Confirm Order: document.getElementsByClassName("order-dialog-helper-node")[0].children[4].click()

// Current Graph Buy Price: document.getElementsByClassName("current-price-label current-buy-price-label")[0].children[1].textContent
// Current Graph Sell Price: document.getElementsByClassName("current-price-label current-sell-price-label")[0].children[1].textContent
// Candle timer: document.getElementsByClassName("candle-timer-label")[0].children[1].textContent

// Account Value: document.getElementsByClassName("account-status-header-value")[0].textContent
// Live result: document.getElementsByClassName("status-bar")[0].children[0].children[1].textContent

// Take Profit = (currentTP/1.01)+actualTP
// Stop loss = (currentSL*1.01)+actualSL

// Quick close: document.getElementsByClassName("svg-icon-holder close-all-icon")[0].click();
// Close all: document.getElementsByClassName("quick-close-all-content")[0].children[0].children[0].click();
// Confirm Close: document.getElementsByClassName("quick-close-all-content")[0].children[0].children[1].children[0].click();
