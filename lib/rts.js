// vim: sw=4 et
// All Records example of 'foo_sth'
// _rts:foo_sth:5m:12345 sum 100
// _rts:foo_sth:5m:12345 count 100
// _rts:foo_sth:5m:12345 avg 100
// _rts:foo_sth:5m:12345 min 100
// _rts:foo_sth:5m:12345 max 100
// _rts:foo_sth:aggr.h:23 sum 100
// _rts:foo_sth:aggr.d:6 avg 100

var CHANNEL = '_rts_.record';
var util = require('./util');
var fs = require('fs');
var scripts = {};
['avg', 'max', 'min'].forEach(function(key) {
        scripts[key] = fs.readFileSync(__dirname + '/' + key + '.lua', 'utf-8');
})

var aggrvals = {
    h: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
  , d: [0,1,2,3,4,5,6]
}

function log(err, results) {
    if(err) console.log(err.stack || err);
}

var exports = module.exports = function rts(options) {
    var redis = options.redis
      , granularities = options.gran || '5m, 1h, 1d, 1w'
      , prefix = options.prefix || ''
      , points = options.points || 500
      ;

    prefix = '_rts_' + prefix;

    granularities = granularities.split(',').map(util.getUnitDesc);
    var granMap = {};
    granularities.forEach(function(granInfo) {
            granMap[granInfo[1]] = granInfo;
    });

    function getGranKey(name, gran, timestamp) {
        var granId = util.getGranId(gran, timestamp);
        return [prefix, name, gran[1], granId].join(':');
    }

    function getAggrGruopKey(name, aggr, timestamp) {
        var gid = util.getAggrGroupId(aggr, timestamp);
        return [prefix, name, 'aggr', gid].join(':');
    }

    function getAggrKey(name, aggr, timestamp) {
        var aggrId = util.getAggrId(aggr, timestamp);
        return getAggrGruopKey(name, aggr, timestamp) + '.' + aggrId;
    }

    /**
     * record behavior.
     * @param statistics {Array} sum, max, min, count, avg
     * @param aggregations {Array} dy (day in week each year), hm(hour of day each month).
     *
     */
    function record(name, num, statistics, aggregations, timestamp, callback) {
        timestamp = timestamp || Date.now();
        function recordStats(key) {
            statistics && statistics.forEach(function(stat) {
                    if(stat == 'sum') {
                        multi.hincrby(key, 'sum', num)
                    } else {
                        multi.eval(scripts[stat], 2, key, num, function(err, result) {
                                multi.discard();
                                if(err) throw err;
                                if(result && result.indexOf('ERR') == 0) {
                                    // console.log(scripts[stat]);
                                    throw new Error(result);
                                }
                        });
                    }
            });
        }
        if(!statistics) statistics = ['sum'];
        if(num == undefined) num = 1;

        var multi = redis.multi();

        granularities.forEach(function(gran) {
                var key = getGranKey(name, gran, timestamp);
                recordStats(key);
                var unitPeriod = gran[0];
                multi.expire(key, points * unitPeriod / 1000);
        });

        if(aggregations) for(var i = 0; i < aggregations.length; i++) {
            var aggr = aggregations[i];
            var key = getAggrKey(name, aggr, timestamp);
            recordStats(key);
        }

        multi.exec(callback || log);
    }

    /**
     * record unique access, like unique user of a period time.
     */
    function recordUnique(name, uniqueId, statistics, aggregations, timestamp, callback) {
        timestamp = timestamp || Date.now();
        granularities.forEach(function(gran) {
                var key = getGranKey(name, gran, timestamp);
                console.log('WARN: not implement record unique');
                recordStats(key);
                var unitPeriod = gran[0];
                multi.expire(key, points * unitPeriod / 1000);
        });
    }

    function stat(type, name, granCode, fromDate, toDate, callback) {
        if(!granCode) throw new Error('granCode is required');
        if(!callback && typeof toDate == 'function') {
            callback = toDate;
            toDate = Date.now();
        }
        var gran = granMap[granCode] || util.getUnitDesc(granCode);
        if(!gran) throw new Error('Granualrity is not defined ' + granCode);
        var fromTo = util.getFromTo(gran, points);
        fromDate = fromDate || fromTo[0];
        toDate = toDate || fromTo[1];
        if(fromDate instanceof Date) fromDate = fromDate.getTime();
        if(toDate instanceof Date) toDate = toDate.getTime();
        var unitPeriod = gran[0];
        var multi = redis.multi();
        var _points = [];
        for(var d = fromDate; d <= toDate; d += unitPeriod) {
            var key = getGranKey(name, gran, d);
            _points.push(util.getTimeKey(gran, d));
            multi.hget(key, type);
        }
        multi.exec(function(err, results) {
                if(err) return callback(err);
                var merged = [];
                for (var i = 0, l = _points.length, p; i < l; i ++) {
                    p = _points[i];
                    merged[i] = [p, Number(results[i])];
                }
                callback(null, {
                        step: unitPeriod
                      , unitType: gran[3]
                      , data: merged
                });
        });
    }

    function aggrstat(type, name, aggr, date, callback) {
        if(!callback && typeof date == 'function') {
            callback = date;
            date = Date.now();
        }
        var vals = aggrvals[aggr[0]];
        var multi = redis.multi();
        var gkey = getAggrGruopKey(name, aggr, date);
        for (var i = 0, l = vals.length; i < l; i ++) {
            var key = gkey + '.' + vals[i];
            multi.hget(key, type);
        }
        multi.exec(function(err, results) {
                if(err) return callback(err);
                callback(null, results.map(function(result, i) {
                            return [i, Number(result)]
                }));
        });
    }

    return {
        record : record
      , stat: stat
      , aggrstat: aggrstat
      , sum: stat.bind(null, 'sum')
      , count: stat.bind(null, 'count')
      , avg: stat.bind(null, 'avg')
      , max: stat.bind(null, 'max')
      , min: stat.bind(null, 'min')
      , aggrsum: aggrstat.bind(null, 'sum')
      , aggrcount: aggrstat.bind(null, 'count')
      , aggravg: aggrstat.bind(null, 'avg')
      , aggrmax: aggrstat.bind(null, 'max')
      , aggrmin: aggrstat.bind(null, 'min')
      , getFromTo: util.getFromTo
    }
}

exports.getFromTo = util.getFromTo;
