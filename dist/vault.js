"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _async = require("async");

var _async2 = _interopRequireDefault(_async);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _runethtx = require("runethtx");

var _VaultSol = require("../contracts/Vault.sol.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Vault = function () {
    function Vault(web3, address) {
        _classCallCheck(this, Vault);

        this.web3 = web3;
        this.contract = this.web3.eth.contract(_VaultSol.VaultAbi).at(address);
    }

    _createClass(Vault, [{
        key: "getState",
        value: function getState(cb) {
            var _this = this;

            var st = {};
            var nPayments = void 0;
            _async2.default.series([function (cb1) {
                _this.contract.owner(function (err, _owner) {
                    if (err) {
                        cb(err);return;
                    }
                    st.owner = _owner;
                    cb1();
                });
            }, function (cb1) {
                _this.contract.escapeCaller(function (err, _escapeCaller) {
                    if (err) {
                        cb(err);return;
                    }
                    st.escapeCaller = _escapeCaller;
                    cb1();
                });
            }, function (cb1) {
                _this.contract.escapeDestination(function (err, _escapeDestination) {
                    if (err) {
                        cb(err);return;
                    }
                    st.escapeDestination = _escapeDestination;
                    cb1();
                });
            }, function (cb1) {
                _this.web3.eth.getBalance(_this.contract.address, function (err, _balance) {
                    if (err) {
                        cb(err);return;
                    }
                    st.balance = _this.web3.fromWei(_balance).toNumber();
                    cb1();
                });
            }, function (cb1) {
                _this.contract.numberOfAuthorizedPayments(function (err, res) {
                    if (err) {
                        cb(err);return;
                    }
                    nPayments = res.toNumber();
                    st.payments = [];
                    cb1();
                });
            }, function (cb1) {
                _async2.default.eachSeries(_lodash2.default.range(0, nPayments), function (idPayment, cb2) {
                    _this.contract.authorizedPayments(idPayment, function (err, res) {
                        if (err) {
                            cb(err);return;
                        }
                        st.payments.push({
                            description: res[0],
                            spender: res[1],
                            earliestPayTime: res[2].toNumber(),
                            canceled: res[3],
                            paid: res[4],
                            recipient: res[5],
                            amount: _this.web3.fromWei(res[6]).toNumber()
                        });
                        cb2();
                    });
                }, cb1);
            }], function (err) {
                if (err) {
                    cb(err);return;
                }
                cb(null, st);
            });
        }
    }, {
        key: "collectAuthorizedPayment",
        value: function collectAuthorizedPayment(opts, cb) {
            return (0, _runethtx.send)(Object.assign({}, opts, {
                contract: this.contract,
                method: "collectAuthorizedPayment",
                extraGas: 5000
            }), cb);
        }
    }], [{
        key: "deploy",
        value: function deploy(web3, opts, cb) {
            var params = Object.assign({}, opts);
            var promise = new Promise(function (resolve, reject) {
                params.abi = _VaultSol.VaultAbi;
                params.byteCode = _VaultSol.VaultByteCode;
                return (0, _runethtx.deploy)(web3, params, function (err, _vault) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    var vault = new Vault(web3, _vault.address);
                    resolve(vault);
                });
            });

            if (cb) {
                promise.then(function (value) {
                    cb(null, value);
                }, function (reason) {
                    cb(reason);
                });
            } else {
                return promise;
            }
        }
    }]);

    return Vault;
}();

exports.default = Vault;
module.exports = exports["default"];
