# bunyan-redis-watch

This is a simple commandline tool which allows you to watch
bunyan streams saved to redis (via [bunyan-redis](https://github.com/harrisiirak/bunyan-redis)).

You must have bunyan installed globally, since the tool 
uses bunyan to parse the JSON log.

Install globally via npm:

    npm install -g bunyan
    npm install -g bunyan-redis-watch

Now you can run the commandline tool.

    bunyan-redis --key=<key>
    bunayn-redis --key=<key> --port=<port> --host=<host>
    bunyan-redis --key=<key> --port=<port> --host=<host> --password=<password>

# Internals

The tool uses the redis [MONITOR](http://redis.io/commands/MONITOR) command to observe all
redis traffic, and filters for [LPUSH](http://redis.io/commands/LPUSH) commands on the
given key. Using the MONITOR command impacts performance significantly, according to the
redis docs, each MONITOR client can reduce throughput by more than 50%.

Therefore, it is recommended that you only use this tool for debugging, since it
will have a significant impact on the performance of your REDIS infrastructure.

In addition, in order to not replicate the infrastructure in bunyan for printings messages,
it uses the bunyan CLI tool to print messages.
