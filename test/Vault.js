/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertJump = require('./helpers/assertJump.js')
const timer = require('./helpers/timer.js')

const Vault = artifacts.require('../contracts/Vault.sol')

contract('Vault', accounts => {
    // initialized with accounts passed in by TestRPC
    const {
    0:    owner,
    1:    escapeCaller,
    2:    escapeDestination,
    3:    securityGuard,
    4:    spender,
    5:    recipient,
    6:    acc7,
    7:    acc8
    } = accounts

    const absoluteMinTimeLock = days(1)
    ,     timeLock = days(2)
    ,     maxSecurityGuardDelay = days(3)

    let vault
    // initialize a new Vault contract for each test
    beforeEach( async () => {
        vault = await Vault.new(
            0,
            escapeCaller,
            escapeDestination,
            absoluteMinTimeLock,
            timeLock,
            securityGuard,
            maxSecurityGuardDelay
            )
    })

    it('Should return the number of spenders allocated to the vault', async () => {
        const nameHash = web3.sha3('dani')
        const nameHash2 = web3.sha3('jordi')
        let numSpenders = await vault.numberOfSpenders()
        assert.equal(numSpenders, 0)
        
        await vault.authorizeSpender(spender, "dani", nameHash)
        numSpenders = await vault.numberOfSpenders.call()
        assert.equal(numSpenders, 1)

        await vault.authorizeSpender(acc7, "jordi", nameHash2)
        numSpenders = await vault.numberOfSpenders.call()
        assert.equal(numSpenders, 2)

    })


    // Payment[] public authorizedPayments
    it('Should correctly add authorized payments to authorizedPayments[]', async () => {
        const nameHash = web3.sha3('dani'),
              paymentDescription = "Vault dues",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("30"),
              paymentDelay = days(1)

        let currentAuthedPayments = await vault.numberOfAuthorizedPayments.call()
        assert.equal(currentAuthedPayments, 0)

        await vault.authorizeSpender(spender, "dani", nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )
        currentAuthedPayments = await vault.numberOfAuthorizedPayments.call()
        assert.equal(currentAuthedPayments, 1)

        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )

        currentAuthedPayments = await vault.numberOfAuthorizedPayments.call()
        assert.equal(currentAuthedPayments, 2)
    })

    /////////
    // SecurityGuard Interface
    /////////

    it('Should correctly assign the Security Guard permission', async () => {
        let SG = await vault.securityGuard.call()
        assert.equal(SG, securityGuard)

        await vault.setSecurityGuard(acc7, {from: owner})
        SG = await vault.securityGuard.call()

        assert.equal(SG, acc7)
        await vault.setSecurityGuard(acc8, {from: owner})

        SG = await vault.securityGuard.call()        
        assert.equal(SG, acc8)
    })

    it('Should throw on non-owner address setting Security Guard permission', async () => {
        try {
            await vault.setSecurityGuard(acc7, {from: securityGuard})
        }catch(err) {
            return assertJump(err)
        }

        return assert.fail('Test has failed')
    })    

    it('Should delay payment for a specified number of seconds', async () => {
        const nameHash = web3.sha3('dani'),
              paymentDescription = "Vault dues",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("30"),
              paymentDelay = days(1)

        await vault.authorizeSpender(spender, "dani", nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )

        let paymentID = 0

        let initialDelay = (await vault.authorizedPayments.call(0))[3].toNumber()
        await vault.delayPayment(paymentID, paymentDelay, {from: securityGuard})

        let endDelay = (await vault.authorizedPayments.call(0))[3].toNumber()

        assert.equal(endDelay, initialDelay + paymentDelay)
    })

    it('Shouldn\'t be able to be collected after the initial delay but before the new one', async () => {
        const name = "dani",
              nameHash = web3.sha3(name),
              paymentDescription = "Vault dues",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("10"),
              paymentDelay = days(1),
              paymentID = 0

        await vault.receiveEther({from: owner, value: wei("100")})
        await vault.authorizeSpender(spender, name, nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )

        let { 3: earliestPayTime } = await vault.authorizedPayments.call(0)
        const { timestamp: prevBlockMined } = await web3.eth.getBlock("latest")
        
        await vault.delayPayment(paymentID, days(1), {from: securityGuard})
        
        let { 
            3: newEarliestPayTime
        } = await vault.authorizedPayments.call(0)
        // initial delay is 2 days
        await timeTravel(days(2) + hours(1))
        // now we're after the initial delay but before the new delay
        const { timestamp: now } = await web3.eth.getBlock("latest")

        try{
            await vault.collectAuthorizedPayment(paymentID, { from: recipient })
        }catch(err){
            return assertJump(err)
        }
        return assert.fail("Test has failed")
    })

    it('Should be able to collect payment after updated delay time has transpired', async () => {
        const name = "dani",
              nameHash = web3.sha3(name),
              paymentDescription = "Vault dues",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("10"),
              paymentDelay = days(1),
              paymentID = 0

        await vault.receiveEther({from: owner, value: wei("100")})
        await vault.authorizeSpender(spender, name, nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )
        
        await vault.delayPayment(paymentID, days(1), {from: securityGuard})
        
        await timeTravel(days(3) + 1)

        const balance = web3.eth.getBalance(recipient)
        const result = await vault.collectAuthorizedPayment(paymentID, { from: recipient })
        
        const tx = web3.eth.getTransaction(result.tx)
        const txGasCost = web3.toBigNumber(result.receipt.gasUsed).mul(tx.gasPrice)

        const expectedDiff = paymentAmount.sub(txGasCost)
        const actualDiff = web3.eth.getBalance(recipient).minus(balance)

        assert.isTrue(expectedDiff.equals(actualDiff))

    })

    it('Should cancel a payment that has been authorized ', async () => {
        const nameHash = web3.sha3('larry'),
              paymentDescription = "Thanks for all the fish!",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("10000"),
              paymentDelay = days(2),
              paymentID = 0

        await vault.authorizeSpender(spender, "larry", nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )

        await vault.cancelPayment(0)

        let { 0: name, 4: cancelled, 7: amount } = await vault.authorizedPayments.call(0)
        assert.equal(name, paymentDescription)
        assert.equal(amount, paymentAmount.toNumber())
        assert.isTrue(cancelled)
    })

    it('Should set a higher time lock', async () => {
        let tLock = await vault.timeLock.call()
        assert.equal(tLock, days(2))
        await vault.setTimelock(days(2) + hours(1))
        tLock = await vault.timeLock.call()

        assert.equal(tLock.toNumber(), days(2) + hours(1))
    })


    it('Should set a time lock above the absolute minimum but below the initial time lock', async () => {
        let tLock = await vault.timeLock.call()
        assert.equal(tLock, days(2))
        await vault.setTimelock(days(2) - hours(14))
        tLock = await vault.timeLock.call()

        assert.equal(tLock.toNumber(), days(2) - hours(14))
    })    

    it('Should throw on setting a time lock lower than the absolute minimum', async () => {
        let tLock = await vault.timeLock.call()
        assert.equal(tLock, days(2))
        try{
            await vault.setTimelock(days(2) - days(1) - 1)
        }catch(err) {
            return assertJump(err)
        }

        return assert.fail('Test has failed')
    })

    /// @notice `onlyOwner` Changes the maximum number of seconds
    /// `securityGuard` can delay a payment
    /// @param _maxSecurityGuardDelay The new maximum delay in seconds that
    ///  `securityGuard` can delay the payment's execution in total

    // function setMaxSecurityGuardDelay(uint _maxSecurityGuardDelay) onlyOwner {
    //     maxSecurityGuardDelay = _maxSecurityGuardDelay
    // }
    it('Should change the maximum time the security guard is allowed to delay a payment', async () => {
        const nameHash = web3.sha3('larry'),
              paymentDescription = "Thanks for all the fish!",
              refHash = web3.sha3('paymentSharedWithContract'),
              paymentAmount = wei("10"),
              paymentDelay = days(2),
              paymentID = 0

        await vault.authorizeSpender(spender, "larry", nameHash)
        await vault.authorizePayment(
            paymentDescription,
            refHash,
            recipient,
            paymentAmount,
            paymentDelay,
            {from: spender}
        )
        let SG_DELAY = await vault.maxSecurityGuardDelay.call()
        assert.equal(SG_DELAY, days(3))
        await vault.setMaxSecurityGuardDelay(0)

        SG_DELAY = await vault.maxSecurityGuardDelay.call()
        assert.equal(SG_DELAY, 0)

        await vault.setMaxSecurityGuardDelay(days(3))
    })

    it('Should throw on non-owner address setting Maximum Security Guard Delay permission', async () => { 

        try{
            await vault.setMaxSecurityGuardDelay(days(2), {from: acc7})
        }catch(err) {
            return assertJump(err)
        }
        return assert.fail('Test has failed.')
    })

})

function days(days) {
    return 86400 * days
}
function hours(hours) {
    return 3600 * hours
}
function wei(wei/*:string*/) {
    return web3.toBigNumber(wei)
}

function timeTravel(time) {
    return timer(time)
}