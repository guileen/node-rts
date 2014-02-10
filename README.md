rts
===

Redis time series data store

Start rtsd service first

    rtsd -p 6379 -h 127.0.0.1 -g '1s, 5m, 1h, 1d, 1M' --points 10000 --aggrgran='1y'

## Init

var rts = require('rts')(options);

    var rts = require('rts')({
            redis: redis,
            gran: '5m, 1h, 1d, 1w',
            points: 500,
            prefix: ''
        });

Or, you can specify a namespace by prefix.

    var foorts = require('rts')(redis, 'foo_');

## Record

record(key, \[num\], \[statistics\], \[aggregations\])

statistics:
avg
max
min

aggragations
hm aggragation by hour of day for each month
hq    for each season
hy    for each year
dm aggragation by day of week.
dq    for each season
dy    for each year

    ts.record('click')
    ts.record('consume', 5, null, ['hm', 'dq'])
    ts.record('delay', 100, ['avg','max','min'])

the data will send to rtsd by redis pub/sub.

## Query

ts.get('click', '5m', fromDate, \[toDate\], callback)
ts.count('delay', '5m', fromDate, \[toDate\], callback)
ts.avg('delay', '5m', fromDate, \[toDate\], callback)
ts.max('delay', '5m', fromDate, \[toDate\], callback)
ts.min('delay', '5m', fromDate, \[toDate\], callback)

ts.hours('consume', 'yyyy')
ts.days('consume', 'yyyy')
