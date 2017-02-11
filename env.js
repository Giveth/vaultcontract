"use strict";

var Web3 = require('web3');
// create an instance of web3 using the HTTP provider.
// NOTE in mist web3 is already available, so check first if its available before instantiating
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var BigNumber = require('bignumber.js');

var eth = web3.eth;
var async = require('async');

var Vault = require('./dist/vault.js');

var gcb = function(err, res) {
    if (err) {
        console.log("ERROR: "+err);
    } else {
        console.log(JSON.stringify(res,null,2));
    }
}

var vault;

owner = eth.accounts[ 0 ];
escapeCaller = eth.accounts[ 1 ];
escapeDestination = eth.accounts[ 2 ];
securityGuard = eth.accounts[ 3 ];
spender = eth.accounts[ 4 ];
recipient = eth.accounts[ 5 ];

function deployExample(cb) {
    cb = cb || gcb;
    async.series([
        function(cb) {
            Vault.deploy(web3, {
                escapeCaller,
                escapeDestination,
                absoluteMinTimeLock: 86400,
                timeLock: 86400 * 2,
                securityGuard,
                maxSecurityGuardDelay: 86400 * 21,
            }, function(err, _vault) {
                if (err) return err;
                vault = _vault;
                console.log("Vault Token: " + minimeToken.contract.address);
                cb();
            });
        },
    ], cb);

}
