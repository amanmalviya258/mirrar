import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: 'GET,HEAD,PUT,POST,DELETE'
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "16kb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));  // responsible for parsing the URL-encoded data in the body of the request
app.use(express.static('public'))

export { app };
 