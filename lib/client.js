var pcap = require('pcap');
var _packet = require('./packet');

module.exports = function(options) {
  var commands = {};

  options = options || {};
  options.interface = options.interface || 'lo0';
  options.port = options.port || '27017';

  this.on = function(command, callback) {
    // No filtering, just push to the commands variable
    if (!commands[command]) {
      commands[command] = [];
    }

    commands[command].push(callback);
  };

  this.run = function(runOpts) {
    var session;
    var queryStartTime;

    runOpts = runOpts || {};
    runOpts.interface = runOpts.interface || options.interface;
    runOpts.port = runOpts.port || options.port;

    // Start listening on interface and port
    session = pcap.createSession(runOpts.interface, 'tcp port ' + options.port);
    session.on('packet', function(raw) {

      function processPcapData(data) {
        var packet = new _packet(data);
        var queryReplyTime;

        if(commands.raw) {
          commands.raw.forEach(function(callback) {
            callback(data);
          });
        }

        if(commands.packet) {
          commands.packet.forEach(function(callback) {
            callback(packet);
          });
        }

        switch(packet.type) {
          case 'reply':
            queryReplyTime = Date.now() - queryStartTime;

            if (commands.reply) {
              commands.reply.forEach(function(callback) {
                callback(packet, queryReplyTime);
              });
            }
            break;
          case 'update':
            if (commands.update) {
              commands.update.forEach(function(callback) {
                callback(packet);
              });
            }
            break;
          case 'insert':
            if (commands.insert) {
              commands.insert.forEach(function(callback) {
                callback(packet);
              });
            }
            break;
          case 'query':
            queryStartTime = Date.now();

            if(commands.query) {
              commands.query.forEach(function(callback) {
                callback(packet);
              });
            }
            break;
          case 'getMore':
            if (commands.getMore) {
              commands.getMore.forEach(function(callback) {
                callback(packet);
              });
            }
            break;
          case 'delete':
            if (commands.delete) {
              commands.delete.forEach(function(callback) {
                callback(packet);
              });
            }
            break;
        }
      }

      var rawPacket = pcap.decode.packet(raw);

      if (rawPacket.link.ip.tcp.data) {
        processPcapData(rawPacket.link.ip.tcp.data);
      }
    });
  };
};
