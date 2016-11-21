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


describe('Normal Scenario Vault test', function(){
    var vault;
    var b = [];
    var owner;
    var hatchCaller;
    var hatchReceiver;
    var guardian;
    var spender;
    var recipient;
    var guest;

    before(function(done) {
//        ethConnector.init('rpc', function(err) {
        ethConnector.init('testrpc' ,function(err) {
            if (err) return done(err);
            owner = ethConnector.accounts[0];
            hatchCaller = ethConnector.accounts[1];
            hatchReceiver = ethConnector.accounts[2];
            guardian = ethConnector.accounts[3];
            spender = ethConnector.accounts[4];
            recipient = ethConnector.accounts[5];
            guest = ethConnector.accounts[6];
            done();
        });
    });
    it('should deploy all the contracts ', function(done){
        this.timeout(20000);
        var now = Math.floor(new Date().getTime() /1000);

        vaultHelper.deploy({
            escapeCaller: hatchCaller,
            escapeDestination: hatchReceiver,
            guardian: guardian,
            absoluteMinTimeLock: 86400,
            timeLock: 86400*2
        }, function(err, _vault) {
            assert.ifError(err);
            assert.ok(_vault.address);
            vault = _vault;
            done();
        });
    });
    it('Should send some Ether to the Vault', function(done) {
        vault.receiveEther({
            from: ethConnector.accounts[0],
            value: ethConnector.web3.toWei(50)
        }, function(err) {
            assert.ifError(err);
            ethConnector.web3.eth.getBalance(vault.address, function(err, _balance) {
                assert.ifError(err);
                assert.equal(ethConnector.web3.fromWei(_balance), 50);
                done();
            });
        });
    });
    it('Should not allow authorizePayment', function(done) {
        vault.authorizePayment(
            "testPayment",
            recipient,
            ethConnector.web3.toWei(10),
            "",
            86400*2,
            {
                from: spender,
                gas: 500000
            },
            function(err, res) {
                assert(err);
                done();
            }
        );
    });
    it('Should authorize spender', function(done) {
        vault.authorizeSpender(
            spender,
            true,
            {
                from: owner,
                gas: 200000
            },
            function(err) {
                assert.ifError(err);
                vault.allowedSpenders(spender, function(err, res) {
                    assert.ifError(err);
                    assert.equal(res,true);
                    done();
                });
            }
        );
    });
    it('Should allow authorizePayment', function(done) {
        this.timeout(20000000);
        var now;
        vault.authorizePayment(
            "testPayment",
            recipient,
            ethConnector.web3.toWei(10),
            "0x",
            86400*2,
            {
                from: spender,
                gas: 500000
            },
            function(err, res) {
                assert.ifError(err);
                async.series([
                    function(cb) {
                        vault.numberOfPayments(function(err, res) {
                            assert.ifError(err);
                            assert.equal(res, 1);
                            cb();
                        });
                    },
                    function(cb) {
                        ethConnector.web3.eth.getBlock('latest', function(err, _block) {
                            assert.ifError(err);
                            now = _block.timestamp;
                            cb();
                        });
                    },
                    function(cb) {
                        vault.payments(0, function(err, res) {
                            assert.ifError(err);
                            assert.equal(res[0], "testPayment");
                            assert.equal(res[1], spender);
                            assert.equal(res[2], now + 86400*2);
                            assert.equal(res[3], false);
                            assert.equal(res[4], false);
                            assert.equal(res[5], recipient);
                            assert.equal(ethConnector.web3.fromWei(res[6]), 10);
                            assert.equal(res[7], "0x");
                            cb();
                        });
                    }
                ],done);
            }
        );
    });
    it('Should desauthorize Spender', function(done) {
        vault.authorizeSpender(
            spender,
            false,
            {
                from: owner,
                gas: 200000
            },
            function(err) {
                assert.ifError(err);
                vault.allowedSpenders(spender, function(err, res) {
                    assert.ifError(err);
                    assert.equal(res,false);
                    done();
                });
            }
        );
    });
    it('Should not allow authorizePayment adter desauthorizing', function(done) {
        vault.authorizePayment(
            "testPayment",
            recipient,
            ethConnector.web3.toWei(10),
            "",
            86400*2,
            {
                from: spender,
                gas: 500000
            },
            function(err, res) {
                assert(err);
                done();
            }
        );
    });

    it('Should not allow executePayment', function(done) {
        vault.executePayment(
            0,
            {
                from: recipient,
                gas: 500000
            },
            function(err, res) {
                assert(err);
                done();
            }
        );
    });
    it('Should delay', function(done) {
        bcDelay(86400*2+1, done);
    });
    it('Should not allow executePayment if not authorized', function(done) {
        vault.executePayment(
            0,
            {
                from: recipient,
                gas: 500000
            },
            function(err, res) {
                assert(err);
                done();
            }
        );
    });
    it('Should reauthorize spender', function(done) {
        vault.authorizeSpender(
            spender,
            true,
            {
                from: owner,
                gas: 200000
            },
            function(err) {
                assert.ifError(err);
                vault.allowedSpenders(spender, function(err, res) {
                    assert.ifError(err);
                    assert.equal(res,true);
                    done();
                });
            }
        );
    });
    it('Should allow payment', function(done) {
        var beforeBalance;
        var afterBalance;
        async.series([
            function(cb) {
                ethConnector.web3.eth.getBalance(recipient, function(err, res) {
                    assert.ifError(err);
                    beforeBalance = res;
                    cb();
                });
            },
            function(cb) {
                vault.executePayment(
                    0,
                    {
                        from: guest,
                        gas: 500000
                    },
                    function(err, res) {
                        assert.ifError(err);
                        cb();
                    }
                );
            },
            function(cb) {
                ethConnector.web3.eth.getBalance(recipient, function(err, res) {
                    assert.ifError(err);
                    afterBalance = res;
                    var increment = afterBalance.sub(beforeBalance);
                    assert.equal(ethConnector.web3.fromWei(increment),10);
                    cb();
                });
            },
            function(cb) {
                vault.payments(0, function(err, res) {
                    assert.ifError(err);
                    assert.equal(res[3], false);
                    assert.equal(res[4], true);
                    cb();
                });
            }
        ], done);
    });
    it('Should not execute payment 2 times', function(done) {
        vault.executePayment(
            0,
            {
                from: recipient,
                gas: 500000
            },
            function(err, res) {
                assert(err);
                done();
            }
        );
    });

    function bcDelay(secs, cb) {
        send("evm_increaseTime", [secs], function(err, result) {
            if (err) return cb(err);

      // Mine a block so new time is recorded.
            send("evm_mine", function(err, result) {
                if (err) return cb(err);
                cb();
            });
        });
    }

    function log(S) {
        if (verbose) {
            console.log(S);
        }
    }

        // CALL a low level rpc
    function send(method, params, callback) {
        if (typeof params == "function") {
          callback = params;
          params = [];
        }

        ethConnector.web3.currentProvider.sendAsync({
          jsonrpc: "2.0",
          method: method,
          params: params || [],
          id: new Date().getTime()
        }, callback);
    }
});
