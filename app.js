//jshint esversion:6
require('dotenv').config();
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require('express-session');
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

const swaggerJSDoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")

const app = express();




app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}))

app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));

var usertrack ="";
app.use(passport.initialize());
app.use(passport.session());

const options={
    definition:{
        openapi : "3.0.0",
        info : {
            title:"Notes API project",
            version: "1.0.0"
        },
        servers:[{
            url : 'http://localhost:3500/'
        }]
    },
    apis:['./app.js']
}

const swaggerSpec = swaggerJSDoc(options)
app.use('/docs',swaggerUi.serve, swaggerUi.setup(swaggerSpec))

mongoose.connect(process.env.MONGO,{useNewUrlParser:true})

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
})

const noteschema = new mongoose.Schema ({
    text: String,
    user: String
})
userSchema.plugin(passportLocalMongoose)

const User = new mongoose.model("User", userSchema)
const Notesmodel = new mongoose.model("notes", noteschema)
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/**
 * @swagger
 * /:
 *  get:
 *      summary: Home route Functionality 
 *      description: serves options to register or login
 *      responses:
 *          200:
 *              description: Application can't be triggered since secure sessions are being used for each user, kindly sign in
 */
app.get("/",function(req,res){
    res.render("home");
})
app.get("/submit",function(req,res){
    res.render("submit");
})
app.post("/submit",function(req,res){
    const note = new Notesmodel ({
        text:req.body.secret,
        user:usertrack
    })
    note.save();
    // MongoDB updation code
    res.redirect("secrets")
})
app.get("/login",function(req,res){
    res.render("login");
})
app.get("/delete/:delid",async function(req,res){
    console.log(req.params.delid)
    await Notesmodel.findByIdAndRemove(req.params.delid).exec();   
    res.redirect("/secrets") 
})
app.get("/register",function(req,res){
    res.render("register");
}) 
/**
 * @swagger
 * /secrets:
 *  get:
 *      summary: To get all secret notes preserved
 *      description: Fetching all notes
 *      responses:
 *          200:
 *              description: Application can't be triggered since secure sessions are being used for each user, kindly sign in
 */
app.get("/secrets",async function(req,res){
    if(req.isAuthenticated()){
        // Fetch data for user, and display
        var prevNotes = await Notesmodel.find({user:usertrack}).exec();
        if(prevNotes.length!=0){res.render("secrets",{results:prevNotes})}
    }else{
        passport.authenticate("local")(req,res, function(){
            res.redirect("/register");
        })
    }
})
app.get("/logout",function(req,res){
    req.logout(function(err) {
    if (err) { return next(err); }
    usertrack ="";
    res.redirect("/");
    })
})

app.post("/register",function(req,res){
    User.register({username:req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                usertrack=req.body.username;
                res.redirect("/secrets");
            })
        }
    }
)
})
app.post("/login",function(req,res){
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });
    req.login(user, function(err){
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req,res, function(){
                usertrack =req.body.username;
                res.redirect("/secrets");
            })
        }
    })
})

app.listen(process.env.port||3500,function(){
    console.log("Started at port");;
})