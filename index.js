const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ygp3m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    console.log("✅ MongoDB Connected Successfully");

    const usersCollection = client.db("TaskManager").collection("users");
    const tasksCollection = client.db("TaskManager").collection("tasks");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "12h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    //user related Api
    app.post("/users", async (req, res) => {
      const user = req.body;

      // Insert email if user doesn't exists:
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //Task related Api
    app.get("/tasks", async (req, res) => {
      const result = await tasksCollection.find().toArray();
      res.send(result);
    });

    app.get("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const query = { _id: new ObjectId(id) };
        const task = await tasksCollection.findOne(query);
        if (!task) {
          return res.status(404).send({ message: "Task not found" });
        }
        res.send(task);
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/tasks", verifyToken, async (req, res) => {
      const camp = req.body;
      const result = await tasksCollection.insertOne(camp);
      res.send(result);
    });

    app.put("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const { category } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { category } };
      const result = await tasksCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.delete("/tasks/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const filter = { _id: new ObjectId(id) };
        const result = await tasksCollection.deleteOne(filter);

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Task deleted successfully" });
        } else {
          res.status(404).send({ success: false, message: "Task not found" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to Task Manager Server!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
