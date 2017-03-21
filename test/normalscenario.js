import ethConnector from "ethconnector";
import assert from "assert"; // node.js core module
import async from "async";
import path from "path";

import Vault from "../js/vault";

describe("Normal Scenario Vault test", () => {
    let vault;
    let owner;
    let escapeHatchCaller;
    let escapeHatchDestination;
    let securityGuard;
    let spender;
    let recipient;

    before((done) => {
        ethConnector.init("testrpc", (err) => {
            if (err) { done(err); return; }
            owner = ethConnector.accounts[ 0 ];
            escapeHatchCaller = ethConnector.accounts[ 1 ];
            escapeHatchDestination = ethConnector.accounts[ 2 ];
            securityGuard = ethConnector.accounts[ 3 ];
            spender = ethConnector.accounts[ 4 ];
            recipient = ethConnector.accounts[ 5 ];
            done();
        });
    });
    it("should compile contracts", (done) => {
        ethConnector.compile(
            path.join(__dirname, "../contracts/Vault.sol"),
            path.join(__dirname, "../contracts/Vault.sol.js"),
            done,
        );
    }).timeout(20000);
    it("should deploy all the contracts ", (done) => {
        Vault.deploy(ethConnector.web3, {
            escapeHatchCaller,
            escapeHatchDestination,
            absoluteMinTimeLock: 86400,
            timeLock: 86400 * 2,
            securityGuard,
            maxSecurityGuardDelay: 86400 * 21,
        }, (err, _vault) => {
            assert.ifError(err);
            assert.ok(_vault.contract.address);
            vault = _vault;
            done();
        });
    }).timeout(20000);
    it("Should check roles", (done) => {
        vault.getState((err, st) => {
            assert.ifError(err);
            assert.equal(owner, st.owner);
            assert.equal(escapeHatchCaller, st.escapeHatchCaller);
            assert.equal(escapeHatchDestination, st.escapeHatchDestination);
            done();
        });
    }).timeout(60000000);
    it("Should send some Ether to the Vault", (done) => {
        vault.contract.receiveEther({
            from: ethConnector.accounts[ 0 ],
            value: ethConnector.web3.toWei(50),
        }, (err) => {
            assert.ifError(err);
            vault.getState((err2, st) => {
                assert.ifError(err2);
                assert.equal(st.balance, ethConnector.web3.toWei(50));
                done();
            });
        });
    }).timeout(60000000);
    it("Should not allow authorizePayment", (done) => {
        vault.contract.authorizePayment(
            "testPayment",
            recipient,
            ethConnector.web3.toWei(10),
            "",
            86400 * 2,
            {
                from: spender,
                gas: 500000,
            },
            (err) => {
                assert(err);
                done();
            });
    });
    it("Should authorize spender", (done) => {
        vault.contract.authorizeSpender(
            spender,
            true,
            {
                from: owner,
                gas: 200000,
            },
            (err) => {
                assert.ifError(err);
                vault.contract.allowedSpenders(spender, (err2, res) => {
                    assert.ifError(err2);
                    assert.equal(res, true);
                    done();
                });
            });
    });
    it("Should allow authorizePayment", (done) => {
        let now;
        async.series([
            (cb) => {
                vault.contract.authorizePayment(
                    "testPayment",
                    recipient,
                    ethConnector.web3.toWei(10),
                    86400 * 2,
                    {
                        from: spender,
                        gas: 500000,
                    },
                    cb);
            },
            (cb) => {
                ethConnector.web3.eth.getBlock("latest", (err, _block) => {
                    assert.ifError(err);
                    now = _block.timestamp;
                    cb();
                });
            },
            (cb) => {
                vault.getState((err, st) => {
                    assert.ifError(err);
                    assert.equal(st.payments.length, 1);
                    assert.equal(st.payments[ 0 ].description, "testPayment");
                    assert.equal(st.payments[ 0 ].spender, spender);
                    assert.equal(st.payments[ 0 ].earliestPayTime, now + (86400 * 2));
                    assert.equal(st.payments[ 0 ].canceled, false);
                    assert.equal(st.payments[ 0 ].paid, false);
                    assert.equal(st.payments[ 0 ].recipient, recipient);
                    assert.equal(st.payments[ 0 ].amount, ethConnector.web3.toWei(10));
                    cb();
                });
            },
        ], done);
    }).timeout(60000000);
    it("Should desauthorize Spender", (done) => {
        vault.contract.authorizeSpender(
            spender,
            false,
            {
                from: owner,
                gas: 200000,
            },
            (err) => {
                assert.ifError(err);
                vault.contract.allowedSpenders(spender, (err2, res) => {
                    assert.ifError(err2);
                    assert.equal(res, false);
                    done();
                });
            });
    });
    it("Should not allow authorizePayment adter desauthorizing", (done) => {
        vault.contract.authorizePayment(
            "testPayment",
            recipient,
            ethConnector.web3.toWei(10),
            "",
            86400 * 2,
            {
                from: spender,
                gas: 500000,
            },
            (err) => {
                assert(err);
                done();
            });
    });

    it("Should not allow collectAuthorizedPayment", (done) => {
        vault.contract.collectAuthorizedPayment(
            0,
            {
                from: recipient,
                gas: 500000,
            },
            (err) => {
                assert(err);
                done();
            });
    });
    it("Should delay", (done) => {
        bcDelay((86400 * 2) + 1, done);
    });
    it("Should not allow collectAuthorizedPayment if not authorized", (done) => {
        vault.contract.collectAuthorizedPayment(
            0,
            {
                from: recipient,
                gas: 500000,
            },
            (err) => {
                assert(err);
                done();
            });
    });
    it("Should reauthorize spender", (done) => {
        vault.contract.authorizeSpender(
            spender,
            true,
            {
                from: owner,
                gas: 200000,
            },
            (err) => {
                assert.ifError(err);
                vault.contract.allowedSpenders(spender, (err2, res) => {
                    assert.ifError(err2);
                    assert.equal(res, true);
                    done();
                });
            });
    });
    it("Should allow payment", (done) => {
        let beforeBalance;
        let afterBalance;
        async.series([
            (cb) => {
                ethConnector.web3.eth.getBalance(recipient, (err, res) => {
                    assert.ifError(err);
                    beforeBalance = res;
                    cb();
                });
            },
            (cb) => {
                vault.collectAuthorizedPayment({
                    idPayment: 0,
                    from: recipient,
                }, cb);
            },
            (cb) => {
                ethConnector.web3.eth.getBalance(recipient, (err, res) => {
                    assert.ifError(err);
                    afterBalance = res;
                    const increment = afterBalance.sub(beforeBalance);
                    assert(ethConnector.web3.fromWei(increment) > 9.9, 10);
                    cb();
                });
            },
            (cb) => {
                vault.getState((err, st) => {
                    assert.ifError(err);
                    assert.equal(st.payments[ 0 ].canceled, false);
                    assert.equal(st.payments[ 0 ].paid, true);
                    cb();
                });
            },
        ], done);
    });
    it("Should not execute payment 2 times", (done) => {
        vault.contract.collectAuthorizedPayment(
            0,
            {
                from: recipient,
                gas: 500000,
            },
            (err) => {
                assert(err);
                done();
            });
    });

    function bcDelay(secs, cb) {
        send("evm_increaseTime", [ secs ], (err) => {
            if (err) { cb(err); return; }

      // Mine a block so new time is recorded.
            send("evm_mine", (err1) => {
                if (err1) { cb(err); return; }
                cb();
            });
        });
    }

        // CALL a low level rpc
    function send(method, _params, _callback) {
        let params;
        let callback;
        if (typeof _params === "function") {
            callback = _params;
            params = [];
        } else {
            params = _params;
            callback = _callback;
        }

        ethConnector.web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method,
            params: params || [],
            id: new Date().getTime(),
        }, callback);
    }
});
