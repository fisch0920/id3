
var ID3  = require('../')
var test = require('tape')

test('basic invocation', function (t) {
  t.plan(1)

  var id3 = new ID3()
  id3.read({
    type: ID3.OPEN_FILE,
    file: './data/id3v1_001_basic.mp3'
  }, function (err, data) {
    t.error(err)
    console.log(data)
  })
})
