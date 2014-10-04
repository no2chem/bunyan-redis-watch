/// <reference path="../typings/tsd.d.ts"/>

var redis = require("redis");
var pkginfo = require('pkginfo')(module);
var S = require('string');

var argv = require("yargs")
            .usage('View a bunyan logstream in redis\nUsage: --key=<key> --port=<port> --host=<host> --password=<password>')
            .default('port', 6379)
            .default('host', '127.0.0.1')
            .default('password', null)
            .demand(['key'])
            .version(module.exports.version, "version")
            .argv;

var child_process = require("child_process");

var client = redis.createClient(argv.port, argv.host, { auth_pass: argv.password} );

var key = argv.key;
var bunyan = child_process.spawn('bunyan', ["--color"]);
bunyan.stdout.setEncoding('utf8');
bunyan.stdout.pipe(process.stdout);

client.monitor( function (err, redis)
        {

        });

client.on("monitor", function (time, args) {
    if (args.length > 2 && args[0] === "lpush" && args[1] === key)
    {
        var unescaped = S(args[2]).replaceAll('\\t', '\t')
                                  .replaceAll('\\v', '\v')
                                  .replaceAll('\\0', '\0')
                                  .replaceAll('\\b', '\b')
                                  .replaceAll('\\f', '\f')
                                  .replaceAll('\\ ', '')
                                  .replaceAll('\\}', '}')
                                  .replaceAll('\\\\', '\\')
                                  .replaceAll("\\'", '\'')
                                  .replaceAll('\\"', '\"').s
        bunyan.stdin.write(unescaped + "\n");
    }
});
