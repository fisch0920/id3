
var DataViewUtils = require('./data-view-utils')
var ID3Frame = require('./id3frame')
var Genres = require('./genres')

var ID3Tag = {}

module.exports = ID3Tag

ID3Tag.parse = function (reader, cb) {
  var tags = {
    title: null,
    album: null,
    artist: null,
    year: null,
    v1: {
      title: null,
      artist: null,
      album: null,
      year: null,
      comment: null,
      track: null,
      version: 1.0
    },
    v2: {
      version: [null, null]
    }
  }

  var processed = {
    v1: false,
    v2: false
  }

  function process () {
    if (processed.v1 && processed.v2) {
      tags.title = tags.v2.title || tags.v1.title
      tags.album = tags.v2.album || tags.v1.album
      tags.artist = tags.v2.artist || tags.v1.artist
      tags.year = tags.v1.year
      cb(null, tags)
    }
  }

  /*
   * Read the last 128 bytes (ID3v1)
   */
  reader.read(128, reader.size - 128, function (err, buffer) {
    if (err) {
      return cb('Could not read file')
    }
    var dv = new DataView(buffer)
    if (buffer.byteLength !== 128 || DataViewUtils.getString(dv, 3, null, true) !== 'TAG') {
      processed.v1 = true
      return process()
    }
    tags.v1.title = DataViewUtils.getString(dv, 30, 3).replace(/(^\s+|\s+$)/, '') || null
    tags.v1.artist = DataViewUtils.getString(dv, 30, 33).replace(/(^\s+|\s+$)/, '') || null
    tags.v1.album = DataViewUtils.getString(dv, 30, 63).replace(/(^\s+|\s+$)/, '') || null
    tags.v1.year = DataViewUtils.getString(dv, 4, 93).replace(/(^\s+|\s+$)/, '') || null
    /*
     * If there is a zero byte at [125], the comment is 28 bytes and the remaining 2 are [0, trackno]
     */
    if (DataViewUtils.getUint8(dv, 125) === 0) {
      tags.v1.comment = DataViewUtils.getString(dv, 28, 97).replace(/(^\s+|\s+$)/, '')
      tags.v1.version = 1.1
      tags.v1.track = DataViewUtils.getUint8(dv, 126)
    } else {
      tags.v1.comment = DataViewUtils.getString(dv, 30, 97).replace(/(^\s+|\s+$)/, '')
    }
    /*
     * Lookup the genre index in the predefined genres array
     */
    tags.v1.genre = Genres[DataViewUtils.getUint8(dv, 127)] || null
    processed.v1 = true
    process()
  })

  /*
   * Read 14 bytes (10 for ID3v2 header, 4 for possible extended header size)
   * Assuming the ID3v2 tag is prepended
   */
  reader.read(14, 0, function (err, buffer) {
    if (err) return cb('Could not read file')

    var dv = new DataView(buffer),
      headerSize = 10,
      tagSize = 0,
      tagFlags

    /*
     * Be sure that the buffer is at least the size of an id3v2 header
     * Assume incompatibility if a major version of > 4 is used
     */
    if (buffer.byteLength !== 14 || DataViewUtils.getString(dv, 3, null, true) !== 'ID3' || DataViewUtils.getUint8(dv, 3) > 4) {
      processed.v2 = true
      return process()
    }
    tags.v2.version = [
      DataViewUtils.getUint8(dv, 3),
      DataViewUtils.getUint8(dv, 4)
    ]
    tagFlags = DataViewUtils.getUint8(dv, 5)

    /*
     * Do not support unsynchronisation
     */
    if ((tagFlags & 0x80) !== 0) {
      processed.v2 = true
      return process()
    }
    /*
     * Increment the header size to offset by if an extended header exists
     */
    if ((tagFlags & 0x40) !== 0) {
      headerSize += DataViewUtils.getUint32Synch(dv, 11)
    }
    /*
     * Calculate the tag size to be read
     */
    tagSize += DataViewUtils.getUint32Synch(dv, 6)
    reader.read(tagSize, headerSize, function (err, buffer) {
      if (err) {
        processed.v2 = true
        return process()
      }
      var dv = new DataView(buffer),
      position = 0
      while (position < buffer.byteLength) {
        var frame,
        slice,
        frameBit,
        isFrame = true
        for (var i = 0; i < 3; i++) {
          frameBit = DataViewUtils.getUint8(dv, position + i)
          if ((frameBit < 0x41 || frameBit > 0x5A) && (frameBit < 0x30 || frameBit > 0x39)) {
            isFrame = false
          }
        }
        if (!isFrame) break
        /*
         * < v2.3, frame ID is 3 chars, size is 3 bytes making a total size of 6 bytes
         * >= v2.3, frame ID is 4 chars, size is 4 bytes, flags are 2 bytes, total 10 bytes
         */
        if (tags.v2.version[0] < 3) {
          slice = buffer.slice(position, position + 6 + DataViewUtils.getUint24(dv, position + 3))
        } else {
          slice = buffer.slice(position, position + 10 + DataViewUtils.getUint32Synch(dv, position + 4))
        }
        frame = ID3Frame.parse(slice, tags.v2.version[0])
        if (frame) {
          tags.v2[frame.tag] = frame.value
        }
        position += slice.byteLength
      }
      processed.v2 = true
      process()
    })
  })
}
