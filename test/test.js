var redis = require('redis');
var client = redis.createClient();
var rts = require('../lib/rts')({
        redis: client
      , gran: '5m, 1h, 1d, 1w'
      , points: 500
      , prefix: 'test'
});

var H = 60 * 60 * 1000;
var D = 24 * H;
var t = Date.now() - 1000 * H;
var from = t;

function record(timestamp, name, num, statistics, aggregations, callback) {
    rts.record(name, num, statistics, aggregations, timestamp, callback);
}

function _log(message) {
    return function log(err, results) {
        console.log(message, err, results);
    }
}

var timer = setInterval(function() {
    t += Math.random() * H;
    record(t, 'click');
    record(t, 'delay', Math.random() * 101, ['min', 'max', 'avg']);
    record(t, 'consume', Math.random() * 1000, ['avg', 'min', 'max', 'sum'], ['dy', 'hq']);
}, 10);

setTimeout(function() {
        rts.sum('click', '5m', from, from + H,  _log('click 5m'));
        // even not store, also can get, but zero results;
        rts.sum('click', '8m', from, from + H,  _log('click 8m'));
        rts.sum('click', '1d', from, from + 30 * D, _log('click 1d'));
        rts.avg('delay', '1h', from, from + 24 * H, _log('delay 1h avg'));
        rts.max('delay', '1w', from, from + 365 * D, _log('delay 1w max'));
        rts.aggrmin('consume', 'dy', from, _log('consume dy'));
        rts.aggravg('consume', 'hq', from, _log('consume hq'));
        clearInterval(timer);
        client.unref();
}, 1000);

