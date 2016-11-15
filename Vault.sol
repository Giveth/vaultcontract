pragma solidity ^0.4.4;


contract Owned {
    /// Allows only the owner to call a function
    modifier onlyOwner { if (msg.sender != owner) throw; _; }

    address public owner;

    function Owned() { owner = msg.sender;}

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

    modifier onlyOwnerOrScapeCaller { if ((msg.sender != escapeCaller)&&(msg.sender!=owner)) throw; _; }

    /// Last Resort call, to allow for a reaction if something bad happens to
    /// the contract or if some security issue is uncovered.
    function escapeHatch() onlyOwnerOrScapeCaller {
        if (msg.sender != escapeCaller) throw;
        uint total = this.balance;
        if (!escapeDestination.send(total)) {
            throw;
        }
        EscapeCalled(total);
    }

    function changeScapeCaller(address _newEscapeCaller) onlyOwnerOrScapeCaller {
        escapeCaller = _newEscapeCaller;
    }

    event EscapeCalled(uint amount);
}



contract Vault is Escapable {


    struct Payment {
        address spender;
        uint minPayTime;
        bool cancelled;
        bool payed;
        address recipient;
        uint value;
        bytes data;
    }

    Payment[] public payments;

    address public guardian;        // The guardian has the power to stop the payments
    uint public absoluteMinTimeLock;
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
        uint _absoluteMinTimeLock,
        uint _timeLock) Escapable(_escapeCaller, _escapeDestination)
    {
        guardian = _guardian;
        timeLock = _timeLock;
        absoluteMinTimeLock = _absoluteMinTimeLock;
    }

//////
// Receive Ether
//////

    function receiveEther() payable {
        EtherReceived(msg.sender, msg.value);
    }

    function () payable {
        receiveEther();
    }

////////
// Spender Interface
////////

    function preparePayment(address _recipient, uint _value, bytes _data, uint _minPayTime) returns(uint) {
        if (!allowedSpenders[msg.sender] ) throw;
        uint idPayment= payments.length;
        payments.length ++;
        Payment payment = payments[idPayment];
        payment.spender = msg.sender;
        payment.minPayTime = _minPayTime >= timeLock ? now + _minPayTime : now + timeLock;
        payment.recipient = _recipient;
        payment.value = _value;
        payment.data = _data;
        PaymentPrepared(idPayment, payment.recipient, payment.value, payment.data);
        return idPayment;
    }

    function executePayment(uint _idPayment) {
        if (_idPayment >= payments.length) throw;

        Payment payment = payments[_idPayment];

        if (!allowedSpenders[payment.spender]) throw;
        if (now < payment.minPayTime) throw;
        if (payment.cancelled) throw;
        if (payment.payed) throw;
        if (this.balance < payment.value) throw;

        payment.payed = true;
        if (! payment.recipient.call.value(payment.value)(payment.data)) {
            throw;
        }
        PaymentExecuted(_idPayment, payment.recipient, payment.value, payment.data);
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

    function numberOfPayments() constant returns (uint) {
        return payments.length;
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

    event PaymentPrepared(uint idPayment, address recipient, uint value, bytes data);
    event PaymentExecuted(uint idPayment, address recipient, uint value, bytes data);
    event PaymentCancelled(uint idPayment);
    event EtherReceived(address from, uint value);
    event SpenderAuthorization(address spender, bool authorized);

}
