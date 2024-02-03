import mongoose from "mongoose";
import { DB_name } from "../constants.js";
import dotenv from "dotenv";
dotenv.config();
// * ----------------------------------------------------------------
//Method  iife
const connectDB = async () => {
  try {
    const ConnectionInstance = await mongoose.connect(
      `${process.env.MONDODB_URI}/${DB_name}`
    );
    console.log(`Connected to ${DB_name}`);
   // console.log(`${process.env.MONDODB_URI}/${DB_name}`)
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED", error);
    process.exit(1);
  }
};

export default connectDB;

// *  ----------------------------------------------------------------

//Method Two -  normal function

// function connect() {
//   mongoose.connect(process.env.MONDODB_URI, {useNewUrlParser: true,  useUnifiedTopology: true,})
//     .then(console.log("connected"))
//     .catch((err) => {
//       console.log(err);
//     });
// }

// modules.export = connect
