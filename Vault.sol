pragma solidity ^0.4.4;

contract Escapable {
    address escapeCaller;
    address escapeDestination;

    function Escapable(address _escapeCaller, address _escapeDestination) {
        escapeDestination = _escapeDestination;
        escapeCaller = _escapeCaller;
    }

    modifier onlyScapeCaller { if (msg.sender != escapeCaller) throw; _; }

    /// Last Resort call, to allow for a reaction if something bad happens to
    /// the contract or if some security issue is uncovered.
    function escapeHatch() onlyScapeCaller {
        if (msg.sender != escapeCaller) throw;
        uint total = this.balance;
        if (!escapeDestination.send(total)) {
            throw;
        }
        EscapeCalled(total);
    }

    function changeScapeCaller(address _newEscapeCaller) onlyScapeCaller {
        escapeCaller = _newEscapeCaller;
    }

    event EscapeCalled(uint amount);
}

contract Owned {
    /// Allows only the owner to call a function
    modifier onlyOwner { if (msg.sender != owner) throw; _; }

    address public owner;

    function Owned() { owner = msg.sender;}

    function changeOwner(address _newOwner) onlyOwner {
        owner = _newOwner;
    }
}

contract Vault is Escapable, Owned {

    uint constant absoluteMinTimeLock = 1 days;

    struct Payment {
        uint minPayTime;
        bool cancelled;
        bool payed;
        address destination;
        uint value;
        bytes data;
    }

    Payment[] payments;

    address public guardian;        // The guardian has the power to stop the payments
    uint public timeLock;
    mapping (address => bool) public allowedSpenders;

///////
// Modifiers
///////

    modifier onlyGuardianOrOwner {
        if ((msg.sender != owner) &&
            (msg.sender != guardian))
            throw;
        _;
    }

/////////
// Constuctor
/////////

    function Vault(
        address _escapeCaller,
        address _escapeDestination,
        address _guardian,
        uint _timeLock) Escapable(_escapeCaller, _escapeDestination)
    {
        guardian = _guardian;
        timeLock = _timeLock;
    }

//////
// Receive Ether
//////

    function receiveEther() payable {
        EtherReceived(msg.sender, msg.value);
    }

////////
// Spender Interface
////////

    function preparePayment(address _destination, uint _value, bytes _data, uint _minPayTime) returns(uint) {
        if (!allowedSpenders[msg.sender] ) throw;
        if (_minPayTime < now + timeLock) throw;
        uint idPayment= payments.length;
        payments.length ++;
        Payment payment = payments[idPayment];
        payment.minPayTime = _minPayTime;
        payment.destination = _destination;
        payment.value = _value;
        payment.data = _data;
        PaymentPrepared(idPayment, payment.destination, payment.value, payment.data);
        return idPayment;
    }

    function executePayment(uint _idPayment) {
        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if (now < payment.minPayTime) throw;
        if (payment.cancelled) throw;
        if (payment.payed) throw;
        if (this.balance < payment.value) throw;

        payment.payed = true;
        if (! payment.destination.call.value(payment.value)(payment.data)) {
            throw;
        }
        PaymentExecuted(_idPayment, payment.destination, payment.value, payment.data);
     }

/////////
// Guardian Interface
/////////

    function cancelPayment(uint _idPayment) onlyGuardianOrOwner {
        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if (payment.cancelled) throw;
        if (payment.payed) throw;

        payment.cancelled = true;
        PaymentCancelled(_idPayment);
    }

////////
// Owner Interface
///////

    function authorizeSpender(address _spender, bool _authorize) onlyOwner {
        allowedSpenders[_spender] = _authorize;
        SpenderAuthorization(_spender, _authorize);
    }

    function changeGuardian(address _newGuardian) onlyOwner {
        guardian = _newGuardian;
    }

    function changeTimelock(uint _newTimeLock) onlyOwner {
        if (_newTimeLock < absoluteMinTimeLock) throw;
        timeLock = _newTimeLock;
    }

////////////
// Events
////////////

    event PaymentPrepared(uint idPayment, address destination, uint value, bytes data);
    event PaymentExecuted(uint idPayment, address destination, uint value, bytes data);
    event PaymentCancelled(uint idPayment);
    event EtherReceived(address from, uint value);
    event SpenderAuthorization(address spender, bool authorized);

}
