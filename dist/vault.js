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
        value: function getState(_cb) {
            var _this = this;

            return (0, _runethtx.asyncfunc)(function (cb) {
                var st = {
                    address: _this.contract.address
                };
                var nPayments = void 0;
                _async2.default.series([function (cb1) {
                    _this.contract.owner(function (err, _owner) {
                        if (err) {
                            cb1(err);return;
                        }
                        st.owner = _owner;
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.escapeHatchCaller(function (err, _escapeHatchCaller) {
                        if (err) {
                            cb1(err);return;
                        }
                        st.escapeHatchCaller = _escapeHatchCaller;
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.escapeHatchDestination(function (err, _escapeHatchDestination) {
                        if (err) {
                            cb1(err);return;
                        }
                        st.escapeHatchDestination = _escapeHatchDestination;
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.getBalance(function (err, _balance) {
                        if (err) {
                            cb1(err);return;
                        }
                        st.balance = _balance;
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.numberOfAuthorizedPayments(function (err, res) {
                        if (err) {
                            cb1(err);return;
                        }
                        nPayments = res.toNumber();
                        st.payments = [];
                        cb1();
                    });
                }, function (cb1) {
                    _async2.default.eachSeries(_lodash2.default.range(0, nPayments), function (idPayment, cb2) {
                        _this.contract.authorizedPayments(idPayment, function (err, res) {
                            if (err) {
                                cb2(err);return;
                            }
                            st.payments.push({
                                idPayment: idPayment,
                                name: res[0],
                                reference: res[1],
                                spender: res[2],
                                earliestPayTime: res[3].toNumber(),
                                canceled: res[4],
                                paid: res[5],
                                recipient: res[6],
                                amount: res[7]
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
            }, _cb);
        }
    }, {
        key: "collectAuthorizedPayment",
        value: function collectAuthorizedPayment(opts, cb) {
            return (0, _runethtx.sendContractTx)(this.web3, this.contract, "collectAuthorizedPayment", Object.assign({}, opts, {
                extraGas: 50000
            }), cb);
        }
    }], [{
        key: "deploy",
        value: function deploy(web3, opts, _cb) {
            return (0, _runethtx.asyncfunc)(function (cb) {
                var params = Object.assign({}, opts);
                params.abi = _VaultSol.VaultAbi;
                params.byteCode = _VaultSol.VaultByteCode;
                return (0, _runethtx.deploy)(web3, params, function (err, _vault) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    var vault = new Vault(web3, _vault.address);
                    cb(null, vault);
                });
            }, _cb);
        }
    }]);

    return Vault;
}();

exports.default = Vault;
module.exports = exports["default"];
