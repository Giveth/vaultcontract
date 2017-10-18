![Vault](readme-header.png)

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

`_escapeCaller`: The account/contract (ideally one account given to multiple trusted individuals) given the power to call the escape hatch and empty the Vault to a trusted destination in the case of an emergency; the `owner` can do everything the `escapeCaller` can do and can reassign the `escapeCaller` if necessary. The escape hatch is optional and can be removed by setting the `_escapeCaller` to 0x0.

`_escapeDestination`: The account/contract (ideally a trusted multisig that does not include anyone holding the key for `escapeCaller`) that receives the ether in the vault in the case of an emergency and the function `escapeHatch()` is called.

`_absoluteMinTimeLock`: The absolute minimum number of seconds needed to elapse before an authorized payment from the vault can be executed (giving time for `escapeHatch()` to be called or for the `owner` to reject the payment).

`_timeLock`: The default number of secondsneeded to elapse before an authorized payment from the vault can be executed.

`_securityGuard`: The account/contract (ideally one account given to several trusted individuals) given the power to delay payments in the case of payment disputes; the `securityGuard` can do nothing other than delay the authorized payment's execution. The Security Guard feature is optional and can be removed by setting the `_securityGuard` to 0x0.

`_maxSecurityGuardDelay`: The absolute maximum number of seconds that `securityGuard` is able to delay an authorized payment (giving time for the escape hatch to be called or for the `owner` to reject the payment).
    



### Loading the Vault with Ether

This version of the vault only holds ether (once tested, it will be upgraded to hold tokens as well), ether can be sent directly to the vault (effectively using the fall back fucntion) or by calling `receiveEther()`. If tokens are sent to the Vault, at this point, they will be lost. 

### Managing the White List of Authorized Spending Accounts

The `owner` can add or remove accounts/contracts that are allowed to authorize payments from the `allowedSpenders[]` mapping. To do so, the `owner` calls: 

    function authorizeSpender(address _spender, bool _authorize)

`_authorize` is set to `true` if the owner wants to add `_spender` to the white list or is set `false` if the owner wants to remove `_spender` from the white list. 

### Preparing and Executing a payment

The addresses in the `allowedSpenders[]` map are able to authorize payments from the Vault by calling:

    function authorizePayment(
        string _description,
        address _recipient,
        uint _amount,
        uint _paymentDelay
    ) returns(uint)

The expected inputs are: 
`_description`: A brief description of the payment 
`_recipient`: The address that can call `collectAuthorizedPayment()` and recipient of the payment.
`_amount`: The amount to be paid (in wei)
`_paymentDelay`: The number of seconds the authorized payment is to be delayed before being executed, if this value is less than the default `timeLock` then `timeLock` determines the number of seconds the payment is delayed.

And this function generates the Payment ID Number (`idPayment`) for this payment. 

After the time delay has elapsed (described as a UNIX time by `earliestPayTime`) the authorized payment can be executed by the recipient of the payment calling `collectAuthorizedPayment()`.

The vault records all of its payments on the blockchain; the details of each payment can be viewed using:

    function payment(uint _idPayment)

### Delaying and Canceling a Payment

To allow the `owner` and the`escapeHatchCaller` time to take any action necessary in the case of a questionable payment, the `securityGuard` can delay any payment by calling:

    function delayPayment(uint _idPayment) onlySecurityGuard

Only the `owner` can assign an address to act as the `securityGuard` by calling:

   function setSecurityGuard(address _newSecurityGuard)

also only the `owner` can cancel payments by calling:

    function cancelPayment(uint _idPayment) onlyOwner

### Change the Timelock Requirement

The `owner` can change the minimum time delay for payments by calling:

    function changeTimelock(uint _newTimeLock) onlyOwner

However the `owner` can not lower the time delay below the hardcoded `_absoluteMinTimeLock` set when the Vault was deployed.


### Change the Owner

The `owner` can reassign it’s role to another address (or remove the role of `owner` completely by reassiging it’s role to 0x0) by calling:

    function changeOwner(address _newOwner) onlyOwner

### Escape Hatch Mechanism

The escape hatch is configured in the constructor so that `escapeCaller` can call
the function `escapeHatch()` sending all the ether in the vault to `escapeDestination`.

The `escapeHatchCaller` can be changed by the`owner` or the `escapeCaller` by calling:

    function changeEscapeCaller(address _newEscapeCaller)
