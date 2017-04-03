pragma solidity ^0.4.6;

import "Token.sol";

/// @dev `Escapable` is a base level contract for and contract that wants to
///  add an escape hatch for a contract that holds ETH or ERC20 tokens. This
///  contract creates an `escapeHatch()` function to send its `baseTokens` to
///  `escapeHatchDestination` when called by the `escapeHatchCaller` in the case that
///  something unexpected happens
contract Escapable {
    Token public baseToken;

    address public escapeHatchCaller;
    address public escapeHatchDestination;

    /// @notice The Constructor assigns the `escapeHatchDestination`, the
    ///  `escapeHatchCaller`, and the `baseToken`
    /// @param _baseToken The address of the token that is used as a store value
    ///  for this contract, 0x0 in case of ether. The token must have the ERC20
    ///  standard `balanceOf()` and `transfer()` functions
    /// @param _escapeHatchDestination The address of a safe location (usu a
    ///  Multisig) to send the `baseToken` held in this contract
    /// @param _escapeHatchCaller The address of a trusted account or contract to
    ///  call `escapeHatch()` to send the `baseToken` in this contract to the
    ///  `escapeHatchDestination` it would be ideal that `escapeHatchCaller`
    /// cannot move funds out of `escapeHatchDestination`
    function Escapable(
        address _baseToken, 
        address _escapeHatchCaller, 
        address _escapeHatchDestination) {
        baseToken = Token(_baseToken);
        escapeHatchCaller = _escapeHatchCaller;
        escapeHatchDestination = _escapeHatchDestination;
    }

    /// @dev The addresses preassigned the `escapeHatchCaller` role
    ///  is the only addresses that can call a function with this modifier
    modifier onlyEscapeHatchCaller {
        if (msg.sender != escapeHatchCaller)
            throw;
        _;
    }

    /// @notice The `escapeHatch()` should only be called as a last resort if a
    /// security issue is uncovered or something unexpected happened
    function escapeHatch() onlyEscapeHatchCaller {
        uint total = getBalance();
        // Send the total balance of this contract to the `escapeHatchDestination`
        transfer(escapeHatchDestination, total);
        EscapeHatchCalled(total);
    }
    /// @notice Changes the address assigned to call `escapeHatch()`
    /// @param _newEscapeHatchCaller The address of a trusted account or contract to
    ///  call `escapeHatch()` to send the ether in this contract to the
    ///  `escapeHatchDestination` it would be ideal that `escapeHatchCaller` cannot
    ///  move funds out of `escapeHatchDestination`
    function changeEscapeCaller(address _newEscapeHatchCaller
        ) onlyEscapeHatchCaller {
        escapeHatchCaller = _newEscapeHatchCaller;
        EscapeHatchCallerChanged(escapeHatchCaller);
    }
    /// @notice Returns the balance of the `baseToken` stored in this contract
    function getBalance() constant returns(uint) {
        if (address(baseToken) != 0) {
            return baseToken.balanceOf(this);
        } else {
            return this.balance;
        }
    }
    /// @notice Sends an `_amount` of `baseToken` to `_to` from this contract,
    /// and it can only be called by the contract itself
    /// @param _to The address of the recipient
    /// @param _amount The amount of `baseToken to be sent
    function transfer(address _to, uint _amount) internal {
        if (address(baseToken) != 0) {
            if (!baseToken.transfer(_to, _amount)) throw;
        } else {
            if (! _to.send(_amount)) throw;
        }
    }


//////
// Receive Ether
//////

    /// @notice Called anytime ether is sent to the contract && creates an event
    /// to more easily track the incoming transactions
    function receiveEther() payable {
        // Do not accept ether if baseToken is not ETH
        if (address(baseToken) != 0) throw;
        EtherReceived(msg.sender, msg.value);
    }

    /// @notice The fall back function is called whenever ether is sent to this
    ///  contract
    function () payable {
        receiveEther();
    }
    event EscapeHatchCalled(uint amount);
    event EscapeHatchCallerChanged(address indexed newEscapeHatchCaller);
    event EtherReceived(address indexed from, uint amount);
}
