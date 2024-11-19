const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
var indexRouter = require("./src/routes");
const app = express();
// const https = require("https"),
(fs = require("fs")), (helmet = require("helmet"));

var originsWhitelist = ["*"];
var corsOptions = {
  // origin: function (origin, callback) {
  //   var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
  //   callback(null, isWhitelisted);
  // },
  // origin: originsWhitelist,
  // credentials: true,
  // methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH", "OPTIONS"],
};
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   if (req.method === "OPTIONS") {
//     res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
//     return res.status(200).json({});
//   }
//   next();
// });

app.use(helmet()); // Add Helmet as a middleware

app.use(morgan("tiny"));

app.use(bodyParser.urlencoded({ extended: true, limit: "2048mb" }));
app.use(
  bodyParser.json({
    limit: "2048mb",
  })
);

app.use(cookieParser());

// app.options("*", cors(corsOptions));

// All routes for the APIs //

app.use("/uploads", express.static(__dirname + "/uploads"));

app.get("/", (req, res) => {
  res.writeHead(200);
  res.send("LFM API Server");
});

try {
  // Initiate the API //
  app.use("/api/v1/", indexRouter);
} catch (e) {
  console.log(e);
}

const port = process.env.PORT || 8080;

// app.listen(port, "127.0.0.1", function () {
//   console.log(`Server listening on port ${port}`);
// });

// const sport = process.env.PORT || 5050;

// http.createServer(app).listen(sport, function () {
//   console.log(`Https Server listening on port ${sport}`);
//   socket.config(app);
// });

module.exports = app;
