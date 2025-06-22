import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import "./services/dbService.js"; // MongoDB init
import webhookRouter from "./routes/webhook.js";

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/webhook", webhookRouter);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
