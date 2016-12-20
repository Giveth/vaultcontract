# Vault

This contract is designed to hold ether safely and automate payments to a pre-approved white list of recipients. While this contract is still being tested ether will generally come straight from a trusted Multisig as a safety precaution, but once fully tested and optimized this contract will be a safe place to store funds equipped with optional variable time delays to allow for an optional escape hatch to be utilized if necessary.



### Constructor

   function Vault(
        address _escapeCaller,
        address _escapeDestination,
        uint _absoluteMinTimeLock,
        uint _timeLock,
        address _securityGuard,
        uint _maxSecurityGuardDelay) 

In the constructor of the Vault, you assign: 

`_escapeCaller`: The account/contract (ideally one account given to several trusted individuals) given the power to call the escape hatch in the case of an emergency; `owner` can also call . The escape hatch is optional and can be removed by setting the `_escapeCaller` to 0x0.


`_escapeDestination`: The account/contract (Ideally a trusted multisig that does not include anyone hodling the key for `escapeCaller`.

`_absoluteMinTimeLock`: The absolute minimum number of seconds that is required for a payment from the vault to be delayed before it can be executed (giving time for the escape hatch to be called or for `owner` to reject the payment).

`_timeLock`: The default number of seconds payments are delayed.

`_securityGuard`: The account/contract (ideally one account given to several trusted individuals) given the power to delay payments in the case of payment disputes. The Security Guard Feature is optional and can be removed by setting the `_securityGuard` to 0x0.

`_maxSecurityGuardDelay`: The absolute maximum number of seconds that `securityGuard` is able to delay a payment  for a payment from the vault to be delayed before it can be executed (giving time for the escape hatch to be called).
    



### Loading the Vault with Ether

This version of the vault only holds ether, it can be sent directly to the vault (the fall back fucntion) or by calling `receiveEther()`

### Managing the White List of Authorized Spending Accounts

The owner can add or remove accounts/contracts that are allowed to ask for payments from the `allowedSpenders[]` mapping. To do so, the owner can call: 

    function authorizeSpender(address _spender, bool _authorize)

`_authorize` is set to `true` if the owner wants to add `_spender` to the white list or is set `false` if the owner wants to remove `_spender` from the white list. 

### Preparing and Executing a payment

The addresses in the `allowedSpenders[]` map are authorized to create payments from the Vault by calling:

    function authorizePayment(
        string _description,
        address _recipient,
        uint _amount,
        uint _paymentDelay
    ) returns(uint)



`_description`: Brief description of the payment 
`_recipient`: Address that can call `collectAuthorizedPayment()` and recipient of the payment.
`_amount`: Amount to be paid in wei
`_paymentDelay`: Number of seconds the payment is to be delayed, if this value is less than the default `timeLock` then `timeLock` determines the number of seconds the payment is delayed.


To execute the payment `collectAuthorizedPayment()` can be called after the time delay (described as a UNIX time by `earliestPayTime`)

The vault records authorized payments on the blockchain; they can be accessed by:

    function numberOfPayments() constant returns (uint)

    function payment(uint _idPayment)

### Delaying a Payment

To allow the `owner` and the`escapeHatchCaller` time to take any action necessary in the case of a questionable payment, `securityGuard` can delay any payment by calling:

    function delayPayment(uint _idPayment) onlySecurityGuard

The `owner` can change reassign `securityGuard` by calling

   function setSecurityGuard(address _newSecurityGuard)

and can also cancel any payment by calling

    function cancelPayment(uint _idPayment) onlyOwner

### Change the Timelock Requirement

`owner` can change the minimum time delay for payments by calling:

    function changeTimelock(uint _newTimeLock) onlyOwner

However `owner` can not lower the time delay below the hardcoded `_absoluteMinTimeLock` set when the Vault was deployed


### Change the Owner

The `owner` can reassign it’s role to another address (or remove the role of `owner` completely by reassiging it’s role to 0x0) by calling:

    function changeOwner(address _newOwner) onlyOwner

### The Escape Hatch Mechanism

The Escape Hatch Mechanism is configured in the constructor so that `escapeCaller` can call
the function `escapeHatch()` and all the ether in the vault will be transferred to `escapeDestination`

The `escapeHatchCaller`can be changed by `owner` or `escapeCaller` by calling:

   function changeEscapeCaller(address _newEscapeCaller)
