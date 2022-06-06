const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome Comgo Immigration server");
});

const uri = `mongodb+srv://comgo-immigration:${process.env.DB_PASS}@cluster0.8gmwt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const visaCollection = client.db("comgo-immigration").collection("visa");
    const orderCollection = client.db("comgo-immigration").collection("order");
    // GET ALL VISA
    app.get("/visa", async (req, res) => {
      const result = await visaCollection.find().toArray();
      res.send(result);
    });
    // GET VISA ON ID
    app.get("/visa/:id", async (req, res) => {
      const id = req.params.id;
      filter = { _id: ObjectId(id) };
      const result = await visaCollection.findOne(filter);
      res.send(result);
    });
    // POST ORDER DATA
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
