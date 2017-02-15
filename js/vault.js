import async from "async";
import _ from "lodash";
import { deploy, sendContractTx, asyncfunc  } from "runethtx";
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
                    this.contract.escapeCaller((err, _escapeCaller) => {
                        if (err) { cb(err); return; }
                        st.escapeCaller = _escapeCaller;
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.escapeDestination((err, _escapeDestination) => {
                        if (err) { cb(err); return; }
                        st.escapeDestination = _escapeDestination;
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
                                description: res[ 0 ],
                                spender: res[ 1 ],
                                earliestPayTime: res[ 2 ].toNumber(),
                                canceled: res[ 3 ],
                                paid: res[ 4 ],
                                recipient: res[ 5 ],
                                amount: res[ 6 ],
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
