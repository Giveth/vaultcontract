import async from "async";
import _ from "lodash";
import { deploy, sendContractTx, asyncfunc } from "runethtx";
import { VaultAbi, VaultByteCode } from "../contracts/Vault.sol.js";

export default class Vault {

    constructor(web3, address) {
        this.web3 = web3;
        this.contract = this.web3.eth.contract(VaultAbi).at(address);
    }

    getState(_cb) {
        return asyncfunc((cb) => {
            const st = {};
            let nPayments;
            async.series([
                (cb1) => {
                    this.contract.owner((err, _owner) => {
                        if (err) { cb(err); return; }
                        st.owner = _owner;
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.escapeHatchCaller((err, _escapeHatchCaller) => {
                        if (err) { cb(err); return; }
                        st.escapeHatchCaller = _escapeHatchCaller;
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.escapeHatchDestination((err, _escapeHatchDestination) => {
                        if (err) { cb(err); return; }
                        st.escapeHatchDestination = _escapeHatchDestination;
                        cb1();
                    });
                },
                (cb1) => {
                    this.web3.eth.getBalance(this.contract.address, (err, _balance) => {
                        if (err) { cb(err); return; }
                        st.balance = _balance;
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.numberOfAuthorizedPayments((err, res) => {
                        if (err) { cb(err); return; }
                        nPayments = res.toNumber();
                        st.payments = [];
                        cb1();
                    });
                },
                (cb1) => {
                    async.eachSeries(_.range(0, nPayments), (idPayment, cb2) => {
                        this.contract.authorizedPayments(idPayment, (err, res) => {
                            if (err) { cb(err); return; }
                            st.payments.push({
                                idPayment,
                                name: res[ 0 ],
                                reference: res[ 1 ],
                                spender: res[ 2 ],
                                earliestPayTime: res[ 3 ].toNumber(),
                                canceled: res[ 4 ],
                                paid: res[ 5 ],
                                recipient: res[ 6 ],
                                amount: res[ 7 ],
                            });
                            cb2();
                        });
                    }, cb1);
                },
            ], (err) => {
                if (err) { cb(err); return; }
                cb(null, st);
            });
        }, _cb);
    }

    collectAuthorizedPayment(opts, cb) {
        return sendContractTx(
            this.web3,
            this.contract,
            "collectAuthorizedPayment",
            opts,
            cb);
    }

    static deploy(web3, opts, _cb) {
        return asyncfunc((cb) => {
            const params = Object.assign({}, opts);
            params.abi = VaultAbi;
            params.byteCode = VaultByteCode;
            return deploy(web3, params, (err, _vault) => {
                if (err) {
                    cb(err);
                    return;
                }
                const vault = new Vault(web3, _vault.address);
                cb(null, vault);
            });
        }, _cb);
    }
}
