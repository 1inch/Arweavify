let chromeContentSettings = chrome.contentSettings;
let url;
let extractHostname = new RegExp('^(?:f|ht)tp(?:s)?\:\/\/([^\/]+)', 'im');
let forbiddenOrigin = /(http[s]?\:\/\/[a-z0-9].*\.?arweave\.net\/?[\w\-]*$)/g;
let setting;
let tabId;
let matchForbiddenOrigin;

if (chromeContentSettings) {
    
    chrome.tabs.onUpdated.addListener(function (tabId, props, tab) {
        if (props.status == undefined){
            return;
        }

        if (props.status == "loading") {
            getSettings(true);
        } else {
            getSettings(false);
        }
    });
}

function getFieldData(field) {
    return new Promise(function(ok, fail){
        $("#tx_"+field).load(updateUrlToTx(url, field), function(){
            try{
                ok(JSON.parse($("#tx_"+field).html()));
            } catch(error) {
                if (error.toString().indexOf('SyntaxError: Unexpected token ') != -1 ||
                    error.toString().indexOf('SyntaxError: Unexpected end of JSON input') != -1){

                    ok($("#tx_"+field).html());
                } else {
                    fail('Incorrect data from ' + updateUrlToTx(url, field));
                }
            }
        });
    });
}

function doStuffWithDom(domContent, isDataBinary = false) {
    let tx = {
        'owner':'', 
        'target':'', 
        'data': '',
        'quantity':'', 
        'reward':'', 
        'last_tx':'', 
        'tags': [],
        'signature':'',
    };
    let tx_status = {
        'owner':false, 
        'target':false, 
        'data':false,
        'quantity':false, 
        'reward':false, 
        'last_tx':false, 
        'tags':false,
        'signature':false,
    };

    for(let key in tx) {
        if(key != 'data') {
            getFieldData(key).then(value => {
                tx[key] = value;
            }).catch(error => {
                alert(error.toString());
            }).finally(() => {
                tx_status[key] = true;
            });
        }
    }

    if(!isDataBinary){
        tx['data'] = domContent;
        tx_status['data'] = true;
    } else {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        oReq.responseType = "arraybuffer";

        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response;
            if (arrayBuffer) {
                tx['data'] = new Uint8Array(arrayBuffer);
                tx_status['data'] = true;
            }
        };

        oReq.send(null);
    }

    let checker = setInterval(function(){
        for(let key in tx_status){
            if(!tx_status[key]){
                return;
            }
        }

        clearInterval(checker);
        
        checkTx(tx, isDataBinary).then(() => {
            console.log("Page sources verified");
            chrome.tabs.sendMessage(tabId, {text: 'verified'});
            updateIconAndMenu('success');
        }).catch(failed_reason => {
            if(!isDataBinary){
                doStuffWithDom(domContent, true);
                return;
            }

            console.log(failed_reason);
            chrome.tabs.sendMessage(tabId, {text: failed_reason});
            updateIconAndMenu('failed');
        }).finally(() => {
            jsAccess('allow');
        });
        
    }, 200);
    
}

function checkTx(tx, isDataBinary = false){
    return new Promise(function(ok, fail){
        let result;
        result = new Uint8Array(base64js.toByteArray(b64UrlDecode( tx['owner'] )));
        result = concatBuffers([result, stringToBuffer(tx['target'])]);
        if(isDataBinary){
            result = concatBuffers([result, tx['data']]);    
        } else {
            result = concatBuffers([result, stringToBuffer(tx['data'])]);
        }
        result = concatBuffers([result, stringToBuffer(tx['quantity'])]);
        result = concatBuffers([result, stringToBuffer(tx['reward'])]);
        result = concatBuffers([result, new Uint8Array(base64js.toByteArray(b64UrlDecode( tx['last_tx'] )))]);
        let tags = '';
        for(let i = 0; i < tx['tags'].length; i++){
            let name = new Uint8Array(base64js.toByteArray(b64UrlDecode( tx['tags'][i]['name'] )));
            let value = new Uint8Array(base64js.toByteArray(b64UrlDecode( tx['tags'][i]['value'] )));
            result = concatBuffers([result, name, value]);
        }

        tx['signature'] = new Uint8Array(base64js.toByteArray(b64UrlDecode( tx['signature'] )));
        
        let success = false;

        // condition 1 - verify
        const publicKey = {
            kty: "RSA",
            e: "AQAB",
            n: tx['owner']
        };

        let pck = jwkToPublicCryptoKey(publicKey);
        if (pck !== undefined) {
            pck.then(key => {
                window.crypto.subtle.verify({
                        name: "RSA-PSS",
                        saltLength: 0
                    },
                    key,
                    tx['signature'],
                    result)
                .then(verified => {
                    if(!verified){
                        fail('failed_verify');
                    }

                    success ? ok() : success = true;
                })
            });
        }

        
        // condition 2 - hash
        crypto.subtle.digest("SHA-256", tx['signature']).then(function(hash) {
            if(bufferTob64Url(hash) != url.split('/')[url.split('/').length-1]){
                fail('failed_hash');
            }

            success ? ok() : success = true;
        });
    });
}

function updateIconAndMenu(setting) {
    chrome.browserAction.setIcon({
        path: chrome.extension.getURL("icons/icon-" + setting + ".png")
    });
}

function getSettings(loading) {
    chrome.tabs.query({
        'active': true,
        'windowId': chrome.windows.WINDOW_ID_CURRENT
    }, function (tabs) {
        let tab = tabs[0];
        
        if (tab) {
            url = tab.url;
            tabId = tab.id;
        
            url ? matchForbiddenOrigin = url.match(forbiddenOrigin, '') : matchForbiddenOrigin = false;
            if (!matchForbiddenOrigin) {
                updateIconAndMenu("inactive")
            } else {
                if (loading) {
                    jsAccess('block');
                } else {
                    $('#tx_data').load(url, function(html){
                        chrome.tabs.sendMessage(tabId, {text: 'report_back', source: html}, doStuffWithDom);
                    });
                }
            }
        }
    });
}

function jsAccess(newSetting){
    let pattern = /^file:/.test(url) ? url : url.match(extractHostname)[0] + '/*';

    chromeContentSettings.javascript.set({
        'primaryPattern': pattern,
        'setting': newSetting
        }, function () {
            if(newSetting != 'allow'){
                updateIconAndMenu(newSetting);
            }
        }
    );
}

function getHashFromUrl(_url){
    let t = _url.split('/'); 
    return t[t.length-1];
}

function updateUrlToTx(_url, _data){
    let url_parts = _url.split('arweave.net/');
    let new_url = url_parts[0] + 'arweave.net/tx/' + url_parts[1];
    if(_data){
        new_url += '/' + _data;
    }
    return new_url;
}
