require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
      development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    test: {
      host: "localhost",
	  gasPrice: 1,
      gas: 0xfffffff,
      port: 8545,
      network_id: "*" // Match any network id
    }
  }
};
