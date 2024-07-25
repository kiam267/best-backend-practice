import dotenv from "dotenv";
import express from "express";

import connectDB from "./db/db.js";
import { app } from "./app.js";

const port = process.env.PORT || 8000;

dotenv.config({
     path: "./env",
});

connectDB()
     .then(() => {
          app.listen(port, () => {
               console.log(`✨ Server running on port ${port}`);
          });
     })
     .catch((err) => {
          console.log(`MONGO db connection failed !!! ${err}`);
     });
