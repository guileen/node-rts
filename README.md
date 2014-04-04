rts
===

[![Build Status](https://travis-ci.org/guileen/node-rts.png?branch=master)](https://travis-ci.org/guileen/node-rts)

Use redis as time series data store.

Data for the line chart of a period time, can be use to stat sum/avg/max/min/count of a behavior.

e.g. Every 5 minutes, sum of user click of the website.
e.g. Every Day, average consume money of the website.

Aggregate data of DayOfWeek or HoursOfDay, to analytisic behavior.

e.g. The sum of click from Monday to SunDay.


## Init

    var rts = require('rts')(options);

    var rts = require('rts')({
            redis: redis,
            gran: '5m, 1h, 1d, 1w',
            points: 500,
            prefix: ''
    });
    
Options:

`redis` the redis client
`gran`  granularity of recored time. Format is '{number}{unit}, {number}{unit}...'.
    The unit can be `s` second, `m` minute, `h` hour, `d` day, `w` week, `M` month, `y` year.
    e.g. `5m, 1h`, store data for 5 mintues and 1 hour.
`points` how many data will be keep. Think about `1s` data, if store 1 day data, it is 86400 rows data,
    we should reduce it to `5m` data, it is only 288 rows. We just care small granularity data for recently, 
    for the history, we just care large granualrity, like revenue of `2010-11`, not revenue of `2010-11-05 12 o'clock`.
    We care about recently `n` points of data.
`prefix` the redis key prefix.


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

```js
ts.get('click', '5m', fromDate, \[toDate\], callback)
ts.count('delay', '5m', fromDate, \[toDate\], callback)
ts.avg('delay', '5m', fromDate, \[toDate\], callback)
ts.max('delay', '5m', fromDate, \[toDate\], callback)
ts.min('delay', '5m', fromDate, \[toDate\], callback)

ts.aggravg(name, aggr, date, callback)
```
