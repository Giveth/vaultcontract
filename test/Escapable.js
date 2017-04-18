/* eslint no-undef: "off" */

const assertJump = require("./helpers/assertJump");

const Escapable = artifacts.require("../contracts/Escapable.sol");
const TestStandardToken = artifacts.require("../contracts/helpers/TestStandardToken.sol");

contract("Escapable", (accounts) => {
    const ZEROWEI = web3.toBigNumber("0");
    const ONEWEI = web3.toBigNumber("1");

    const ETHEREUMTOKENADDR = 0;
    const OWNERADDR = accounts[ 0 ];
    const OTHERADDR = accounts[ 1 ];
    const ESCAPEHATCHCALLERADDR = accounts[ 7 ];
    const ESCAPEHATCHDESTINATIONADDR = accounts[ 8 ];

    let escapableEth;
    let standardToken;
    let escapableToken;

    const filterCoverageTopics =
    logs => logs.filter(
      log => !log.event.startsWith("__")
             && log.event !== "Transfer"
             && log.event !== "Approval",
    );

    beforeEach(async () => {
        escapableEth = await Escapable.new(
      ETHEREUMTOKENADDR,          // _baseToken
      ESCAPEHATCHCALLERADDR,      // _escapeHatchCaller
      ESCAPEHATCHDESTINATIONADDR, // _escapeHatchDestination
    );

        standardToken = await TestStandardToken.new(
      OWNERADDR, ESCAPEHATCHDESTINATIONADDR,
    );
        escapableToken = await Escapable.new(
      standardToken.address,      // _baseToken
      ESCAPEHATCHCALLERADDR,      // _escapeHatchCaller
      ESCAPEHATCHDESTINATIONADDR, // _escapeHatchDestination
    );
    });

    it("prevent non-authorized call to escapeHatch()", async () => {
        try {
            await escapableEth.escapeHatch({ from: OTHERADDR });
        } catch (error) {
            assertJump(error);
        }
    });

    it("prevent non-authorized call to changeEscapeHatchCaller()", async () => {
        try {
            await escapableEth.changeEscapeHatchCaller(OTHERADDR, { from: OTHERADDR });
        } catch (error) {
            assertJump(error);
        }
    });

    it("changeEscapeHatchCaller() changes the permission", async () => {
        let result = await escapableEth.changeEscapeHatchCaller(
          OTHERADDR, { from: ESCAPEHATCHCALLERADDR });
        let logs = filterCoverageTopics(result.logs);
        assert.equal(logs.length, 1);
        assert.equal(logs[ 0 ].event, "EscapeHatchCallerChanged");
        assert.equal(logs[ 0 ].args.newEscapeHatchCaller, OTHERADDR);

        result = await escapableEth.changeEscapeHatchCaller(
          ESCAPEHATCHCALLERADDR, { from: OTHERADDR });
        logs = filterCoverageTopics(result.logs);
        assert.equal(logs.length, 1);
        assert.equal(logs[ 0 ].event, "EscapeHatchCallerChanged");
        assert.equal(logs[ 0 ].args.newEscapeHatchCaller, ESCAPEHATCHCALLERADDR);
    });

    it("ether: increases balance using receiveEther()", async () => {
        const balanceStart = await escapableEth.getBalance();
        await escapableEth.receiveEther({ from: OTHERADDR, value: ONEWEI });
        const balanceEnd = await escapableEth.getBalance();

        assert.isTrue(balanceEnd.minus(balanceStart).equals(ONEWEI));
    });

    it("ether: getBalance matches with the contract balance", async () => {
        await escapableEth.receiveEther({ from: OTHERADDR, value: ONEWEI });
        const balance = await escapableEth.getBalance();

        assert.isTrue(web3.eth.getBalance(escapableEth.address).equals(balance));
    });

    it("ether: calling fallback with ethers matches with getBalance", async () => {
        const balanceStart = await escapableEth.getBalance();
        web3.eth.sendTransaction({
            from: OTHERADDR,
            to: escapableEth.address,
            value: ONEWEI,
        });
        const balanceEnd = await escapableEth.getBalance();

        assert.isTrue(balanceEnd.minus(balanceStart).equals(ONEWEI));
    });

    it("ether: receiveEther() generates a log", async () => {
        const result = await escapableEth.receiveEther({ from: OTHERADDR, value: ONEWEI });
        const logs = filterCoverageTopics(result.logs);
        assert.equal(logs.length, 1);
        assert.equal(logs[ 0 ].event, "EtherReceived");
        assert.equal(logs[ 0 ].args.from, OTHERADDR);
        assert.equal(logs[ 0 ].args.amount, "1");
    });

    it("ether: escapeHatch() sends amount to the destination", async () => {
        const balance = web3.eth.getBalance(ESCAPEHATCHDESTINATIONADDR);
        await escapableEth.receiveEther({ from: OTHERADDR, value: ONEWEI });

        const result = await escapableEth.escapeHatch({ from: ESCAPEHATCHCALLERADDR });
        const logs = filterCoverageTopics(result.logs);
        assert.equal(logs.length, 1);
        assert.equal(logs[ 0 ].event, "EscapeHatchCalled");
        assert.equal(logs[ 0 ].args.amount, "1");

        assert.isTrue(web3.eth.getBalance(ESCAPEHATCHDESTINATIONADDR).equals(balance.plus(ONEWEI)));
    });

    it("token: cannot send ethers", async () => {
        try {
            await escapableToken.receiveEther({ from: OTHERADDR, value: ONEWEI });
        } catch (error) {
            assertJump(error);
        }
    });

    it("token: getBalance() matches the token balance", async () => {
        const balanceInContract = await escapableToken.getBalance();
        const balanceInToken = await standardToken.balanceOf(escapableToken.address);
        assert.isTrue(balanceInContract.equals(balanceInToken));
    });

    it("token: escapeHatch() sends amount to the destination", async () => {
        await standardToken.transfer(escapableToken.address, ONEWEI, { from: OWNERADDR });
        let contractBalance = await standardToken.balanceOf(escapableToken.address);
        assert.isTrue(contractBalance.equals(ONEWEI));

        const result = await escapableToken.escapeHatch({ from: ESCAPEHATCHCALLERADDR });
        const logs = filterCoverageTopics(result.logs);
        assert.equal(logs.length, 1);
        assert.equal(logs[ 0 ].event, "EscapeHatchCalled");
        assert.isTrue(logs[ 0 ].args.amount.equals(ONEWEI));

        contractBalance = await standardToken.balanceOf(escapableToken.address);
        assert.isTrue(contractBalance.equals(ZEROWEI));

        const escapeHatchDestBalance = await standardToken.balanceOf(ESCAPEHATCHDESTINATIONADDR);
        assert.isTrue(escapeHatchDestBalance.equals(ONEWEI));
    });
});
