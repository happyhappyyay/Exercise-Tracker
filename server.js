require('dotenv').config();
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortId = require('shortid');

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });

let User = mongoose.model("Users", new mongoose.Schema({
  id:{type:String, default:shortId.generate, unique:true},
  uid:String,
  exercises:[{
    description:String,
    duration:Number,
    date:Date}],
}));

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req,res)=>{
  let username = req.body.username;
  if(username.length !== 0){
    if(username.length < 11){
      if(!username.includes(" ")){
        createUserAndSave(username,(err,data)=>{
          if(data){
            res.json({newUser:data.uid, userid:data.id});
          }
          else if(!err & !data){
          res.json({error:"username already exists"})        
          }
        })
      }
      else {
        res.json({error:"usernames cannot contain spaces"})
      }
    }
    else{
          res.json({error:"username should not exceed 10 characters"
    });
    }
  }
  else {
           res.json({error:"username cannot be left blank"});
  }
})

app.get("/api/exercise/log", (req,res)=>{
  let id = req.query.userId;
  if(id){
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit;
    findUserByUserId(id,(err,data)=>{
      if(data){
        data.exercises = sortExerciseList(data.exercises,from,to,limit);
        res.json({user:data.uid, userid:data.id, exercises:data.exercises.length, log: data.exercises});
      }
      else {
        res.json({error:"userId incorrect"})
      }
    })
  }
  else {
    res.json({error:"userId incorrect"});
  }
})

let sortExerciseList = (exercises, from, to, limit)=>{
  if(from){
    let date = Date.parse(from);
    if(date){
      exercises = exercises.filter((val)=>{
        return val.date.getTime()>=date;
      })
    }
  }
  if(to){
    let date = Date.parse(to);
    if(date){
      exercises = exercises.filter((val)=>{
        return val.date.getTime()<=date;
      })
    }
  }
  if(limit){
    let lim = parseInt(limit);
    if(lim){
      exercises.splice(lim);
    }
  }
  return exercises;
}
let createUserAndSave = (user,done)=>{
  findUserByUserName(user,(err,data)=>{
    if(!err & !data){
      let newUser = new User({uid:user,exercises:[]});
        newUser.save((err,data)=>{err?done(err):done(null,data)});
    }
    else if(data){
      done(null, null);
    }
  })
}

let findUserByUserId = (id, done)=>{
  User.findOne({id:id},(err,data)=>{err?done(err):done(null,data)}).select('-exercises._id');
}

let findUserByUserName = (name, done)=>{
  User.findOne({uid:name},(err,data)=>{err?done(err):done(null,data)}).select('-exercises._id');
}

app.post("/api/exercise/add", (req,res)=>{
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = Number.parseFloat(req.body.duration);
  let dateText = req.body.date;
  let exercise;
  if(userId != null){
    if(shortId.isValid(userId)){
      findUserByUserId(userId,(err,data)=>{
        if(data){
          if(description){
            if(duration){
              let dateTime=Date.parse(dateText);
              if(dateText){
                  if(dateTime){
                    exercise = {
                      description:description,
                      duration:duration,
                      date:new Date(dateTime),
                    };
                  }
                  else {
                    res.json({error:"date format is incorrect"});
                  }
              }
              else{
                  dateTime = new Date();
                  exercise = {
                  description:description,
                  duration:duration,
                  date:dateTime,
                  };
              }
              if(dateTime){
              data.exercises.push(exercise);
              data.save((err,dat)=>{
                res.json({success:"exercise added for " + data.uid + "(" + data.shortId + ")"});
              })
              }

            }
            else {
              res.json({error:"duration incorrectly entered"});
            }
          }
          else {
            res.json({error:"no description entered"})
          }
      }
      else{
        res.json({error:"could not find userId"});
      }
    })
    }
    else{
      res.json({error:"could not find userId"})
    }
  }
    else{
      res.json({error:"could not find userId"})
    }
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
