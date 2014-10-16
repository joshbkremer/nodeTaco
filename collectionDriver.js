var ObjectID = require('mongodb').ObjectID;

CollectionDriver = function(db) {
  this.db = db;
};

CollectionDriver.prototype.getCollection = function(collectionName, callback) {
  this.db.collection(collectionName, function(error, the_collection) {
    if( error ) callback(error);
    else callback(null, the_collection);
  });
};

CollectionDriver.prototype.findAll = function(collectionName, callback) {
    this.getCollection(collectionName, function(error, the_collection) { //A
      if( error ) callback(error);
      else {
        the_collection.find({isHuman: true, name: {$exists: true}}).sort({score:-1}).limit(10).toArray(function(error, results) { //B
          if( error ) callback(error);
          else callback(null, results);
        });
      }
    });
};

CollectionDriver.prototype.findAllWeekly = function(collectionName, callback) {
    this.getCollection(collectionName, function(error, the_collection) { //A
      if( error ) callback(error);
      else {
        var currDate = new Date;
        currDate = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate(), 1, 10);
        var firstDate = currDate.getDate() - currDate.getDay();
        var lastDate = firstDate + 6;
        var firstTime = new Date(currDate.setDate(firstDate)).getTime();
        var lastTime = new Date(currDate.setDate(lastDate)).getTime();

        the_collection.find({isHuman: true, name: {$exists: true}, weeklyDate: {$gte: firstTime, $lt: lastTime}}).sort({weeklyScore:-1}).limit(10).toArray(function(error, results) { //B
          if( error ) callback(error);
          else callback(null, results);
        });
      }
    });
};

CollectionDriver.prototype.get = function(collectionName, cookieId, callback) { //A
    this.getCollection(collectionName, function(error, the_collection) {
        if (error) callback(error);
        else {
            the_collection.findOne({'_id':cookieId}, function(error,doc) { //C
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};

//save new object
CollectionDriver.prototype.save = function(collectionName, obj, callback) {
    this.getCollection(collectionName, function(error, the_collection) { //A
      if( error ) callback(error)
      else {
        obj.created_at = new Date(); //B
        the_collection.insert(obj, function() { //C
          callback(null, obj);
        });
      }
    });
};

//update a specific object
CollectionDriver.prototype.update = function(collectionName, myEntry, obj, callback) {
    this.getCollection(collectionName, function(error, the_collection) {
        if (error) callback(error);
        else {
            myEntry.updated_at = new Date(); //B
            the_collection.save(obj, function(error, doc) { //C
                if (error) callback(error);
                else callback(null, obj);
            });
        }
    });
};

//delete a specific object
CollectionDriver.prototype.delete = function(collectionName, entityId, callback) {
    this.getCollection(collectionName, function(error, the_collection) { //A
        if (error) callback(error);
        else {
            the_collection.remove({'_id':ObjectID(entityId)}, function(error,doc) { //B
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};


exports.CollectionDriver = CollectionDriver;
