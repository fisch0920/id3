module.exports = ID3

var ID3Tag = require('./lib/id3tag')
var Reader = require('./lib/reader')

function ID3 () {
  // TODO
}

ID3.OPEN_FILE  = Reader.OPEN_FILE;
ID3.OPEN_URI   = Reader.OPEN_URI;
ID3.OPEN_LOCAL = Reader.OPEN_LOCAL;

ID3.prototype.read = function (opts, cb) {
  var options = {
    type: ID3.OPEN_URI,
  };

  if (typeof opts === 'string') {
    opts = { file: opts, type: ID3.OPEN_URI };
  } else if (typeof window !== 'undefined' && window.File && opts instanceof window.File) {
    opts = { file: opts, type: ID3.OPEN_FILE };
  }

  for (var k in opts) {
    options[k] = opts[k];
  }

  if (!options.file) {
    return cb('No file was set');
  }

  if (options.type === ID3.OPEN_FILE) {
    if (typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
      return cb('Browser does not have support for the File API and/or ArrayBuffers');
    }
  } else if (options.type === ID3.OPEN_LOCAL) {
    if (typeof require !== 'function') {
      return cb('Local paths may not be read within a browser');
    }
  }

  // read the file
  var handle = new Reader(options.type);

  handle.open(options.file, function(err) {
    if (err) {
      return cb('Could not open specified file');
    }
    ID3Tag.parse(handle, function(err, tags) {
      cb(err, tags);
      handle.close()
    });
  });
}

ID3.prototype.write = function (opts, cb) {
  // TODO
  cb('Error ID3.write not yet implemented')
}

