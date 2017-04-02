pragma solidity ^0.4.6;

import "Token.sol";
/// @dev `Escapable` is a base level contract for holding ETH or ERC20 tokens
///  contract creates an escape hatch function to send its ether to
///  `escapeHatchDestination` when called by the `escapeHatchCaller` in the case that
///  something unexpected happens
contract Escapable {
    Token public baseToken;

    address public escapeHatchCaller;
    address public escapeHatchDestination;

    /// @notice The Constructor assigns the `escapeHatchDestination` and the
    ///  `escapeHatchCaller`
    /// @param _baseToken 0x0 in case of ETH and tokenContract for any other ERC20 token
    /// @param _escapeHatchDestination The address of a safe location (usu a
    ///  Multisig) to send the ether held in this contract
    /// @param _escapeHatchCaller The address of a trusted account or contract to
    ///  call `escapeHatch()` to send the ether in this contract to the
    ///  `escapeHatchDestination` it would be ideal that `escapeHatchCaller` cannot move
    ///  funds out of `escapeHatchDestination`
    function Escapable(address _baseToken, address _escapeHatchCaller, address _escapeHatchDestination) {
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
    function changeEscapeCaller(address _newEscapeHatchCaller) onlyEscapeHatchCaller {
        escapeHatchCaller = _newEscapeHatchCaller;
    }

    function getBalance() constant returns(uint) {
        if (address(baseToken) != 0) {
            return baseToken.balanceOf(this);
        } else {
            return this.balance;
        }
    }

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
    event EtherReceived(address indexed from, uint amount);
}
