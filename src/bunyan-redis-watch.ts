/// <reference path="../typings/tsd.d.ts"/>

var promise = require("bluebird");
var redis = promise.promisifyAll(require("redis"));
var pkginfo = require('pkginfo')(module);
var S = require('string');

var argv = require("yargs")
            .usage('View a bunyan logstream in redis\nUsage: --key=<key> --port=<port> --host=<host> --password=<password> --filter=<filter> --dump')
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
bunyan.stdout.on('error', function() {});

process.stdout.on('error', function(err)
        {
            if (err.code == "EPIPE")
            {
                process.exit(0);
            }
        });

enum bunyan_level
{
    IGNORE = 100, //special level for ignoring.
    FATAL = 60,
    ERROR = 50,
    WARN = 40,
    INFO = 30,
    DEBUG = 20,
    TRACE = 10
};

interface bunyan_entry
{
    name : string;
    hostname: string;
    pid: number;
    level: string;
};

var filter_name = [];
var filter_pid = [];
var filter = argv.filter === undefined? [] : S(argv.filter).parseCSV();
filter.forEach(function (item : string)
        {
            var level : bunyan_level;
            var to_filter;
            if (item.indexOf(':') === -1)
            {
                to_filter = item;
                level = bunyan_level.IGNORE;
            }
            else
            {
                var split = item.split(':');
                level = bunyan_level[split[1]];
                to_filter = split[0];
            }
            if (/^(0|[1-9]\d*)$/.test(to_filter))
            {
                //a number, so a PID
                filter_pid.push(
                    {
                        pid: parseInt(to_filter),
                        level: level
                    });
            }
            else
            {
                filter_name.push(
                        {
                            name: to_filter,
                            level: level
                        });
            }
        });

function check_filter(log_entry: bunyan_entry) : boolean
{
    var ret = true;
    filter_name.forEach(function (nentry)
            {
                if (nentry.name === log_entry.name && nentry.level > parseInt(<string>log_entry.level) )
                {
                    ret = false;
                }
            })

    filter_pid.forEach(function (nentry)
            {
                if (nentry.pid === log_entry.pid && nentry.level > parseInt(<string>log_entry.level) )
                {
                    ret = false;
                }
            })

    return ret;
}

function parse_and_display(log_entry : string, unescape : boolean) : void
{
    var unescaped = unescape ? S(log_entry).replaceAll('\\t', '\t')
                                      .replaceAll('\\v', '\v')
                                      .replaceAll('\\0', '\0')
                                      .replaceAll('\\b', '\b')
                                      .replaceAll('\\f', '\f')
                                      .replaceAll('\\ ', '')
                                      .replaceAll('\\}', '}')
                                      .replaceAll('\\\\', '\\')
                                : S(log_entry).replaceAll('\n', '');
    var json = JSON.parse(unescaped);
    if (check_filter(<bunyan_entry> json))
    {
        bunyan.stdin.write(unescaped + "\n");
    }
}

if (argv.dump)
{
    client.lrangeAsync(key, 0, -1)
        .then(function (data)
                {
                    if (data !== null)
                    {
                        data.reverse(); //not going to be super efficient, unfortunately..
                        data.forEach(function (entry)
                            {
                                parse_and_display(entry, false);
                            })
                    }
                    else
                    {
                        console.log("No entries in log!");
                    }
                })
        .catch(function(error)
                {
                    console.log("Error getting log entries: " + error);
                })
        .finally(function()
        {
            bunyan.stdin.end("\x04");
        })
}

else
{
    client.monitor( function (err, redis)
            {

            });

    client.on("monitor", function (time, args) {
        if (args.length > 2 && args[0] === "lpush" && args[1] === key)
        {
            parse_and_display(args[2], true);
        }
    });
}
