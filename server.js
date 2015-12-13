//require.paths.unshift(__dirname + '/lib');
//require.paths.unshift(__dirname);

var config = require('./config/config'),
    mongo = require('mongodb'),
    http = require('http');


var show_log = function(request, response, db){
  db.collection('addresses', function(err, collection){
    collection.find({}, {limit:10, sort:[['_id','desc']]}, function(err, cursor){
      cursor.toArray(function(err, items){
        response.writeHead(200, {'Content-Type': 'text/plain'});
        for(i=0; i<items.length;i++){
          response.write(JSON.stringify(items[i]) + "\n");
        }
        response.end();
      });
    });
  });
}

var track_hit = function(request, response, db){
  db.collection('addresses', function(err, collection){
    var address = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    hit_record = { 'client': address,'ts': new Date() };

    collection.insert( hit_record, {safe:true}, function(err){
      if(err) { 
        console.log(err.stack);
      }
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.write(JSON.stringify(hit_record));
      response.end("V2 - Tracked hit from " + address + "\n");
    });
  });
}

var replSet = new mongo.ReplSetServers(
  [ new mongo.Server(config.mongo_host, config.mongo_port, {}) ],
  { rs_name:config.mongo_replset }
);
var db = new mongo.Db('mynodeapp', replSet);
db.open(function(err, db){
  var server = http.createServer(function (request, response) {

    var url = require('url').parse(request.url);

    if(url.pathname === '/hits') {
      show_log(request, response, db);
    } else {
      track_hit(request, response, db);
    }

  });
  server.listen(config.listen_port);
});

console.log("Server running at http://0.0.0.0:" + config.listen_port + "/");
