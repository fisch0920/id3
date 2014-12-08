module.exports = Reader

var fs = require('fs') // browser exclude

/**
 * A unified reader interface for AJAX, local and File API access
 */
function Reader () {
}

Reader.TYPE_FILE  = 0
Reader.TYPE_URI   = 1
Reader.TYPE_LOCAL = 2

Reader.prototype.open = function (file, cb) {
  var self = this
  self.file = file

  var isNode = (typeof fs.readFile === 'function')

  if (isBlob(file)) {
    self.type = Reader.TYPE_FILE
  } else if (/^https?:/.test(file) || !isNode) {
    self.type = Reader.TYPE_URI
  } else {
    self.type = Reader.TYPE_LOCAL
  }

  switch (self.type) {
    case Reader.TYPE_LOCAL:
      fs.stat(self.file, function (err, stat) {
        if (err) return cb(err)
        self.size = stat.size
        fs.open(self.file, 'r', function (err, fd) {
          if (err) return cb(err)
          self.fd = fd
          cb()
        })
      })
      break
    case Reader.TYPE_FILE:
      self.size = self.file.size
      cb()
      break
    default:
      self.ajax({
        uri: self.file,
        type: 'HEAD',
      }, function (err, resp, xhr) {
        if (err) return cb(err)
          self.size = parseInt(xhr.getResponseHeader('Content-Length'))
        cb()
      })
      break
  }
}

Reader.prototype.close = function () {
  if (this.type === Reader.TYPE_LOCAL) {
    fs.close(this.fd)
  }
}

Reader.prototype.read = function (length, position, cb) {
  if (this.type === Reader.TYPE_LOCAL) {
    this.readLocal(length, position, cb)
  } else if (this.type === Reader.TYPE_FILE) {
    this.readFile(length, position, cb)
  } else {
    this.readUri(length, position, cb)
  }
}

/*
 * Local reader
 */
Reader.prototype.readLocal = function (length, position, cb) {
  var buffer = new Buffer(length)
  fs.read(this.fd, buffer, 0, length, position, function (err, bytesRead, buffer) {
    if (err) return cb(err)

    var ab = new ArrayBuffer(buffer.length),
      view = new Uint8Array(ab)

    for(var i = 0; i < buffer.length; i++) {
      view[i] = buffer[i]
    }
    cb(null, ab)
  })
}

/*
 * URL reader
 */
Reader.prototype.ajax = function (opts, cb) {
  var options = {
    type: 'GET',
    uri: null,
    responseType: 'text'
  }
  if (typeof opts === 'string') {
    opts = {uri: opts}
  }
  for(var k in opts) {
    options[k] = opts[k]
  }
  var xhr = new XMLHttpRequest()
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return
    if (xhr.status !== 200 && xhr.status !== 206) {
      return cb('Received non-200/206 response (' + xhr.status + ')')
    }
    cb(null, xhr.response, xhr)
  }
  xhr.responseType = options.responseType
  xhr.open(options.type, options.uri, true)
  if (options.range) {
    options.range = [].concat(options.range)
    if (options.range.length === 2) {
      xhr.setRequestHeader('Range', 'bytes=' + options.range[0] + '-' + options.range[1])
    } else {
      xhr.setRequestHeader('Range', 'bytes=' + options.range[0])
    }
  }
  xhr.send()
}

Reader.prototype.readUri = function (length, position, cb) {
  this.ajax({
    uri: this.file,
    type: 'GET',
    responseType: 'arraybuffer',
    range: [position, position+length-1]
  }, cb)
}

/*
 * File API reader
 */
Reader.prototype.readFile = function (length, position, cb) {
  var slice = this.file.slice(position, position+length),
    fr = new FileReader()
  fr.onload = function (e) {
    cb(null, e.target.result)
  }
  fr.onerror = function () {
    cb('File read failed')
  }
  fr.readAsArrayBuffer(slice)
}

/**
 * Check if `obj` is a W3C Blob object (which is the superclass of W3C File)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}
