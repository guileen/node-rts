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
  , d: [1,2,3,4,5,6,7]
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
            granMap[granInfo[0]] = granInfo;
    });

    function getGranKey(name, gran, timestamp) {
        var granId = util.getGranId(gran, timestamp);
        return [prefix, name, gran[0], granId].join(':');
    }

    function getAggrGruopKey(name, aggr, timestamp) {
        var gid = util.getAggrGroupId(aggr, timestamp);
        return [prefix, name, 'aggr', gid].join(':');
    }

    function getAggrKey(name, aggr, timestamp) {
        var aggrId = util.getAggrId(aggr, timestamp);
        return getAggrGruopKey(name, aggr, timestamp) + '.' + aggrId;
    }

    function record(name, num, statistics, aggregations, timestamp, callback) {
        function recordStats(key) {
            statistics && statistics.forEach(function(stat) {
                    if(stat == 'sum') {
                        multi.hincrby(key, 'sum', num)
                    } else {
                        multi.eval(scripts[stat], 2, key, num, function(err, result) {
                                multi.discard();
                                if(err) throw err;
                                if(result && result.indexOf('ERR') == 0) throw new Error(result);
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
                var unitPeriod = gran[3];
                multi.expire(key, points * unitPeriod / 1000);
        });

        if(aggregations) for(var i = 0; i < aggregations.length; i++) {
            var aggr = aggregations[i];
            var key = getAggrKey(name, aggr, timestamp);
            recordStats(key);
        }

        multi.exec(callback || log);
    }

    function stat(type, name, granCode, fromDate, toDate, callback) {
        if(!callback && typeof toDate == 'function') {
            callback = toDate;
            toDate = Date.now();
        }
        if(fromDate instanceof Date) fromDate = fromDate.getTime();
        if(toDate instanceof Date) toDate = toDate.getTime();
        var gran = granMap[granCode];
        var unitPeriod = gran[3];
        var multi = redis.multi();
        for(var d = fromDate; d < toDate; d += unitPeriod) {
            var key = getGranKey(name, gran, d);
            multi.hget(key, type);
        }
        multi.exec(callback);
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
        multi.exec(callback);
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
    }
}
