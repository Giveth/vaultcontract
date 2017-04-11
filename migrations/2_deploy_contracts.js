var Vault = artifacts.require("./Vault.sol");

module.exports = function(deployer) {
  deployer.deploy(Vault);
};
