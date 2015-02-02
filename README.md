# Viverid

Viverrid is a Javascript based MongoDB protocol parser and datagram creator.

## About

Viverrid is the product of an interest in MongoDB query performance and analysis that sprang up during some questions about database performance at work. Originally I planned to write a wrapper for specific Mongoose Node.JS functions, but this proved difficult as Mongoose handles updates, inserts, deletes, etc. differently and without extending the actual driver that handles connections, it wouldn't have been possible without a lot of boilerplate code. Additionally, it could have been problematic for application performance.

After some thought, I decided to go deeper and write a protocol parser that parses the raw MongoDB packet data that lives on its own, i.e. as an external daemon, instead of the aforementioned approach. This is the result.

One fun fact about this library is that I originally was going to call it ostrich, thinking that 1) this would be a wrapper for Mongoose, and 2) that mongooses were related to ostriches. However, that library name was taken up, and then after some research I realized that mongooses and ostriches aren't related at all, and ended up taking the family of animals that mongooses are classified under. I believe it's pronounded "viv-er-id". 

## How to Use

There are two ways to use this library: by using the `client` and using the `packet` parser. 

### Using the client

Using the client is the simplest way to get data about the packets and the performance of certain requests, such as queries and responses, as it's already baked in. The following kinds of callback types are supported with the client: 

- `raw`
- `packet`
- `query`
- `insert`
- `update`
- `delete`
- `getMore`
- `reply`

All of the callbacks will be given one piece of data, the `packet` object, except for `raw` and `reply`. `raw` will return the raw `Buffer` object from pcap, and `reply` will return the packet as the first argument and the time it took since the last query for the second. 

For an example of a daemon that uses the client, see the `/examples` directory.

### Using the packet parser

If you'd like to roll your own framework around getting the data, such as using a library other than pcap to capture packets, you can just use the `packet` module within this library. There are other ways to consume this module, but the simplest and most useful way is to create a new instance with the raw binary packet, commonly using a `Buffer` object, when instantiating it. E.g. `var parsedPacket = new viverrid.packet(rawBinaryPacket);` Please refer to the documentation (coming soon!) for more information about the various ways to use the packet parser. 

## Todo

1. Write documentation more than just the daemon in `/examples`
2. Write tests with MongoDB packets
