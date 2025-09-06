import dotenv from "dotenv"
dotenv.config({
    path: "./.env"
});
import {app} from "./app.js"
import { connectDB } from "./db/index.js";

const PORT=process.env.PORT || 8001;

connectDB()
    .then(()=>{
        app.listen(PORT,()=>{
            console.log(`Server is listening at the ${PORT}`)
        })
    })
    .catch((error)=>{
        console.log(`MongoDB connection error ${error}`)
    })  