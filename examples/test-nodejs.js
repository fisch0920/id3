var ID3 = require('id3js')

var id3 = new ID3()
id3.read('./track.mp3', function (err, tags) {
  console.log(tags)
})

