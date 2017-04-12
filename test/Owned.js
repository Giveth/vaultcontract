'use strict';

const assertJump = require('./helpers/assertJump');

var Owned = artifacts.require('../contracts/Owned.sol');

contract('Owned', function(accounts) {
  let owned;

  beforeEach(async function() {
    owned = await Owned.new();
  });

  it('should have an owner', async function() {
    let owner = await owned.owner();
    assert.isTrue(owner !== 0);
  });

  it('changes owner after transfer', async function() {
    let other = accounts[1];
    await owned.changeOwner(other);
    let owner = await owned.owner();

    assert.isTrue(owner === other);
  });

  it('should prevent non-owners from transfering', async function() {
    const other = accounts[2];
    const owner = await owned.owner.call();
    assert.isTrue(owner !== other);
    try {
      await owned.changeOwner(other, {from: other});
    } catch(error) {
      assertJump(error);
    }
  });
/*
  it('should guard ownership against stuck state', async function() {
    let originalOwner = await owned.owner();
    await owned.changeOwner(null, {from: originalOwner});
    let newOwner = await owned.owner();

    assert.equal(originalOwner, newOwner);
  });
*/
});
