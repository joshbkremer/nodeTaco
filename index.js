var http = require('http');
var express = require('express');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var CollectionDriver = require('./collectionDriver').CollectionDriver;

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.bodyParser());

var mongoHost = 'localHost'; //A
var mongoPort = 27017; 
var collectionDriver;
 
var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); //B
mongoClient.open(function(err, mongoClient) { //C
  if (!mongoClient) {
      console.error("Error! Exiting... Must start MongoDB first");
      process.exit(1); //D
  }
  var db = mongoClient.db("MyDatabase");  //E
  collectionDriver = new CollectionDriver(db); //F
});

app.use(express.static(path.join(__dirname, 'public')));

//app.get('/:collection', function(req, res) { //A
//   var params = req.params; //B
//   collectionDriver.findAll(req.params.collection, function(error, objs) { //C
//        if (error) { res.send(400, error); } //D
//        else {
//            if (req.accepts('html')) { //E
//                res.render('data',{objects: objs, collection: req.params.collection}); //F
//              } else {
//            res.set('Content-Type','application/json'); //G
//                  res.send(200, objs); //H
//              }
//         }
//    });
//});
//
//app.get('/:collection/:entity', function(req, res) { //I
//   var params = req.params;
//   var entity = params.entity;
//   var collection = params.collection;
//   if (entity) {
//       collectionDriver.get(collection, entity, function(error, objs) { //J
//          if (error) { res.send(400, error); }
//          else { res.send(200, objs); } //K
//       });
//   } else {
//      res.send(400, {error: 'bad url', url: req.url});
//   }
//});

app.get('/leaderboard', function(req, res){
    collectionDriver.findAll('scoreCollection', function(error, objs){
        var jsonArray = [];
        for(var ww=0; ww < objs.length; ww++){
            if(objs[ww].name == null | objs[ww].name == undefined)
                objs[ww].name = 'anonymous';
            jsonArray.push({name: objs[ww].name, score: objs[ww].score});
        }

        res.send(200, {leaderboard: jsonArray});
    });
});

app.get('/userScore', function(req, res){
    var cookieId = req.headers.cookie;
    var scoreCollection = 'scoreCollection';

    collectionDriver.get(scoreCollection, cookieId, function(error, objs){
        var score = 0;
        if(objs == null || objs.score == null){
            res.send(200, {score: 0});
        } else{
            res.send(200, {score: objs.score});
        }
    });
});

app.post('/increment', function(req, res){
  var cookieId = req.headers.cookie;
  var scoreCollection = 'scoreCollection';

  collectionDriver.get(scoreCollection, cookieId, function(error, objs){
    if(objs == null || objs.score == null){
        collectionDriver.save(scoreCollection, {_id: cookieId, score: 1}, function(err, docs){
            if(err) {res.send(400, err);}
            else {res.send(201, docs);}
        });
    } else {
        var myEntry = objs;
        myEntry.score = myEntry.score+1;
        collectionDriver.update(scoreCollection, cookieId, myEntry, function(merror, obj) { //B
            if (merror) { res.send(400, merror); }
            else { res.send(200, {score: myEntry.score}); } //C
        });
    }
  });
});

app.post('/:collection', function(req, res) { //A
    var object = req.body;
    var collection = req.params.collection;
    collectionDriver.save(collection, object, function(err,docs) {
          if (err) { res.send(400, err); }
          else { res.send(201, docs); } //B
     });
});

app.put('/:collection/:entity', function(req, res) { //A
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
       collectionDriver.update(collection, req.body, entity, function(error, objs) { //B
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //C
       });
   } else {
       var error = { "message" : "Cannot PUT a whole collection" };
       res.send(400, error);
   }
});

app.delete('/:collection/:entity', function(req, res) { //A
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
       collectionDriver.delete(collection, entity, function(error, objs) { //B
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //C 200 b/c includes the original doc
       });
   } else {
       var error = { "message" : "Cannot DELETE a whole collection" };
       res.send(400, error);
   }
});

//app.get('/', function (req, res){
//  res.send('<html><body><h1>Hello World</h1></body></html>');
//});
//
//app.use(function (req, res){
//  res.render('404', {url:req.url});
//});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

