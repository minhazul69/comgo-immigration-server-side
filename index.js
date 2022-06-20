const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
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
// VERIFY USER ON JOTtOKEN
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorize Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const visaCollection = client.db("comgo-immigration").collection("visa");
    const orderCollection = client.db("comgo-immigration").collection("order");
    const userCollection = client.db("comgo-immigration").collection("user");

    // VERIFY ADMIN
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded?.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      console.log(req.decoded);
      if (requesterAccount?.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    };
    // app.get("/myProfile", async (req, res) => {
    //   const email = req.query?.email;
    //   // const decodedEmail = req.decoded.email;
    //   // if (email === decodedEmail) {
    //   const query = { email: email };
    //   const myProfile = await userProfileCollection.find(query).toArray();
    //   return res.send(myProfile);
    //   // } else {
    //   //   return res.status(403).send({ message: "Forbidden Access" });
    //   // }
    // });
    // GET ADMIN
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    // // update MY PROFILE
    // app.put("/userProfile/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const filter = { email: email };
    //   const user = req.body;
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: user,
    //   };
    //   const result = await userProfileCollection.updateOne(
    //     filter,
    //     updateDoc,
    //     options
    //   );
    //   res.send(result);
    // });
    // MAKE ADMIN
    app.put("/user/admin/:email", verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      console.log(email, filter);
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //   USER ADD ON DATABASE
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "5h",
      });
      res.send({ result, token });
    });
    // FIND ALL USER
    app.get("/allUser", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //   FIND ALL PRODUCT
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
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
    // FIND MY ORDER
    app.get("/order", async (req, res) => {
      const email = req.query?.email;
      const query = { email: email };
      const order = await orderCollection.find(query).toArray();
      return res.send(order);
    });
    // DELETE ORDER
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/allOrder", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
