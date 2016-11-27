/*
    Copyright 2016, Jordi Baylina

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// @title Vault Contract
/// @author Jordi Baylina
/// @dev This contract inteds to be a safe place where any DAO can hold funds
///  in a safe place with a time lock and safe hatch functionality

pragma solidity ^0.4.4;

contract Owned {
    /// Allows only the owner to call a function
    modifier onlyOwner { if (msg.sender != owner) throw; _; }

    address public owner;

    function Owned() { owner = msg.sender;}

    /// @notice The Owner can change the owner.
    /// @param _newOwner The address of the new owner. 0x0 if you want an
    ///  unowned neutral vault.
    function changeOwner(address _newOwner) onlyOwner {
        owner = _newOwner;
    }
}

contract Escapable is Owned {
    address escapeCaller;
    address escapeDestination;

    function Escapable(address _escapeCaller, address _escapeDestination) {
        escapeDestination = _escapeDestination;
        escapeCaller = _escapeCaller;
    }

    modifier onlyOwnerOrEscapeCaller {
        if ((msg.sender != escapeCaller)&&(msg.sender!=owner))
            throw; _;
    }

    /// @notice Last Resort call, to allow for a reaction if something bad
    ///  happens to the contract or if some security issue is uncovered.
    function escapeHatch() onlyOwnerOrEscapeCaller {
        if (msg.sender != escapeCaller) throw;
        uint total = this.balance;
        if (!escapeDestination.send(total)) {
            throw;
        }
        EscapeCalled(total);
    }

    function changeEscapeCaller(address _newEscapeCaller) onlyOwnerOrEscapeCaller {
        escapeCaller = _newEscapeCaller;
    }

    event EscapeCalled(uint amount);
}



contract Vault is Escapable {


    struct Payment {
        string description;
        address spender;
        uint earliestPayTime;
        bool cancelled;
        bool paid;
        address recipient;
        uint amount;
        uint securityGuardDelay;
    }

    Payment[] public payments;

    address public securityGuard;        // The securityGuard has the power to delay the payments
    uint public absoluteMinTimeLock;
    uint public timeLock;
    uint public maxSecurityGuardDelay;
    mapping (address => bool) public allowedSpenders;


    modifier onlySecurityGuard { if (msg.sender != securityGuard) throw; _; }


    event PaymentAuthorized(uint idPayment, address recipient, uint amount);
    event PaymentExecuted(uint idPayment, address recipient, uint amount);
    event PaymentCancelled(uint idPayment);
    event EtherReceived(address from, uint amount);
    event SpenderAuthorization(address spender, bool authorized);

/////////
// Constuctor
/////////

    /// @notice Constructor
    /// @param _escapeCaller Who can call scapeHatch. 0x0 if you don't want to
    ///  use this functionality.
    /// @param _escapeDestination Where all the funds are sended when
    ///  `escapeHatch` is called
    /// @param _absoluteMinTimeLock Absolute minTimeLock that nether the owner
    ///  can get low. Set to 0 if the owner can remove the timeLock.
    /// @param _timeLock How much time the payments will be delayrd. This
    ///  parameter can be changed by the owner in the future.
    /// @param _securityGuard Address of the security guard that will be able to
    ///  delay the payments. Set to 0x0 if no security guard functionality is
    ///  desired.
    /// @param _maxSecurityGuardDelay Max time that the security guard can delay
    ///  a payment. In general this time should be enough for the owner to cancel
    ///  the payment.
    function Vault(
        address _escapeCaller,
        address _escapeDestination,
        uint _absoluteMinTimeLock,
        uint _timeLock,
        address _securityGuard,
        uint _maxSecurityGuardDelay) Escapable(_escapeCaller, _escapeDestination)
    {
        securityGuard = _securityGuard;
        timeLock = _timeLock;
        absoluteMinTimeLock = _absoluteMinTimeLock;
        maxSecurityGuardDelay = _maxSecurityGuardDelay;
    }


    /// @notice Returns the total numbe of payments
    function numberOfPayments() constant returns (uint) {
        return payments.length;
    }

//////
// Receive Ether
//////

    /// @notice Method to receive payments
    function receiveEther() payable {
        EtherReceived(msg.sender, msg.value);
    }

    /// @notice By thefaul the vault accepts payments.
    function () payable {
        receiveEther();
    }

////////
// Spender Interface
////////

    /// @notice Authorizes a new payment. Only authorized spenders can call this
    ///  method.
    /// @param _description Brief description of the payment that is authorized
    /// @param _recipient Destination of the payment
    /// @param _amount Amount to be paid in weis.
    /// @param _paymentDalay How much delay in seconds the payment should be
    ///  delayed. If this value is below `timeLock`, the `timeLock` seconds is
    ///  delayed. Set to 0 if minimum delay is required.
    function authorizePayment(
        string _description,
        address _recipient,
        uint _amount,
        uint _paymentDalay
    ) returns(uint) {
        if (!allowedSpenders[msg.sender] ) throw;
        uint idPayment= payments.length;
        payments.length ++;
        Payment payment = payments[idPayment];
        payment.spender = msg.sender;
        payment.earliestPayTime = _paymentDalay >= timeLock ? now + _paymentDalay : now + timeLock;
        payment.recipient = _recipient;
        payment.amount = _amount;
        payment.description = _description;
        PaymentAuthorized(idPayment, payment.recipient, payment.amount);
        return idPayment;
    }

    /// @notice The recipient of a payment will call this method to actually
    ///  receive the ether after the timeLock.
    /// @param _idPayment Id of the payment to be executed.
    function executePayment(uint _idPayment) {

        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if (msg.sender != payment.recipient) throw;
        if (!allowedSpenders[payment.spender]) throw;
        if (now < payment.earliestPayTime) throw;
        if (payment.cancelled) throw;
        if (payment.paid) throw;
        if (this.balance < payment.amount) throw;

        payment.paid = true;
        if (! payment.recipient.send(payment.amount)) {
            throw;
        }
        PaymentExecuted(_idPayment, payment.recipient, payment.amount);
     }

/////////
// SecurityGuard Interface
/////////

    /// @notice The security guard delays a payment
    /// @param _idPayment Id of the payment to be delayed.
    /// @param _delay How much second more the payement will be delayed.
    function delayPayment(uint _idPayment, uint _delay) onlySecurityGuard {
        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if ((payment.securityGuardDelay + _delay > maxSecurityGuardDelay) ||
            (payment.paid) ||
            (payment.cancelled))
            throw;

        payment.securityGuardDelay += _delay;
        payment.earliestPayTime += _delay;
    }

////////
// Owner Interface
///////

    /// @notice The owner cancels a pending payment.
    /// @param _idPayment Id of the payment to be canceld.
    function cancelPayment(uint _idPayment) onlyOwner {
        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if (payment.cancelled) throw;
        if (payment.paid) throw;

        payment.cancelled = true;
        PaymentCancelled(_idPayment);
    }

    /// @notice The owner authorizes/desauthorized a spender.
    /// @param _spender address of the spender to be authorized/desauthorized.
    /// @param _authorize `true` to authorize and `false` to desauthorize.
    function authorizeSpender(address _spender, bool _authorize) onlyOwner {
        allowedSpenders[_spender] = _authorize;
        SpenderAuthorization(_spender, _authorize);
    }

    /// @notice The owner sets a new security guard.
    /// @param _newSecurityGuard Address of the new security guard.
    function setSecurityGuard(address _newSecurityGuard) onlyOwner {
        securityGuard = _newSecurityGuard;
    }


    /// @notice The owner sets a new timeLock. This timeLock can not be lower
    ///  than `absoluteMinTimeLock`
    /// @param _newTimeLock New `timeLock` in seconds. The pending paymaints
    ///  will maintain ther payment times.
    function setTimelock(uint _newTimeLock) onlyOwner {
        if (_newTimeLock < absoluteMinTimeLock) throw;
        timeLock = _newTimeLock;
    }

    /// @notice The owner sets the maximum time the security guard can delay a
    ///  payment
    /// @param _maxSecurityGuardDelay The new maximum delay in seconds
    function setMaxSecurityGuardDelay(uint _maxSecurityGuardDelay) onlyOwner {
        maxSecurityGuardDelay = _maxSecurityGuardDelay;
    }
}
