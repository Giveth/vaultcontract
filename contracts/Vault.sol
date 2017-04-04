pragma solidity ^0.4.6;

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
/// @notice This contract holds funds for Campaigns and automates payments. For
///  this iteration the funds will come straight from the Giveth Multisig as a
///  safety precaution, but once fully tested and optimized this contract will
///  be a safe place to store funds equipped with optional variable time delays
///  to allow for an optional escape hatch

import "Owned.sol";
import "Token.sol";
import "Escapable.sol";


/// @dev `Vault` is a higher level contract built off of the `Escapable`
///  contract that holds funds for Campaigns and automates payments.
contract Vault is Escapable, Owned {

    /// @dev `Payment` is a public structure that describes the details of
    ///  each payment making it easy to track the movement of funds
    ///  transparently
    struct Payment {
        string name;     // What is the purpose of this payment
        bytes32 reference;  // Reference of the payment.
        address spender;        // Who is sending the funds
        uint earliestPayTime;   // The earliest a payment can be made (Unix Time)
        bool canceled;         // If True then the payment has been canceled
        bool paid;              // If True then the payment has been paid
        address recipient;      // Who is receiving the funds
        uint amount;            // The amount of wei sent in the payment
        uint securityGuardDelay;// The seconds `securityGuard` can delay payment
    }

    Payment[] public authorizedPayments;

    address public securityGuard;
    uint public absoluteMinTimeLock;
    uint public timeLock;
    uint public maxSecurityGuardDelay;

    uint public totalSpent;         // Counter
    uint public totalAuthorizedToBeSpent;    // Counter

    /// @dev The white list of approved addresses allowed to set up && receive
    ///  payments from this vault 
    struct Spender {
        string name;
        bytes32 reference; // Hash used to uniquely identify the spender
        uint idx;          // Index used for managing authorizing spenders
    }

    address[] public spenderAddresses;
    mapping (address => Spender) public spenders;

    /// @dev The address assigned the role of `securityGuard` is the only
    ///  addresses that can call a function with this modifier
    modifier onlySecurityGuard { if (msg.sender != securityGuard) throw; _; }

    // @dev Events to make the payment movements easy to find on the blockchain
    event PaymentAuthorized(uint indexed idPayment, address indexed recipient, uint amount);
    event PaymentExecuted(uint indexed idPayment, address indexed recipient, uint amount);
    event PaymentCanceled(uint indexed idPayment);
    event SpenderAuthorized(address indexed spender);
    event SpenderRemoved(address indexed spender);
    event SecurityGuardChanged(address indexed securityGuard);
    event TimeLockChanged(uint indexed timeLock);
    event PaymentDelayed(uint indexed earliestPayTime);

/////////
// Constructor
/////////

    /// @notice The Constructor creates the Vault on the blockchain
    /// @param _baseToken The address of the token that is used as a store value
    ///  for this contract, 0x0 in case of ether. The token must have the ERC20
    ///  standard `balanceOf()` and `transfer()` functions
    /// @param _escapeHatchCaller The address of a trusted account or contract to
    ///  call `escapeHatch()` to send the ether in this contract to the
    ///  `escapeHatchDestination` it would be ideal if `escapeHatchCaller` cannot move
    ///  funds out of `escapeHatchDestination`
    /// @param _escapeHatchDestination The address of a safe location (usu a
    ///  Multisig) to send the ether held in this contract in an emergency
    /// @param _absoluteMinTimeLock The minimum number of seconds `timelock` can
    ///  be set to, if set to 0 the `owner` can remove the `timeLock` completely
    /// @param _timeLock Initial number of seconds that payments are delayed
    ///  after they are authorized (a security precaution)
    /// @param _securityGuard Address that will be able to delay the payments
    ///  beyond the initial timelock requirements; can be set to 0x0 to remove
    ///  the `securityGuard` functionality
    /// @param _maxSecurityGuardDelay The maximum number of seconds in total
    ///   that `securityGuard` can delay a payment so that the owner can cancel
    ///   the payment if needed
    function Vault(
        address _baseToken,
        address _escapeHatchCaller,
        address _escapeHatchDestination,
        uint _absoluteMinTimeLock,
        uint _timeLock,
        address _securityGuard,
        uint _maxSecurityGuardDelay
    ) Escapable(_baseToken, _escapeHatchCaller, _escapeHatchDestination)
    {
        absoluteMinTimeLock = _absoluteMinTimeLock;
        timeLock = _timeLock;
        securityGuard = _securityGuard;
        maxSecurityGuardDelay = _maxSecurityGuardDelay;
    }

///////////////////////////////
// Spender related functions
///////////////////////////////

    function numberOfSpenders() constant returns(uint) {
        return spenderAddresses.length;
    }

    /// @notice `onlyOwner` Adds a spender to the `spenders[]` white list, can
    ///  also be used to simply rename a spender already on the white list
    /// @param _spender The address of the contract being authorized
    /// @param _reference Reference hash of the spender
    function authorizeSpender(
        address _spender,
        string _name,
        bytes32 _reference
    ) onlyOwner {
        unauthorizeSpender(_spender);
        spenders[_spender].name = _name;
        spenders[_spender].reference = _reference;

        spenderAddresses.length++;
        spenders[_spender].idx = spenderAddresses.length;
        spenderAddresses[spenderAddresses.length - 1] = _spender;
        SpenderAuthorized(_spender);
    }

    /// @notice `onlyOwner` Removes a spender from the `spenders[]` white list
    /// @param _spender The address of the contract being unauthorized
    function unauthorizeSpender(address _spender) onlyOwner {
        Spender deletedSpender = spenders[_spender];
        if (deletedSpender.idx == 0) return;

        Spender lastSpender = spenders[spenderAddresses[spenderAddresses.length -1]];

        lastSpender.idx = deletedSpender.idx;
        spenderAddresses[lastSpender.idx -1] = spenderAddresses[spenderAddresses.length -1];
        spenderAddresses.length --;

        deletedSpender.name = "";
        deletedSpender.reference = 0x0;
        deletedSpender.idx = 0;
        SpenderRemoved(_spender);
    }

    function isAuthorized(address _spender) constant returns (bool) {
        Spender spender = spenders[_spender];
        if (_spender == 0) return false;
        if (spender.idx == 0) return false;
        return true;
    }

/////////
// Helper functions
/////////

    /// @notice States the total number of authorized payments in this contract
    /// @return The number of payments ever authorized even if they were canceled
    function numberOfAuthorizedPayments() constant returns (uint) {
        return authorizedPayments.length;
    }



////////
// Spender Interface
////////

    /// @notice only `spenders[]` Creates a new `Payment`
    /// @param _name Brief description of the payment that is authorized
    /// @param _reference Reference hash of the payment shared with the contract
    ///  requesting the payment.
    /// @param _recipient Destination of the payment
    /// @param _amount Amount to be paid in wei
    /// @param _paymentDelay Number of seconds the payment is to be delayed, if
    ///  this value is below `timeLock` then the `timeLock` determines the delay
    /// @return The Payment ID number for the new authorized payment
    function authorizePayment(
        string _name,
        bytes32 _reference,
        address _recipient,
        uint _amount,
        uint _paymentDelay
    ) returns(uint) {

        // Fail if you aren't on the `spenders[]` whitelist
        Spender spender = spenders[msg.sender];
        if (spender.idx == 0) throw;

        uint idPayment = authorizedPayments.length;       // Unique Payment ID
        authorizedPayments.length++;

        // The following lines fill out the payment struct
        Payment p = authorizedPayments[idPayment];
        p.spender = msg.sender;

        if (_paymentDelay > 10**18) throw;  // Overflow protection

        // Determines the earliest the recipient can receive payment (Unix time)
        p.earliestPayTime = _paymentDelay >= timeLock ?
                                now + _paymentDelay :
                                now + timeLock;
        p.recipient = _recipient;
        p.amount = _amount;
        p.name = _name;
        p.reference = _reference;

        totalAuthorizedToBeSpent += p.amount;
        PaymentAuthorized(idPayment, p.recipient, p.amount);

        if ((now >= p.earliestPayTime) && (getBalance() >= p.amount)) {
            p.paid = true;                      // Set the payment to being paid
            transfer(p.recipient, p.amount);    // Make the payment

            totalAuthorizedToBeSpent -= p.amount;
            totalSpent += p.amount;         // Accounting
            PaymentExecuted(idPayment, p.recipient, p.amount);
        }
        return idPayment;
    }

    /// @notice only `spenders[]` The recipient of a payment calls this
    ///  function to send themselves the ether after the `earliestPayTime` has
    ///  expired
    /// @param _idPayment The payment ID to be executed
    function collectAuthorizedPayment(uint _idPayment) {


        // Check that the `_idPayment` has been added to the payments struct
        if (_idPayment >= authorizedPayments.length) throw;

        Payment p = authorizedPayments[_idPayment];

        Spender spender = spenders[p.spender];
        if (spender.idx == 0) throw;

        // Checking for reasons not to execute the payment
        if (msg.sender != p.recipient) throw;
        if (now < p.earliestPayTime) throw;
        if (p.canceled) throw;
        if (p.paid) throw;
        if (getBalance() < p.amount) throw;

        p.paid = true; // Set the payment to being paid
        transfer(p.recipient, p.amount);// Make the payment

        totalAuthorizedToBeSpent -= p.amount;
        totalSpent += p.amount;
        PaymentExecuted(_idPayment, p.recipient, p.amount);
     }


/////////
// SecurityGuard Interface
/////////

    /// @notice `onlySecurityGuard` Delays a payment for a set number of seconds
    /// @param _idPayment ID of the payment to be delayed
    /// @param _delay The number of seconds to delay the payment
    function delayPayment(uint _idPayment, uint _delay) onlySecurityGuard {
        if (_idPayment >= authorizedPayments.length) throw;

        // Overflow test
        if (_delay > 10**18) throw;

        Payment p = authorizedPayments[_idPayment];

        if ((p.securityGuardDelay + _delay > maxSecurityGuardDelay) ||
            (p.paid) ||
            (p.canceled))
            throw;

        p.securityGuardDelay += _delay;
        p.earliestPayTime += _delay;
        PaymentDelayed(p.earliestPayTime);
    }

////////
// Owner Interface
///////

    /// @notice `onlyOwner` Cancel a payment all together
    /// @param _idPayment ID of the payment to be canceled.
    function cancelPayment(uint _idPayment) onlyOwner {
        if (_idPayment >= authorizedPayments.length) throw;

        Payment p = authorizedPayments[_idPayment];

        if (p.canceled) throw;
        if (p.paid) throw;

        p.canceled = true;
        PaymentCanceled(_idPayment);
    }

    /// @notice `onlyOwner` Sets the address of `securityGuard`
    /// @param _newSecurityGuard Address of the new security guard
    function setSecurityGuard(address _newSecurityGuard) onlyOwner {
        securityGuard = _newSecurityGuard;
        SecurityGuardChanged(_newSecurityGuard);
    }

    /// @notice `onlyOwner` Changes `timeLock`; the new `timeLock` cannot be
    ///  lower than `absoluteMinTimeLock`
    /// @param _newTimeLock Sets the new minimum default `timeLock` in seconds;
    ///  pending payments maintain their `earliestPayTime`
    function setTimelock(uint _newTimeLock) onlyOwner {
        if (_newTimeLock < absoluteMinTimeLock) throw;
        timeLock = _newTimeLock;
        TimeLockChanged(_newTimeLock);
    }

    /// @notice `onlyOwner` Changes the maximum number of seconds
    /// `securityGuard` can delay a payment
    /// @param _maxSecurityGuardDelay The new maximum delay in seconds that
    ///  `securityGuard` can delay the payment's execution in total
    function setMaxSecurityGuardDelay(uint _maxSecurityGuardDelay) onlyOwner {
        maxSecurityGuardDelay = _maxSecurityGuardDelay;
    }
}
