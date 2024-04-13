import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import cors from "cors";
import api from "./src/api/index.js";
import mongooseConnection from "./src/services/db/mongoose.js";
import bodyParser from "body-parser";
import {initPassportStrategies} from "./src/services/strategies/index.js";
import agenda from "./src/services/agenda/index.js";


await mongooseConnection();
await initPassportStrategies();


if (process.env.LOG_LEVEL === "debug") {
    mongoose.set("debug", true);
}

const app = express();

app.use(cors());
app.options("*", cors());

app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}));

app.use(api);

app.listen(process.env.PORT || 3000, () => {
    console.log("Board Game Counter Server started on Port: " + process.env.PORT || 3000);
});