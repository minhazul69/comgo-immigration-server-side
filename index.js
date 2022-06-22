const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const paymentCollection = client
      .db("comgo-immigration")
      .collection("payment");

    // VERIFY ADMIN
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded?.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
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
      console.log("check admin email", email);
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
    // CREATE PAYMENT INTENT
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // DELETE USER
    app.delete("/userDelete/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
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
    app.get("/allUser", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
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
    app.post("/order", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    // FIND MY ORDER
    app.get("/order/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const order = await orderCollection.find(query).toArray();
      return res.send(order);
    });
    // MY ORDER UPDATE PROCESSING
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const pending = "PROCESSING";
      const updateDoc = {
        $set: {
          status: pending,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updateBooking = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateBooking);
    });
    // ORDER STATUS UPDATE ACCEPT
    app.patch("/updateOrder/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const shipped = "ACCEPT";
      const updateDoc = {
        $set: {
          status: shipped,
        },
      };
      const updateBooking = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateBooking);
    });
    // DELETE ORDER
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    // GET ORDER ON ID
    app.get("/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      filter = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(filter);
      res.send(result);
    });
    app.get("/allOrder", verifyJWT, verifyAdmin, async (req, res) => {
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
