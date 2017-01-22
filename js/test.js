import ethConnector from "ethconnector";
import { deploy } from "../js/vault";

let escapeCaller;
let escapeDestination;
let securityGuard;

ethConnector.init("testrpc", (err) => {
    if (err) {
        console.log(err);
        return;
    }
    escapeCaller = ethConnector.accounts[ 1 ];
    escapeDestination = ethConnector.accounts[ 2 ];
    securityGuard = ethConnector.accounts[ 3 ];
    deploy(ethConnector.web3, {
        escapeCaller,
        escapeDestination,
        absoluteMinTimeLock: 86400,
        timeLock: 86400 * 2,
        securityGuard,
        maxSecurityGuardDelay: 86400 * 21,
    }, (err2, _vault) => {
        if (err2) {
            console.log(err);
            return;
        }
        console.log(_vault.contract.address);
    });
});
