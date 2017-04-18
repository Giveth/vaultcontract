/* eslint no-undef: "off" */

module.exports = function exports(error) {
    assert.isAbove(error.message.search("invalid JUMP"), -1, "Invalid JUMP error must be returned");
};
