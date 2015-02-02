var bson = require('bson').BSONPure.BSON;

/*
  native_ext
*

/*
  Function for reading a single little endian integer
*/
Buffer.prototype.read = function() {
  var _data = this.readInt32LE(this.pos);

  this.pos += 4;
  return _data;
};

// Buffer read position
Buffer.prototype.pos = 0;

/*
  Function for reading little endian double
*/
Buffer.prototype.read64 = function() {
  var _data = this.readDoubleLE(this.pos);

  this.pos += 8;
  return _data;
};

/*
  Function for reading variable length string terminated by null character (0)
*/
Buffer.prototype.varRead = function() {
  var _char;
  var result;

  while (true) {
    _char = this.readUInt8(this.pos);

    if (_char === 0) {
      this.pos++; // Increment for 0 at end of string
      break;
    }

    result += String.fromCharCode(_char);
    this.pos++;
  }
};

/*
  Function for reading BSON document
*/
Buffer.prototype.readBSON = function() {
  var size;
  var document;

  if(!this[this.pos]) {
    return null;
  }

  size = this.read();
  document = bson.deserialize(this.slice(this.pos-4, this.pos+size*8));
  this.pos += size * 8 - 4;
  return document;
};

/*
  Function for reading BSON documents until the end of the buffer
  Useful is the end of the packet contains only BSON documents 
*/
Buffer.prototype.readBSONUntilEnd = function() {
  var documents = [];
  var document;

  while ((document = this.readBSON())) {
    documents.push(document);
  }

  return documents;
};
