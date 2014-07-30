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

var collectionDriver = new CollectionDriver(process.env.MONGOHQ_URL); 
 
app.use(express.static(path.join(__dirname, 'public')));

app.get('/leaderboard', function(req, res){
    collectionDriver.findAll('scoreCollection', function(error, objs){
        var jsonArray = [];
        for(var ww=0; ww < objs.length; ww++){
            if(objs[ww].name == null | objs[ww].name == undefined)
                objs[ww].name = 'anonymous';

            jsonArray.push({rank: ww+1, name: objs[ww].name, score: objs[ww].score});
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
            else {
                collectionDriver.findAll('scoreCollection', function(error, objs){
                  var jsonArray = [];
                    if(error){res.send(200, {leaderboard: jsonArray, score: myEntry.score});}
                    else {
                      var prompt = false;
                      for(var ww=0; ww < objs.length; ww++){
                        if(objs[ww].name == null || objs[ww].name == undefined)
                          objs[ww].name = 'anonymous';

                        if(objs[ww]._id === cookieId && objs[ww].name === 'anonymous')
                            prompt = true;

                        jsonArray.push({rank: ww+1, name: objs[ww].name, score: objs[ww].score});
                      }

                      res.send(200, {leaderboard: jsonArray, score: myEntry.score, prompt: prompt});
                    }
                });
            }
        });
    }
  });
});

app.post('/postName', function(req, res){
  var cookieId = req.headers.cookie;
  var scoreCollection = 'scoreCollection';

  collectionDriver.get(scoreCollection, cookieId, function(error, objs){
    if(error) {res.send(400, err);}
    var myEntry = objs;
    myEntry.name = req.body.name;
    collectionDriver.update(scoreCollection, cookieId, myEntry, function(merror, obj) { //B
      if (merror) { res.send(400, merror); }
      else {
        collectionDriver.findAll('scoreCollection', function(error, objs){
          var jsonArray = [];
          for(var ww=0; ww < objs.length; ww++){
              if(objs[ww].name == null | objs[ww].name == undefined)
                  objs[ww].name = 'anonymous';

              jsonArray.push({rank: ww+1, name: objs[ww].name, score: objs[ww].score});
          }

          res.send(200, {leaderboard: jsonArray});
        });
      }
    });
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

