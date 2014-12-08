module.exports = ID3

var ID3Tag = require('./lib/id3tag')
var Reader = require('./lib/reader')

function ID3 () {
  // TODO
}

/**
 * Read ID3 tags from an mp3.
 *
 * `file` can be one of:
 *   - W3C File object
 *   - http/https url to an mp3 file (string)
 *   - filesystem path to an mp3 file (string) (node-only)
 *
 * @param {string|Object} file
 * @param {function=} cb called when the tags have been read
 */
ID3.prototype.read = function (file, cb) {
  var reader = new Reader()

  reader.open(file, function (err) {
    if (err) return cb('Could not open specified file')

    ID3Tag.parse(reader, function (err, tags) {
      reader.close()
      cb(err, tags)
    })
  })
}

ID3.prototype.write = function (opts, cb) {
  // TODO
  cb('Error ID3.write not yet implemented')
}

