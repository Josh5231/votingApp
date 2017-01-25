var express = require("express");
var app = express();
var session = require("express-session");
var bodyParser = require('body-parser');

var mongo = require("mongodb").MongoClient;
var mongoURL = process.env.MONGOLAB_URI;

var port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SES_SECRET,
    resave: false,
    saveUninitialized: true
}));

//Grab all the current polls from the DB
app.get("/polls",(req,res)=>{
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

app.get("/loggedin",(req,res)=>{
    if(req.session!==undefined){ res.send(req.session.uid); }
    else { res.send(null); }
});

//Submit and save a vote
app.post("/vote",(req,res)=>{
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

app.post("/addopt",(req,res)=>{
   var data = req.body;
   console.log(data.id+" - "+data.opt);
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

app.post("/userPoll",(req,res)=>{
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
             console.log("updated user");
             db.close();
             res.send("success");
             return;
          });
       });
   });
});

app.post("/getUserPolls",(req,res)=>{
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

app.post("/remove",(req,res)=>{
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

app.post("/submitpoll",(req,res)=>{
   var data = req.body;
   data.options=data.options.map((cv)=>{ return { opt:cv.opt, votes:0  }; });
   mongo.connect(mongoURL,(err,db)=>{
       if(err){ throw err; }
      var col = db.collection("polls"); 
      col.insertOne(data,(err,d)=>{
         if(err){ throw err; }
         db.close();
         res.send("success");
         return;
      });
   });
   return;
});

app.post("/login",(req,res)=>{
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


app.post("/newUser",(req,res)=>{
    var userName = req.body.userName;
    var userPass = req.body.userPass;
    var userEmail = req.body.userEmail;
    mongo.connect(mongoURL, function (err, db) 
      {
        if (err) { throw err; }
        var col = db.collection("users");
        //1. Check if userName is already taken
        col.find({ userName:userName }).toArray((err,doc)=>{
           if(err){ throw err; }
           if(doc.length>0){ db.close(); res.send("errorUser"); return; }
        });
        
        //2. Check if Email is already being used
        col.find({ Email:userEmail }).toArray((err,doc)=>{
           if(err){ throw err; }
           if(doc.length>0){ db.close(); res.send("errorEmail"); return; }
        });
        
        //3. Setup user object
        var out = {
            userName:userName,
            password:userPass,
            Email:userEmail,
            polls:[],
            type:"user"
        };
        
        //4. Add new user to DB
        col.insert(out,(err)=>{
            if(err){ throw err; }
            db.close();
            res.send("success");
            return;
        });
      });
});

app.get("/logout",(req,res)=>{
   req.session.destroy();
   res.send("done");
});

///static/js/main.2cf20ec8.js
app.get("/static/js/main.901773c6.js",(req,res)=>{
   res.sendFile("main.901773c6.js",{root: __dirname+"/build/static/js/" }); 
});
///static/css/main.a8962cf1.css
app.get("/static/css/main.a8962cf1.css",(req,res)=>{
   res.sendFile("main.a8962cf1.css",{root: __dirname+"/build/static/css/" }); 
});
///favicon.ico
app.get("/favicon.ico",(req,res)=>{
   res.sendFile("favicon.ico",{root: __dirname+"/build/" }); 
});

app.get("/",(req,res)=>{
   res.sendFile("index.html",{root: __dirname+"/build/" }); 
});

app.listen(port,(err)=>{
    if(err){ throw err; }
    console.log("App running on port:"+port);
});

