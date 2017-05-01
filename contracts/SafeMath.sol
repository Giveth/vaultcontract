// Copyright (C) 2015, 2016, 2017  DappHub, LLC

// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND (express or implied).
// 
// Thank you to @zandy and the Dappsys team for writing this beautiful library
// Their math.sol was modified to remove and rename functions and add many
// comments for clarification.
// See their original library here: https://github.com/dapphub/ds-math
//
// Also the OpenZepplin team deserves gratitude and recognition for making
// their own beautiful library which has been very well utilized in solidity
// contracts across the Ethereum ecosystem and we used their max64(), min64(),
// multiply(), and divide() functions. See their library here:
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/SafeMath.sol

pragma solidity ^0.4.6;

contract SafeMath {

    // ensure that the result of adding x and y is accurate 
    function add(uint x, uint y) internal constant returns (uint z) {
        assert( (z = x + y) >= x);
    }
 
    // ensure that the result of subtracting y from x is accurate 
    function subtract(uint x, uint y) internal constant returns (uint z) {
        assert( (z = x - y) <= x);
    }

    // ensure that the result of multiplying x and y is accurate 
    function multiply(uint x, uint y) internal constant returns (uint z) {
        z = x * y;
        assert(x == 0 || z / x == y);
        return z;
    }

    // ensure that the result of dividing x and y is accurate
    // note: Solidity now throws on division by zero, so a check is not needed
    function divide(uint x, uint y) internal constant returns (uint z) {
        z = x / y;
        assert(x == ( (y * z) + (x % y) ));
        return z;
    }
    
    // return the lowest of two 64 bit integers
    function min64(uint64 x, uint64 y) internal constant returns (uint64) {
      return x < y ? x: y;
    }
    
    // return the largest of two 64 bit integers
    function max64(uint64 x, uint64 y) internal constant returns (uint64) {
      return x >= y ? x : y;
    }

    // return the lowest of two values
    function min(uint x, uint y) internal constant returns (uint) {
        return (x <= y) ? x : y;
    }

    // return the largest of two values
    function max(uint x, uint y) internal constant returns (uint) {
        return (x >= y) ? x : y;
    }

    function assert(bool assertion) internal {
        if (!assertion) {
            throw;
        }
    }

}
