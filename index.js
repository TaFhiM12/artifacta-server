const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const admin = require("firebase-admin");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { auth } = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

const corsOptions = {
  origin: ["http://localhost:5173", "https://artifacta-5240f.web.app"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Artifacts is running");
});

const uri = `${process.env.DB_URI}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.decoded = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
};

const verifyEmail = (req, res, next) => {
  const email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }

  if (email !== req.decoded.email) {
    return res.status(403).json({ error: "Forbidden access" });
  }

  next();
};

async function run() {
  try {
    const database = client.db("artifactaDB");
    const artifactsCollection = database.collection("artifacts");

    app.get("/artifacts", async (req, res) => {
      const result = await artifactsCollection.find().toArray();
      res.send(result);
    });

    app.get("/artifacts/:id", async (req, res) => {
      const artifactId = req.params.id;
      const filter = { _id: new ObjectId(artifactId) };
      const artifact = await artifactsCollection.findOne(filter);
      res.send(artifact);
    });

    app.get(
      "/artifacts/myCollection/:email",
      verifyFirebaseToken,
      verifyEmail,
      async (req, res) => {
        try {
          const email = req.params.email;
          if (!email) {
            return res
              .status(400)
              .json({ error: "Email parameter is required" });
          }

          const filter = { "addedBy.email": email };
          const myArtifacts = await artifactsCollection.find(filter).toArray();

          res.status(200).json(myArtifacts);
        } catch (error) {
          console.error("Error fetching user artifacts:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      }
    );
    app.post("/artifacts", verifyFirebaseToken, async (req, res) => {
      try {
        if (req.body.addedBy?.email !== req.decoded.email) {
          return res.status(403).send({ error: "Forbidden: Email mismatch" });
        }

        const result = await artifactsCollection.insertOne(req.body);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding artifact:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    app.delete("/artifacts/:id", verifyFirebaseToken, async (req, res) => {
      const artifactId = req.params.id;
      if (!ObjectId.isValid(artifactId)) {
        return res.status(400).json({ error: "Invalid artifact ID format" });
      }

      const filter = { _id: new ObjectId(artifactId) };
      const existingArtifact = await artifactsCollection.findOne(filter);

      if (!existingArtifact) {
        return res.status(404).json({ error: "Artifact not found" });
      }

      if (existingArtifact.addedBy.email !== req.decoded.email) {
        return res
          .status(403)
          .json({ error: "Forbidden: Can only delete your own artifacts" });
      }

      const result = await artifactsCollection.deleteOne(filter);
      res.send(result);
    });

    app.patch("/like/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const email = req.decoded.email;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid artifact ID" });
      }

      const filter = { _id: new ObjectId(id) };
      const artifact = await artifactsCollection.findOne(filter);

      if (!artifact) {
        return res.status(404).json({ error: "Artifact not found" });
      }

      const alreadyLiked = artifact.likedBy?.includes(email);
      const updateDoc = alreadyLiked
        ? { $pull: { likedBy: email }, $inc: { likeCount: -1 } }
        : { $addToSet: { likedBy: email }, $inc: { likeCount: 1 } };

      await artifactsCollection.updateOne(filter, updateDoc);
      res.send({ liked: !alreadyLiked });
    });
    app.put("/artifacts/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const artifactId = req.params.id;
        const updatedArtifact = req.body;

        if (!ObjectId.isValid(artifactId)) {
          return res.status(400).json({ error: "Invalid artifact ID format" });
        }

        const existingArtifact = await artifactsCollection.findOne({
          _id: new ObjectId(artifactId),
        });
        if (!existingArtifact) {
          return res.status(404).json({ error: "Artifact not found" });
        }
        if (existingArtifact.addedBy.email !== req.decoded.email) {
          return res.status(403).json({
            error: "Forbidden: You can only update your own artifacts",
          });
        }

        if (!updatedArtifact || Object.keys(updatedArtifact).length === 0) {
          return res
            .status(400)
            .json({ error: "Request body cannot be empty" });
        }

        const requiredFields = [
          "name",
          "imageUrl",
          "type",
          "historicalContext",
          "shortDescription",
        ];
        for (const field of requiredFields) {
          if (!updatedArtifact[field]) {
            return res.status(400).json({ error: `${field} is required` });
          }
        }

        const filter = { _id: new ObjectId(artifactId) };
        const updateDoc = {
          $set: {
            ...updatedArtifact,
            updatedAt: new Date(),
          },
        };

        const result = await artifactsCollection.updateOne(filter, updateDoc);
        const updatedDoc = await artifactsCollection.findOne(filter);

        res.json({
          message: "Artifact updated successfully",
          artifact: updatedDoc,
        });
      } catch (error) {
        console.error("Error updating artifact:", error);
        res.status(500).json({
          error: "Internal server error",
          details: error.message,
        });
      }
    });
    app.patch("/like/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const email = req.body.email;

      const filter = { _id: new ObjectId(id) };
      const artifact = await artifactsCollection.findOne(filter);
      const alreadyLiked = artifact.likedBy?.includes(email);
      const updateDoc = alreadyLiked
        ? {
            $pull: {
              likedBy: email,
            },
            $inc: { likeCount: -1 },
          }
        : {
            $addToSet: {
              likedBy: email,
            },
            $inc: { likeCount: 1 },
          };
      const result = await artifactsCollection.updateOne(filter, updateDoc);
      res.send({ liked: !alreadyLiked });
    });

    app.get("/search-artifacts", async (req, res) => {
      try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
          return res.status(400).json({ error: "Search query is required" });
        }

        const searchResults = await artifactsCollection
          .find({
            $or: [
              { name: { $regex: searchQuery, $options: "i" } },
              { type: { $regex: searchQuery, $options: "i" } },
              { shortDescription: { $regex: searchQuery, $options: "i" } },
              { historicalContext: { $regex: searchQuery, $options: "i" } },
              { presentLocation: { $regex: searchQuery, $options: "i" } },
            ],
          })
          .toArray();

        res.status(200).json(searchResults);
      } catch (error) {
        console.error("Error searching artifacts:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get(
      "/artifacts/likedBy/:email",
      verifyFirebaseToken,
      verifyEmail,
      async (req, res) => {
        const email = req.params.email;
        const filter = { likedBy: email };
        const likedArtifacts = await artifactsCollection.find(filter).toArray();
        res.send(likedArtifacts);
      }
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Artifacts is running in port : ${port}`);
});
