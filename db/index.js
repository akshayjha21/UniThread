import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
});

import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}`
    );
    console.log(`\n MongoDB connected : ${connectionInstance.connection.host}`);
    console.log(DB_NAME);
  } catch (error) {
    console.log(`MongoDB error `, error);
    process.exit(1);
  }
};
// // // Debug output
// console.log('DB_NAME:', DB_NAME);
// console.log('MONGODB_URL:', process.env.MONGODB_URL);

export { connectDB };
