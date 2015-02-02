var bson = require('bson').BSONPure.BSON;
require('./buffer_ext');
require('./string_ext');

function error(message) {
  throw new Error(message);
}

/*
  Packet of MongoDB data
*/

module.exports = function() {
  var self = this;

  this.header = {};
  this.body = {};

  /*
    packet.header.raw
  */
  Object.defineProperty(this.header, 'raw', {
    get: function() {
      var header = new Buffer(16);

      if (!this._header) {
        error('No header set');
      }

      if (this._header.raw) {
        return this._header.raw;
      }

      if (!this._header.parsed) {
        error('Parsed header is required to generate raw header');
      }

      header.writeInt32LE(this._header.parsed.size, 0); 
      header.writeInt32LE(this._header.parsed.requestId, 4);
      header.writeInt32LE(this._header.parsed.responseTo, 8);
      header.writeInt32LE(this._header.parsed.opcode, 12);
      
      this._header.raw = header;
      return header;
    },

    set: function(obj) {
      this._header = {
        raw: obj
      };      
    }
  });

  /*
    packet.header.parsed
  */
  Object.defineProperty(this.header, 'parsed', {
    get: function() {
      var header = {};

      if (!this._header) {
        error('No header set available for parsed header generation. Please set parsed or raw header.');
      }
      
      if (this._header.parsed) {
        return this._header.parsed;
      }

      if (!this._header.raw) {
        error('Raw header is required to generated parsed header. Please set raw header.');
      }
      
      // Read sequentially, see buffer_ext
      header.size = this._header.raw.read();
      header.requestId = this._header.raw.read();
      header.responseTo = this._header.raw.read();
      header.opcode = this._header.raw.read();
     
      this._header.parsed = header; 
      return header;
    },

    set: function(parsed) {
      function checkInteger(i, prop) {
        if (typeof i !== 'number') {
          error('Parsed header ' + prop + ' must be integer. Non number given');
        }

        if (i % 1 !== 0) {
          error('Parsed header ' + prop + ' must be integer. Float given.');
        }
      }

      if(Object.prototype.toString(parsed) !== '[object Object]') {
        error('Invalid parsed header type. Parsed header must be object.');
      } else {
        console.log(parsed);
        // Check that parsed header object contains correct variables
        if (!parsed.size) {
          error('Parsed header object did not contain size parameter.');
        } else {
          checkInteger(parsed.size, 'size');
        }
        
        if (!parsed.requestId) {
          // Ok
          parsed.requestId = 1;
        } else {
          checkInteger(parsed.requestId, 'requestId');
        }
        
        if (!parsed.responseTo) {
          parsed.responseTo = 0;
        } else {
          checkInteger(parsed.responseTo, 'responseTo');
        }
        
        if (!parsed.opcode) {
          error('Parsed header object did not contain opcode parameter.');
        } else {
          checkInteger(parsed.opcode, 'opcode');
        }
          
        if (!this._header) {
          this._header = {};
        }

        this._header.parsed = parsed;
      }
    }
  });

  /*
    packet.body.raw
  */
  Object.defineProperty(this.body, 'raw', {
    get: function() {
      var bufferArr = [];
      var buf;

      if (!this._body) {
        error('Body not set');
      }

      if (this._body.raw) {
        return this._body.raw;
      }

      if (!this._body.parsed) {
        error('No parsed body set');
      }
      if (['update', 'insert', 'query', 'getMore', 'delete', 'message'].indexOf(self.type) !== -1) {
        if (!String.prototype.toCstring) {
          error('String extension toCstring required to parse update packet.');
        }
      }
      
      switch(self.type) {
        case 'reply':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.responseFlags));

          buf = new Buffer(8);
          bufferArr.push(buf.writeDoubleLE(this._body.parsed.cursorId));

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.startingFrom));

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.numberReturned));

          this._body.parsed.documents.forEach(function(doc) {
            bufferArr.push(bson.serialize(doc));
          });
          break;
        case 'message':
          error('Unsupported packet type message');
          break;
        case 'update':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(0));
          bufferArr.push(this._body.collection.toCstring);

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.flags));

          bufferArr.push(bson.serialize(this._body.selector));
          bufferArr.push(bson.serialize(this._body.update));
          break;
        case 'insert':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.flags));
          bufferArr.push(this._body.collection.toCstring);

          this._body.parsed.documents.forEach(function(doc) {
            bufferArr.push(bson.serialize(doc));
          });
          break;
        case 'query':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.flags));
          bufferArr.push(this._body.parsed.collection.toCstring);

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.numberToSkip));

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.numberToReturn));
          bufferArr.push(bson.serialize(this._body.parsed.query));

          // TODO: returnFieldsSelector
          break;
        case 'getMore':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(0));
          bufferArr.push(this._body.collection.toCstring);

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.parsed.numberToReturn));

          buf = new Buffer(8);
          bufferArr.push(buf.writeDoubleLE(this._body.parsed.cursorId));
          break;
        case 'delete':
          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(0));
          bufferArr.push(this._body.collection.toCstring);

          buf = new Buffer(4);
          bufferArr.push(buf.writeInt32LE(this._body.flags));

          bufferArr.push(bson.serialize(this._body.parsed.selector));
          break;
        case 'killCursors':
          error('Unsupported packet type killCursors');
          break;
      }

      this._body.raw = Buffer.concat(bufferArr);
    },
    

    set: function(raw) {
      // TODO: check more
      if (!this._body) {
        this._body = {};
      }

      this._body.raw = raw;
    },
  });

  Object.defineProperty(this.body, 'parsed', {
    get: function() {
      if (!this._body) {
        error('Body not set');
      }

      if (this._body.parsed) {
        return this._body.parsed;
      }

      if (!this._body.raw) {
        error('No raw body set');
      }

      switch (self.type) {
        case 'reply':
          this._body.parsed = {
            responseFlags: this._body.raw.read(),
            cursorId: this._body.raw.read64(),
            startingFrom: this._body.raw.read(),
            numberReturned: this._body.raw.read(),
            documents: this._body.raw.readBSONUntilEnd()
          };
          break;
        case 'message':
          error('Unsupported packet message');
          break;
        case 'update':
          this._body.raw.read(); // ZERO

          this._body.parsed = {
            collection: this._body.raw.varRead(),
            flags: this._body.raw.read(),
            selector: this._body.raw.readBSON(),
            update: this._body.raw.readBSON()
          };
          break;
        case 'insert':
          this._body.parsed = {
            flags: this._body.raw.read(),
            collection: this._body.raw.varRead(),
            documents: this._body.raw.readBSONUntilEnd()
          };
          break;
        case 'query':
          this._body.parsed = {
            flags: this._body.raw.read(),
            collection: this._body.raw.varRead(),
            numberToSkip: this._body.raw.read(),
            numberToReturn: this._body.raw.read(),
            query: this._body.raw.readBSON()
          };
          break;
        case 'getMore':
          this._body.raw.read();

          this._body.parsed = {
            collection: this._body.raw.varRead(),
            numberToReturn: this._body.raw.read(),
            cursorId: this._body.raw.read64()
          };
          break;
        case 'delete':
          this._body.raw.read();

          this._body.parsed = {
            collection: this._body.raw.varRead(),
            flags: this._body.raw.read(),
            selector: this._body.raw.readBSON()
          };
          break;
        case 'killCursors':
          error('Unsupported packet type killCursors');
          break;
      }

      return this._body.parsed;
    },

    set: function() {
      
    },
  });

  Object.defineProperty(this, 'parsed', {
    get: function() {
      if (!(this.header || this.body)) {
        error('Error: missing parsed header or body');
      }

      return {
        type: this.type,
        header: this.header.parsed,
        body: this.body.parsed
      };
    }
  });

  if (arguments.length) {
    if (Buffer.isBuffer(arguments[0])) {
      // Raw packet
      this.header.raw = arguments[0].slice(0, 16);
      this.body.raw = arguments[0].slice(16);
    } else if (arguments.length === 1 && Object.prototype.toString(arguments[0]) === '[object Object]') {
      this.header.parsed = arguments[0].header;
      this.body.parsed = arguments[0].body;
    } else if (arguments.length === 2) {
      this.header.parsed = arguments[0];
      this.body.parsed = arguments[1];
    }
  }

  return this;
};

Object.defineProperty(module.exports.prototype, 'type', {
    /*
      Gets header of type (either raw or parsed) and returns it
      Note that header.size will be inaccurate if it wasn't previously set
      within a packet
    */
  get: function() {
    function parseOpcode(opcode) {
      switch (opcode) {
        case 1:
          return 'reply';
        case 1000:
          return 'message';
        case 2001:
          return 'update';
        case 2002:
          return 'insert';
        case 2004:
          return 'query';
        case 2005:
          return 'getMore';
        case 2006:
          return 'delete';
        case 2007:
          return 'killCursors';
        default:
          error('Unsupported opcode');
      }
    }

    var opcode;

    if (this._type) {
      // Return this._type, see below
    } else {
      if (this.header.parsed && this.header.parsed.opcode) {
        opcode = this.header.parsed.opcode;
        this._type = parseOpcode(opcode);
      } else if (this.header.raw) {
        opcode = this.header.raw.readInt32LE(12);
        this._type = parseOpcode(opcode);
      } else {
        error('Ruh roh Shaggy');
      }
    }

    return this._type;
  },
  
  set: function(type) {
    // TODO: buffer type
    switch (type) {
      case 'reply':
      case 'message':
      case 'update':
      case 'insert':
      case 'query':
      case 'getMore':
      case 'delete':
        this._type = type;
        break;
      default:
        error('Invalid or unsupported type');
    }
    
    return type;
  }
});
