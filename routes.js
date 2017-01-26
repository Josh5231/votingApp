var express = require("express");
var session = require("express-session");
var bodyParser = require('body-parser');

var mongo = require("mongodb").MongoClient;
var mongoURL = process.env.MONGOLAB_URI;

var router = express.Router()


//Grab all the current polls from the DB
router.get("/polls",(req,res)=>{
     mongo.connect(mongoURL, (err, db)=>{
        if(err){ throw err; }
        var col = db.collection("polls");
        col.find().toArray((err,data)=>{
           if(err){ throw err; }
           res.send(data);
           db.close();
           return;
        });
     });
});

router.get("/loggedin",(req,res)=>{
    if(req.session!==undefined){ res.send(req.session.uid); }
    else { res.send(null); }
});

//Submit and save a vote
router.post("/vote",(req,res)=>{
   var data = req.body;
   mongo.connect(mongoURL, (err, db)=>{
        if(err){ throw err; }
        var col = db.collection("polls");
        col.find( { id:data.id } ).toArray((err,docs)=>{
           if(err){ throw err; }
           var temp = docs[0];
           temp.options[data.opt].votes+=1;
           col.updateOne({ id:data.id},temp);
           db.close();
           return;
        });
   });
});

router.post("/addopt",(req,res)=>{
   var data = req.body;
   mongo.connect(mongoURL, (err, db)=>{
       if(err){ throw err; }
       var col = db.collection("polls");
       col.find( { id:data.id } ).toArray((err,docs)=>{
           if(err){ throw err; }
           var temp = docs[0];
           temp.options.push({ opt:data.opt, votes:0 });
           col.updateOne({ id:data.id},temp).then(()=>{ res.send("success"); });
           db.close();
           return;
        });
   });
});

router.post("/userPoll",(req,res)=>{
   var data=req.body;
   mongo.connect(mongoURL,(err,db)=>{
       if(err){ throw err; }
       var col = db.collection("users"); 
       col.find({ userName:data.userName }).toArray((err,docs)=>{
          if(err){ throw err; }
          if(docs.length<1){ db.close(); res.send("error"); return; }
          docs[0].polls.push(data.pollID);
          col.replaceOne({ userName:data.userName },docs[0],(err,docs)=>{
             if(err){ throw err; }
             db.close();
             res.send("success");
             return;
          });
       });
   });
});

router.post("/getUserPolls",(req,res)=>{
   var data = req.body;
    mongo.connect(mongoURL,(err,db)=>{
       if(err){ throw err; }
       var col = db.collection("users"); 
       col.findOne({ userName:data.userName },(err,doc)=>{
          if(err){ throw err; }
          db.close();
          res.send(doc.polls);
          return;
       });
    });
});

router.post("/remove",(req,res)=>{
   var data = req.body;
   mongo.connect(mongoURL,(err,db)=>{
      if(err){ throw err; }
      var col = db.collection("polls");
      col.removeOne({ id:data.pollID },(err,doc)=>{
          if(err){ throw err; }
          ///console.log("Removed poll:"+data.pollID);
          var col2 = db.collection("users");
          col2.findOne({ userName:data.userName },(err,doc2)=>{
             if(err){ throw err; }
             var out=doc2;
             out.polls=doc2.polls.filter((cv)=>{ return cv!==data.pollID; });
             col2.replaceOne({ userName:data.userName},out,(err,r)=>{
                if(err){ throw err; }
                //console.log("Updated user's polls");
                db.close();
                res.send("success");
                return;
             });
          });
      });
   });
});

router.post("/submitpoll",(req,res)=>{
   var data = req.body;
   data.options=data.options.map((cv)=>{ return { opt:cv.opt, votes:0  }; });
   mongo.connect(mongoURL,(err,db)=>{
       if(err){ throw err; }
      var col = db.collection("polls"); 
      col.insertOne(data,(err,d)=>{
         if(err){ throw err; }
         db.close();
         res.send(data.id);
         return;
      });
   });
   return;
});

router.post("/login",(req,res)=>{
    var cur_session = req.session;
    var userName = req.body.userName;
    var userPass = req.body.password;
    mongo.connect(mongoURL, function (err, db) 
      {
        if (err) { throw err; }
        var col = db.collection("users");
        col.findOne({ userName:userName, password:userPass },(err,doc)=>{
           if(err){ throw err; }    
           db.close();
           if(doc!==null){ cur_session.uid = doc.userName; res.send("success"); return; }
           res.send("fail");
        });
      });
}); 


router.post("/newUser",(req,res)=>{
    var userName = req.body.userName;
    var userPass = req.body.userPass;
    var userEmail = req.body.Email;
    mongo.connect(mongoURL, function (err, db) 
      {
        if (err) { throw err; }
        var col = db.collection("users");
        //1. Check if userName is already taken
        col.find({ userName:userName }).toArray((err,doc)=>{
           if(err){ throw err; }
           if(doc.length>0){ console.log("Name error"); db.close(); res.send("errorUser"); return; }
           
                   
            //2. Check if Email is already being used
            col.find({ Email:userEmail }).toArray((err2,doc2)=>{
                if(err2){ throw err2; }
                if(doc2.length>0){ console.log("email error"); db.close(); res.send("errorEmail"); return; }
        
             //3. Setup user object
            var out = {
            userName:userName,
            password:userPass,
            Email:userEmail,
            polls:[],
            type:"user"
            };
        
                //4. Add new user to DB
            col.insert(out,(err3)=>{
                if(err3){ throw err3; }
                db.close();
                res.send("success");
                return;
            });            });
        });
        
      });
});

router.get("/logout",(req,res)=>{
   req.session.destroy();
   res.send("done");
});

router.get("/",(req,res)=>{
   res.sendFile("index.html",{root: __dirname+"/build/" }); 
});

module.exports = router;
