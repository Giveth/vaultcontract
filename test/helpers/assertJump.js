/* global assert */

module.exports = function checkInvalidJump(error) {
  assert.isAbove(
    error.message.search("invalid JUMP"),
    -1,
    "Invalid JUMP error must be returned"
  )
}
