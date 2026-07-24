const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const routes = require("./routes");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(routes);

app.get("/", (req, res) => {
    res.json({ message: "Transaction Pool API is running" });
});

app.listen(port, () => {
    console.log(`Transaction Pool API listening on http://localhost:${port}`);
});

module.exports = app;
