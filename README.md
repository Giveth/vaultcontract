# vault

This contract is designed to keep Ether inside. The output of the ether can be
triggered only by a closed set of accounts. And the real payment is delayed by
a configurable time. During this deley, a security guard (if defined) can cancel the
payment.

The contract also implements a ScapeHatch mechanism to transfer all the funds to
a secure address in case of an emergency.

### constructing a scapeHatch

This is the constructor for the Vault

    function Vault(
        address _escapeCaller,
        address _escapeDestination,
        uint _absoluteMinTimeLock,
        uint _timeLock,
        address _securityGuard,
        uint _maxSecurityGuardDelay)


### receive Ether

Ether can be sended directly to the contract or by calling

    receiveEther()

### Managing the list of authorized accounts

The owner can add or remove accounts that can ask for payments. To do so,
the owner can call:

    function authorizeSpender(address _spender, bool _authorize)

### Preparing and executing a payment

Authorized accounts can call

    function authorizePayment(address _recipient, uint _value, bytes _data, uint _minPayTime) returns(uint);

To execute the payment this method must be called after the _minPayTime. Thus method
can be called by any body.

    function executePayment(uint _idPayment)

Any body can query the payments

    function numberOfPayments() constant returns (uint);
    function payment(uint _idPayment)

### Delaying a payment

The security guard can delay any payment by calling:

    function delayPayment(uint _idPayment) onlyGuardianOrOwner

This should be enough to allow the owner or the scapeHatcher to take any action
if necessary.

Of course the security guard can be also 0x

The owner can change the security guard by calling

    function changeGuardian(address _newGuardian) onlyOwner

and can also cancel any payment by calling

    function cancelPayment(uint _idPayment) onlyOwner

### Change congigurable timelock

The owner can change the minimum time delay to do the payments by calling:

    function changeTimelock(uint _newTimeLock) onlyOwner

There is an harcoded absolute minimum time that even the owner can not change.
To change this absolute minimum, A new deployment of the contract would be needed

### Change the owner of the contract

Owner can transfer ownership of the contract by calling

    function changeOwner(address _newOwner) onlyOwner

### Escape hatch mechanism

A escapeHatch mechanism can be configured so that `escapeCaller` can call
the function `escapeHatch()` and all the funds will be transfered to `escapeDestination`

`escapeCaller`can be changed by the owner or the scapeCaller by calling this function:

    function changeScapeCaller(address _newEscapeCaller) onlyOwnerOrScapeCaller

