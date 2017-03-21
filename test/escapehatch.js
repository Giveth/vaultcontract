import ethConnector from "ethconnector";
import assert from "assert"; // node.js core module
import path from "path";

import Vault from "../js/vault";

const verbose = false;

function getRandom(min, max) {
    const range = (max - min) + 1;
    return Math.floor(Math.random() * range) + min;
}

describe("Vault test Escape hatch", () => {
    let vault;
    let escapeHatchCaller;
    let escapeHatchDestination;
    let securityGuard;
    let guest;
    const amount = ethConnector.web3.toWei(getRandom(1, 10));
    log(`Amount:  + ${ amount }`);
    before((done) => {
//        ethConnector.init('rpc', function(err) {
        ethConnector.init("testrpc", (err) => {
            if (err) return done(err);
            escapeHatchCaller = ethConnector.accounts[ 1 ];
            escapeHatchDestination = ethConnector.accounts[ 2 ];
            securityGuard = ethConnector.accounts[ 3 ];
            guest = ethConnector.accounts[ 6 ];
            done();
        });
    });

    it("should compile contracts", (done) => {
        ethConnector.compile(
            path.join(__dirname, "../contracts/Vault.sol"),
            path.join(__dirname, "../contracts/Vault.sol.js"),
            done,
        );
    }).timeout(30000);

    it("should deploy all the contracts ", function (done) {
        this.timeout(30000);

        Vault.deploy(ethConnector.web3, {
//            from: ethConnector.accounts[ 0 ],
            escapeHatchCaller,
            escapeHatchDestination,
            absoluteMinTimeLock: 86400,
            timeLock: 86400 * 2,
            securityGuard,
            maxSecurityGuardDelay: 86400 * 21,
        }, (err, _vault) => {
            assert.ifError(err);
            vault = _vault.contract;
            assert.ok(vault.address);
            done();
        });
    });

    it("fund the valut", (done) => {
        vault.receiveEther({
            from: ethConnector.accounts[ 0 ],
            value: amount,
        }, (err) => {
            assert.ifError(err);
            ethConnector.web3.eth.getBalance(vault.address, (err2, _balance) => {
                assert.ifError(err2);
                assert.equal(_balance, amount);
                done();
            });
        });
    });

    it("Should read scape hatch", (done) => {
        vault.escapeHatchCaller((err, _escapeHatchCaller) => {
            assert.ifError(err);
            assert.equal(_escapeHatchCaller, escapeHatchCaller);
            done();
        });
    });

    it("Fail to use the escape hatch", (done) => {
        vault.escapeHatch({
            from: guest,
        }, (err) => {
            assert(err);
            done();
        });
    });

    it("Use the escape hatch", (done) => {
        vault.escapeHatch({
            from: escapeHatchCaller,
        }, (err) => {
            assert.ifError(err);
            ethConnector.web3.eth.getBalance(vault.address, (err2, _balanceVault) => {
                assert.ifError(err2);
                assert.equal(_balanceVault, 0);
                ethConnector.web3.eth.getBalance(escapeHatchDestination, (err3, _balanceDest) => {
                    assert.ifError(err3);
                    // accounts for original account balance of 100 eth
                    assert.equal(_balanceDest.minus(ethConnector.web3.toWei(100)), amount);
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
