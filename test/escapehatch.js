/*jslint node: true */
/*global describe, it, before, beforeEach, after, afterEach */
"use strict";



var vaultHelper = require('../js/vault_helper.js');
var ethConnector = require('ethconnector');
var BigNumber = require('bignumber.js');


var assert = require("assert"); // node.js core module
var async = require('async');
var _ = require('lodash');

var verbose = false;
var throwError = "Error: VM Exception while executing transaction: invalid JUMP";



function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


describe('Vault test Escape hatch', function(){
    var vault;
    var b = [];
    var owner;
    var hatchCaller;
    var hatchReceiver;
    var securityGuard;
    var spender;
    var recipient;
    var guest;
    var amount = ethConnector.web3.toWei(getRandom(1,10));
    log("Amount: " + amount);
    before(function(done) {
//        ethConnector.init('rpc', function(err) {
        ethConnector.init('testrpc' ,function(err) {
            if (err) return done(err);
            owner = ethConnector.accounts[0];
            hatchCaller = ethConnector.accounts[1];
            hatchReceiver = ethConnector.accounts[2];
            securityGuard = ethConnector.accounts[3];
            spender = ethConnector.accounts[4];
            recipient = ethConnector.accounts[5];
            guest = ethConnector.accounts[6];
            done();
        });
    });

    it('should deploy all the contracts ', function(done){
        this.timeout(30000);
        var now = Math.floor(new Date().getTime() /1000);

        vaultHelper.deploy({
            escapeCaller: hatchCaller,
            escapeDestination: hatchReceiver,
            absoluteMinTimeLock: 86400,
            timeLock: 86400*2,
            securityGuard: securityGuard,
            maxSecurityGuardDelay: 86400*21
        }, function(err, _vault) {
            assert.ifError(err);
            assert.ok(_vault.address);
            vault = _vault;
            done();
        });
    });

    it('fund the valut', function(done) {
        vault.receiveEther({
            from:ethConnector.accounts[0],
            value:amount
        },function (err) {
            assert.ifError(err);
            ethConnector.web3.eth.getBalance(vault.address, function(err, _balance) {
                assert.ifError(err);
                assert.equal(_balance, amount);
                done();
                });
            });
        });


     it('Fail to use the escape hatch', function(done) {
        vault.escapeHatch({
            from:guest
        },function (err) {
            assert(err);
            done();
           });
        });


    it('Use the escape hatch', function(done) {
        vault.escapeHatch({
            from:hatchCaller
        },function (err) {
            assert.ifError(err);
            ethConnector.web3.eth.getBalance(vault.address, function(err, _balance) {
                assert.ifError(err);
                assert.equal(_balance, 0);
                ethConnector.web3.eth.getBalance(hatchReceiver, function(err, _balance) {
                    assert.ifError(err);
                    assert.equal(_balance.minus(ethConnector.web3.toWei(100)), amount); //accounts for original account balance of 100 eth
                    done();
                    });
                });
            });
        });

    function log(S) {
        if (verbose) {
            console.log(S);
        }
    }
});
