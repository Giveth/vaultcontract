/*jslint node: true */
"use strict";

var async = require('async');
var ethConnector = require('ethconnector');
var path = require('path');
var _ = require('lodash');


var vaultAbi;
var vault;

var src;

exports.deploy = function(opts, cb) {
    var compilationResult = {};
    return async.series([
        function(cb) {
            ethConnector.loadSol(path.join(__dirname, "../Vault.sol"), function(err, _src) {
                if (err) return cb(err);
                src = _src;
                cb();
            });
        },
        function(cb) {
            ethConnector.applyConstants(src, opts, function(err, _src) {
                if (err) return cb(err);
                src = _src;
                cb();
            });
        },
        function(cb) {
            compilationResult.srcVault = src;
            ethConnector.compile(src, function(err, result) {
                if (err) return cb(err);
                compilationResult = _.extend(result, compilationResult);
                cb();
            });
        },
        function(cb) {
            vaultAbi = JSON.parse(compilationResult.Vault.interface);
            ethConnector.deploy(compilationResult.Vault.interface,
                compilationResult.Vault.bytecode,
                0,
                0,
                opts.escapeCaller,
                opts.escapeDestination,
                opts.absoluteMinTimeLock,
                opts.timeLock,
                opts.guardian,
                opts.maxGuardianDelay,
                function(err, _vault) {
                    if (err) return cb(err);
                    vault = _vault;
                    cb();
                });
        },
    ], function(err) {
        if (err) return cb(err);
        cb(null,vault, compilationResult);
    });
};
