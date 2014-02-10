rts
===

[![Build Status](https://travis-ci.org/guileen/node-rts.png?branch=master)](https://travis-ci.org/guileen/node-rts)

Redis time series data store

## Init

var rts = require('rts')(options);

    var rts = require('rts')({
            redis: redis,
            gran: '5m, 1h, 1d, 1w',
            points: 500,
            prefix: ''
        });

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

ts.aggravg(name, aggr, date, callback)
