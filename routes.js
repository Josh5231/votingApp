var express = require("express");
var session = require("express-session");
var bodyParser = require('body-parser');

var mongo = require("mongodb").MongoClient;
var mongoURL = process.env.MONGOLAB_URI;

var router = express.Router();

var attemps = 0;

var DB = null;
var userCol = null;
var pollCol = null;

var startUp = ()=> {
mongo.connect(mongoURL,(err,db)=>{
 if(err){ 
     attemps++;
     console.log("Error on attemp #"+attemps+" : "+err);
     if(attemps<4){ setTimeout(startUp(),500); return; }
     else { throw err; }
    }
 else { 
     DB = db;
     userCol = DB.collection("users");
     pollCol = DB.collection("polls");
     console.log("DB Connected");
     return;
     }
     
});
};

startUp();

//Make sure the DB is connected befor allowing any other calls to go through
//On fail it will return Error("DB not ready"); 
router.use((req,res,next)=>{
    DB.stats(function(err, stats){
        if(err){ throw err; }
        if(stats===null){ DB=null; return; }
    });
    if(DB===null){ console.log("DB not ready error"); res.send(new Error("DB not ready")); return; }
    next();
});


//Grab all the current polls from the DB
//Returns an JSON object with formate
// [ { _id:object, id:String, name:String, dis:String, options:[ { opt:string, votes:Number },... ] }, .... ]
router.get("/polls",(req,res)=>{
        pollCol.find().toArray((err,data)=>{
           if(err){ throw err; }
           res.send(data);
           return;
        });
}); 


router.get("/loggedin",(req,res)=>{
    if(req.session!==undefined){ res.send(req.session.uid); }
    else { res.send(null); }
});

//Submit and save a vote
router.post("/vote",(req,res)=>{
    var data = req.body;
    pollCol.findOne({ id:data.id },(err,doc)=>{
        if(err){ throw err; }
        doc.options[data.opt].votes+=1;
        pollCol.updateOne( { id:data.id } );
        return;
    });
});

router.post("/addopt",(req,res)=>{
   var data = req.body;
   pollCol.findOne({ id:data.id }, (err,doc)=>{
      if(err){ throw err; }
      doc.options.push({ opt:data.opt, votes:0 });
      pollCol.updateOne({ id:data.id }, doc).then(()=>{ res.send("success") });
      return;
   });
   /*
    pollCol.find( { id:data.id } ).toArray((err,docs)=>{
           if(err){ res.send(err); return; }
           var temp = docs[0];
           temp.options.push({ opt:data.opt, votes:0 });
           pollCol.updateOne({ id:data.id},temp).then(()=>{ res.send("success"); });
           return;
        }); */
});


router.post("/userPoll",(req,res)=>{
   var data=req.body;
   
   userCol.findOne({ userName:data.userName },(err,doc)=>{
      if(err){ throw err; }
      if(doc===null){ res.send("error"); return; }
      doc.polls.push(data.pollID);
      userCol.updateOne({ userName:data.userName },doc,(err,r)=>{
          if(err){ throw err; }
          res.send("success");
          return;
      });
   });

});


router.post("/getUserPolls",(req,res)=>{
   var data = req.body;
       userCol.findOne({ userName:data.userName },(err,doc)=>{
          if(err){ throw err; }
          res.send(doc.polls);
          return;
       });
});

router.post("/remove",(req,res)=>{
   var data = req.body;
      pollCol.removeOne({ id:data.pollID },(err,doc)=>{
          if(err){ throw err; }
          userCol.findOne({ userName:data.userName },(err,doc2)=>{
             if(err){ throw err; }
             var out=doc2;
             out.polls=doc2.polls.filter((cv)=>{ return cv!==data.pollID; });
             userCol.replaceOne({ userName:data.userName},out,(err,r)=>{
                if(err){ throw err; }
                res.send("success");
                return;
             });
          });
      });
});

router.post("/submitpoll",(req,res)=>{
   var data = req.body;
   data.options=data.options.map((cv)=>{ return { opt:cv.opt, votes:0  }; });

      pollCol.insertOne(data,(err,d)=>{
         if(err){ throw err; }
         res.send(data.id);
         return;
      });
});

router.post("/login",(req,res)=>{
    var cur_session = req.session;
    var userName = req.body.userName;
    var userPass = req.body.password;

        userCol.findOne({ userName:userName, password:userPass },(err,doc)=>{
           if(err){ throw err; }
           if(doc!==null){ cur_session.uid = doc.userName; res.send("success"); return; }
           res.send("fail");
           return;
        });
}); 

router.post("/newUser",(req,res)=>{
    var userName = req.body.userName;
    var userPass = req.body.userPass;
    var userEmail = req.body.Email;

    userCol.findOne({userName:userName},(err,doc)=>{
       if(err){ throw err; }
       if(doc!==null){ res.send("errorUser"); return; }
       
       userCol.findOne({ Email:userEmail },(err2,doc2)=>{
          if(err2){ throw err2; }
          if(doc2!==null){ res.send("errorEmail"); return; }
          
          var out = {
            userName:userName,
            password:userPass,
            Email:userEmail,
            polls:[],
            type:"user"
            };
            
        userCol.insertOne(out,(err3)=>{
            if(err3){ throw err3; }
            res.send("success");
            return;
        });
          
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
