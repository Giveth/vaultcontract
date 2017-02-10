import async from "async";
import _ from "lodash";
import { deploy } from "runethtx";
import { VaultAbi, VaultByteCode } from "../contracts/Vault.sol.js";

export default class Vault {

    constructor(web3, address) {
        this.web3 = web3;
        this.contract = this.web3.eth.contract(VaultAbi).at(address);
    }

    getState(cb) {
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
                    st.balance = this.web3.fromWei(_balance).toNumber();
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
                            description: res[ 0 ],
                            spender: res[ 1 ],
                            earliestPayTime: res[ 2 ].toNumber(),
                            canceled: res[ 3 ],
                            paid: res[ 4 ],
                            recipient: res[ 5 ],
                            amount: this.web3.fromWei(res[ 6 ]).toNumber(),
                        });
                        cb2();
                    });
                }, cb1);
            },
        ], (err) => {
            if (err) { cb(err); return; }
            cb(null, st);
        });
    }

    static deploy(web3, opts, cb) {
        const params = Object.assign({}, opts);
        const promise = new Promise((resolve, reject) => {
            params.abi = VaultAbi;
            params.byteCode = VaultByteCode;
            return deploy(web3, params, (err, _vault) => {
                if (err) {
                    reject(err);
                    return;
                }
                const vault = new Vault(web3, _vault.address);
                resolve(vault);
            });
        });

        if (cb) {
            promise.then(
                (value) => {
                    cb(null, value);
                },
                (reason) => {
                    cb(reason);
                });
        } else {
            return promise;
        }
    }
}
