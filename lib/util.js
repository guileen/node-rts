// vim: sw=4
exports.normalPeriod = {
    s : 1000
  , m : 60 * 1000
  , h : 60 * 60 * 1000
  , d : 24 * 60 * 60 * 1000
  , w : 7 * 24 * 60 * 60 * 1000
  , M : 30 * 24 * 60 * 60 * 1000
  , y : 365 * 24 * 60 * 60 * 1000
}

exports.getUnitDesc = function(str) {
    str = str.trim();
    var match = str.match(/(\d+)([smhdwMy])/);
    if(!match) throw new Error('Bad period descriptor:' + str);
    var num = parseInt(match[1]) || 1;
    var unit = match[2];
    var period = num * exports.normalPeriod[unit];
    return [period, str, num, unit];
}

exports.getTimeKey = function(unitDesc, timestamp) {
    if(!timestamp) timestamp = Date.now();
    var num = unitDesc[2];
    var unit = unitDesc[3];
    var period = unitDesc[0];
    var v;
    if (unit == 'y') {
        v = (new Date(timestamp)).getFullYear() / num;
    } else if (unit == 'M') {
        var d = new Date(timestamp);
        v = (d.getFullYear() * 100 + d.getMonth() + 1) / num;
        // TODO week
    } else {
        v = timestamp - (timestamp % period);
    }
    return Math.floor(v);
}

exports.getGranId = function(unitDesc, timestamp) {
    if(!timestamp) timestamp = Date.now();
    var num = unitDesc[2];
    var unit = unitDesc[3];
    var period = unitDesc[0];
    var v;
    if (unit == 'y') {
        v = (new Date(timestamp)).getFullYear() / num;
    } else if (unit == 'M') {
        var d = new Date(timestamp);
        v = (d.getFullYear() * 100 + d.getMonth() + 1) / num;
        // TODO week
    } else {
        v = timestamp / period;
    }
    return Math.floor(v);
}

exports.getAggrId = function(desc, timestamp) {
    var d = timestamp ? new Date(timestamp) : new Date();
    if(desc[0] == 'h') {
        return d.getHours();
    } else if(desc[0] == 'd') {
        return d.getDay();
    }
    throw new Error('unknow aggr desc ' + desc);
}

exports.getAggrGroupId = function(desc, timestamp) {
    var v = 'all';
    var d = new Date(timestamp);
    if(desc[1] == 'm') {
        v = d.getFullYear() * 100 + d.getMonth();
    } else if(desc[1] == 'q') {
        v = d.getFullYear() * 10 + Math.ceil(d.getMonth() / 3)
    } else if(desc[1] == 'y') {
        v = d.getFullYear();
    }
    return desc + '.' + v;

}

exports.getFromTo = function(gran, points) {
    var from, to;
    var to = Date.now();
    var periodUnit = gran[0];
    var period = points * periodUnit;
    var from = to - period;
    return [from, to];
}
