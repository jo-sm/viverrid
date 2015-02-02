var viverrid = require('viverrid');
var client = new viverrid.client();

client.on('query', function(packet) {
  console.log('Query');
});

client.on('reply', function(packet, time) {
  console.log('Query took %s ms', time);
});

client.run();
