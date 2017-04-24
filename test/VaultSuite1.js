// This test suite corresponds to the old Vault test suite

/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertJump = require("./helpers/assertJump.js");
const timer = require("./helpers/timer.js");

const Vault = artifacts.require("../contracts/Vault.sol");

contract("Vault::Receive,Authorize,Unauthorize,Collect", (accounts) => {
    const TEN_WEI = web3.toBigNumber("10");
    const FIFTY_WEI = web3.toBigNumber("50");

    const {
        0: owner,
        1: escapeHatchCaller,
        2: escapeHatchDestination,
        3: securityGuard,
        4: spender,
        5: recipient
    } = accounts


    let vault;

    beforeEach(async () => {
        vault = await Vault.new(
            0,
            escapeHatchCaller,
            escapeHatchDestination,
            86400, // absoluteMinTimeLock
            86400 * 2, // timeLock
            securityGuard,
            86400 * 21, // maxSecurityGuardDelay
        );
    });

    it("Should check roles", async () => {
        assert.equal(owner, await vault.owner());
        assert.equal(escapeHatchCaller, await vault.escapeHatchCaller());
        assert.equal(escapeHatchDestination, await vault.escapeHatchDestination());
    });

    it("Should send some Ether to the Vault", async () => {
        await vault.receiveEther({ from: owner, value: FIFTY_WEI });
        assert.isTrue(web3.eth.getBalance(vault.address).equals(FIFTY_WEI));
    });

    it("Should not allow authorizePayment", async () => {
        try {
            await vault.authorizePayment(
                "testPayment",
                recipient,
                TEN_WEI,
                "",
                86400 * 2,
                { from: spender },
            );
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    });

    it("Should authorize spender", async () => {
        const spender1Sha3 = web3.sha3("Spender1");

        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        const [name, nameHash, idx] = await vault.spenders(spender);
        assert.equal(name, "Spender1");
        assert.equal(nameHash, spender1Sha3);
        assert.equal(idx, "1");
    });

    it("Should allow authorizePayment", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        const refSha3 = web3.sha3("Ref");

        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.authorizePayment(
            "testPayment",
            refSha3,
            recipient,
            TEN_WEI,
            86400 * 2,
            { from: spender },
        );
        const now = (await web3.eth.getBlock("latest")).timestamp;
        const payment = await vault.authorizedPayments(0);

        assert.equal(payment[ 0 ], "testPayment");
        assert.equal(payment[ 1 ], refSha3);
        assert.equal(payment[ 2 ], spender);
        assert.equal(payment[ 3 ], now + (86400 * 2));
        assert.equal(payment[ 4 ], false);
        assert.equal(payment[ 5 ], false);
        assert.equal(payment[ 6 ], recipient);
        assert.equal(payment[ 7 ], "10");
    });

    it("Should deauthorize spender", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.unauthorizeSpender(spender, { from: owner });
        assert.equal(await vault.isAuthorized(spender), false);
    });

    it("Should not allow authorizePayment after deauthorizing", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.unauthorizeSpender(spender, { from: owner });
        try {
            vault.contract.authorizePayment(
            "testPayment",
            recipient,
            TEN_WEI,
            "",
            86400 * 2,
            { from: spender },
        );
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    });

    it("Should not allow collectAuthorizedPayment (without waiting)", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        const refSha3 = web3.sha3("Ref");

        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.authorizePayment(
            "testPayment",
            refSha3,
            recipient,
            TEN_WEI,
            86400 * 2,
            { from: spender },
        );

        try {
            await vault.collectAuthorizedPayment(0, { from: recipient });
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    });

    it("Should not allow collectAuthorizedPayment if not authorized (on collect time)", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        const refSha3 = web3.sha3("Ref");

        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.authorizePayment(
            "testPayment",
            refSha3,
            recipient,
            TEN_WEI,
            86400 * 2,
            { from: spender },
        );

        await vault.unauthorizeSpender(spender, { from: owner });
        await timer((86400 * 2) + 1);

        try {
            await vault.collectAuthorizedPayment(0, { from: recipient });
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    });

    it("Should allow collectAuthorizedPayment (on collect time)", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        const refSha3 = web3.sha3("Ref");

        await vault.receiveEther({ from: owner, value: FIFTY_WEI });
        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.authorizePayment(
            "testPayment",
            refSha3,
            recipient,
            TEN_WEI,
            86400 * 2,
            { from: spender },
        );
        await timer((86400 * 2) + 1);

        const balance = web3.eth.getBalance(recipient);
        const result = await vault.collectAuthorizedPayment(0, { from: recipient });
        const tx = web3.eth.getTransaction(result.tx);
        const txnEthers = web3.toBigNumber(result.receipt.gasUsed).mul(tx.gasPrice);

        const expectedDiff = TEN_WEI.sub(txnEthers);
        const actualDiff = web3.eth.getBalance(recipient).minus(balance);

        assert.isTrue(expectedDiff.equals(actualDiff));
    });

    it("Should allow collectAuthorizedPayment two times (on collect time)", async () => {
        const spender1Sha3 = web3.sha3("Spender1");
        const refSha3 = web3.sha3("Ref");

        await vault.receiveEther({ from: owner, value: FIFTY_WEI });
        await vault.authorizeSpender(spender, "Spender1", spender1Sha3, {
            from: owner,
        });
        await vault.authorizePayment(
            "testPayment",
            refSha3,
            recipient,
            TEN_WEI,
            86400 * 2,
            { from: spender },
        );
        await timer((86400 * 2) + 1);

        web3.eth.getBalance(recipient);
        await vault.collectAuthorizedPayment(0, { from: recipient });
        try {
            await vault.collectAuthorizedPayment(0, { from: recipient });
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");
    });
});
