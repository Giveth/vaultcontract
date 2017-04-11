var Owned = artifacts.require("./Owned.sol");
var Escapable = artifacts.require("./Escapable.sol");
var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(Owned);
  deployer.deploy(Escapable);
};
