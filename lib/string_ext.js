/*
  native_ext
*/

String.prototype.toCstring = function() {
  var bufferArr = [];
  var buf;

  for(var i = 0; i < this.length; i++) {
    buf = new Buffer(1);
    buf.writeUInt8(this.charCodeAt(i));
    bufferArr.push(buf);
  }

  buf = new Buffer(1);
  buf.writeUInt8(0);
  bufferArr.push(buf);

  return Buffer.concat(bufferArr);
};
