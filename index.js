var http = require('http');
var express = require('express');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var CollectionDriver = require('./collectionDriver').CollectionDriver;
var captchagen = require('captchagen');

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.bodyParser());

var collectionDriver;

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db){
  if (err) {
      console.error("Error! Exiting... Must start MongoDB first");
      process.exit(1);
  }

  collectionDriver = new CollectionDriver(db); //F
});

//var mongoClient = new MongoClient(new Server('localHost', 27017));
//mongoClient.open(function(err, mongoClient) { //C
//  if (!mongoClient) {
//      console.error("Error! Exiting... Must start MongoDB first");
//      process.exit(1); //D
//  }
//  var db = mongoClient.db("tacoDB");  //E
//  collectionDriver = new CollectionDriver(db); //F
//});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/math', function(req, res){

  var captcha = captchagen.create({text: 'mojo'});
  var gend = captcha.generate();

  res.type('image/png');
  res.end(captcha.buffer());
});

app.get('/captcha', function(req, res){
  var cookieId = req.headers.cookie;
  var scoreCollection = 'scoreCollection';

  collectionDriver.get(scoreCollection, cookieId, function(error, objs){
    var randomText = (((1+Math.random())*0x10000000) | 0).toString(32);
    var myEntry = objs;
    myEntry.captcha = randomText;
    myEntry.isHuman = false;

    collectionDriver.update(scoreCollection, cookieId, myEntry, function(merror, obj) { //B
      var captcha = captchagen.create({text: randomText, width: 200, height: 100});
      captcha.generate();

      res.type('image/png');
      res.end(captcha.buffer());
    });
  });
});


app.get('/leaderboard', function(req, res){
    collectionDriver.findAll('scoreCollection', function(error, objs){
        var jsonArray = [];
        for(var ww=0; ww < objs.length; ww++){
            if(objs[ww].name == null || objs[ww].name == undefined)
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
      collectionDriver.save(scoreCollection, {_id: cookieId, score: 1, isHuman: false}, function(err, docs){
          if(err) {res.send(400, err);}
          else {res.send(201, docs);}
      });
    } else {
      var myEntry = objs;

      if((myEntry.score % (100 + Math.floor((Math.random() * 100) + 1))) === 0){
        var randomText = (((1+Math.random())*0x10000000) | 0).toString(32);
        myEntry.captcha = randomText;
        myEntry.isHuman = false;
      }

      if(myEntry.isHuman)
        myEntry.score = myEntry.score+1;

      collectionDriver.update(scoreCollection, cookieId, myEntry, function(merror, obj) { //B
          if (merror) { res.send(400, merror); }
          else {
            collectionDriver.findAll('scoreCollection', function(error, objs){
                if(error ){
                  res.send(200, {leaderboard: jsonArray, score: myEntry.score});
                } else if(objs.length < 10 && !myEntry.isHuman && !myEntry.name){
                  res.send(200, {leaderboard: jsonArray, score: myEntry.score, captchaPrompt: true});
                } else if(objs.length < 10 && myEntry.isHuman && !myEntry.name){
                  res.send(200, {leaderboard: jsonArray, score: myEntry.score, namePrompt: true});
                } else {

                  var captchaPrompt = false;
                  var namePrompt = false;
                  if(!myEntry.isHuman && (objs[objs.length-1].score < myEntry.score)){
                    captchaPrompt = true;
                  } else if(myEntry.isHuman && (objs[objs.length-1].score < myEntry.score) && !myEntry.name){
                    namePrompt = true;
                  }

                  var jsonArray = [];
                  for(var ww=0; ww < objs.length; ww++){
                    if(objs[ww].name != null || objs[ww].name != undefined)
                      jsonArray.push({rank: ww+1, name: objs[ww].name, score: objs[ww].score});
                  }

                  res.send(200, {leaderboard: jsonArray, score: myEntry.score, captchaPrompt: captchaPrompt, namePrompt: namePrompt});
                }
            });
          }
      });
    }
  });
});

app.post('/postCaptcha', function(req, res){
  var cookieId = req.headers.cookie;
  var scoreCollection = 'scoreCollection';
  var captchaText = req.body.captcha;

  collectionDriver.get(scoreCollection, cookieId, function(error, objs){
    if(error) {res.send(400, err);}

    if(objs != null || objs.captcha != null){
      if(captchaText === objs.captcha){

        var myEntry = objs;
        myEntry.isHuman = true;

        collectionDriver.update(scoreCollection, cookieId, myEntry, function(merror, obj) {
          if (merror) { res.send(400, merror); }
          if(obj.name)
            res.send(200, {namePrompt: false});

          res.send(200, {namePrompt: true});
        });
      }
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

