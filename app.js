//env config
import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
})

//importing routes
import {Posts} from './routes/Posts'
import {Comments} from './routes/Comments'
import {Users} from './routes/Users'
import {Messages} from './routes/Messages'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';

//establishing the express server

const app=express();


// common middlewares
app.use(cors())
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))//can acces public folders 
app.use(cookieParser())

//main routes
app.use("api/users",Users)
app.use("api/posts",Posts)
app.use("api/comments",Comments)
app.use("api/messages",Messages)

export {app};