"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Vault = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.deploy = deploy;

var _async = require("async");

var _async2 = _interopRequireDefault(_async);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _VaultSol = require("../contracts/Vault.sol.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Vault = exports.Vault = function () {
    function Vault(web3, address) {
        _classCallCheck(this, Vault);

        this.web3 = web3;
        this.contract = this.web3.eth.contract(_VaultSol.VaultAbi).at(address);
    }

    _createClass(Vault, [{
        key: "getStatus",
        value: function getStatus(cb) {
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
    }]);

    return Vault;
}();

function deploy(web3, opts, cb) {
    var account = void 0;
    var vault = void 0;
    _async2.default.series([function (cb1) {
        if (opts.from) {
            account = opts.from;
            cb1();
        } else {
            web3.eth.getAccounts(function (err, _accounts) {
                if (err) {
                    cb(err);return;
                }
                if (_accounts.length === 0) return cb1(new Error("No account to deploy a contract"));
                account = _accounts[0];
                cb1();
            });
        }
    }, function (cb2) {
        var contract = web3.eth.contract(_VaultSol.VaultAbi);
        contract.new(opts.escapeCaller, opts.escapeDestination, opts.absoluteMinTimeLock, opts.timeLock, opts.securityGuard, opts.maxSecurityGuardDelay, {
            from: account,
            data: _VaultSol.VaultByteCode,
            gas: 3000000,
            value: opts.value || 0
        }, function (err, _contract) {
            if (err) {
                cb2(err);return;
            }
            if (typeof _contract.address !== "undefined") {
                vault = new Vault(web3, _contract.address);
                cb2();
            }
        });
    }], function (err) {
        if (err) return cb(err);
        cb(null, vault);
    });
}
