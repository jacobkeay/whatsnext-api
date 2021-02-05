const express = require("express");
const router = express.Router();
const firebase = require("firebase");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../utils/validators");
const firebaseConfig = require("../firebase/config");
const fbAuth = require("../utils/fbAuth");

// @desc    Register new user
// @route   POST /api/user/signup
// @access  Public
router.post("/signUp", async (req, res, next) => {
  try {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
    };

    // Validate data
    const { valid, errors } = validateSignupData(newUser);

    if (!valid) {
      return res.status(400).json({ success: false, ...errors });
    }

    // Check unique attributes
    let token = "";
    let userId = "";
    const doc = await admin.firestore().doc(`/users/${newUser.handle}`).get();
    if (doc.exists) {
      return res
        .status(400)
        .json({ success: false, handle: "This handle is already taken" });
    } else {
      // Create user
      const data = await firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);

      userId = data.user.uid;
      token = await data.user.getIdToken();

      // Save user to database
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };

      await admin
        .firestore()
        .doc(`/users/${newUser.handle}`)
        .set(userCredentials);

      return res.status(201).json({
        success: true,
        msg: `User ${data.user.uid} signed up successfully!`,
        token,
      });
    }
  } catch (err) {
    console.log(err);
    if (err.code === "auth/email-already-in-use") {
      return res
        .status(400)
        .json({ success: false, email: "Email is already in use" });
    }
    return res.status(500).json({
      success: false,
      msg: err.code,
    });
  }
});

// @desc    User login
// @route   POST /api/user/login
// @access  Public
router.post("/login", async (req, res, next) => {
  try {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };

    // Validate data
    const { valid, errors } = validateLoginData(user);

    if (!valid) {
      return res.status(400).json({ success: false, ...errors });
    }

    const data = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password);
    const token = await data.user.getIdToken();

    return res.status(200).json({ success: true, token });
  } catch (err) {
    if (
      err.code === "auth/wrong-password" ||
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-email"
    ) {
      return res.status(403).json({
        success: false,
        general: "Wrong credentials, please try again.",
      });
    }
    return res.status(500).json({
      success: false,
      msg: err.code,
    });
  }
});

// @desc    Get user details
// @route   GET /api/user
// @access  Protected
router.get("/", fbAuth, async (req, res, next) => {
  try {
    let userData = {};

    const doc = await admin.firestore().doc(`/users/${req.user.handle}`).get();

    if (doc.exists) {
      userData.credentials = doc.data();
      const data = await admin
        .firestore()
        .collection("likes")
        .where("userHandle", "==", req.user.handle)
        .get();

      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return res.status(200).json({ success: true, userData });
    } else {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: err.code });
  }
});

// @desc    Add user details
// @route   POST /api/user
// @access  Protected
router.post("/", fbAuth, async (req, res, next) => {
  try {
    let userDetails = reduceUserDetails(req.body);

    await admin
      .firestore()
      .doc(`/users/${req.user.handle}`)
      .update(userDetails);

    res.status(200).json({ success: true, msg: "Details added successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: err.code });
  }
});

// @desc    User image upload
// @route   POST /api/user/image
// @access  Protected
router.post("/image", fbAuth, async (req, res, next) => {
  try {
    let imageFileName;
    let imageToBeUploaded;

    req.pipe(req.busboy);

    req.busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res
          .status(400)
          .json({ success: false, error: "File type must be .png or .jpeg" });
      }
      const imageExtension = filename
        .split(".")
        [filename.split(".").length - 1].toLowerCase();
      imageFileName = `${Math.round(
        Math.random() * 1000000000
      )}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    req.busboy.on("finish", async () => {
      await admin
        .storage()
        .bucket(firebaseConfig.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        });

      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
      await admin
        .firestore()
        .doc(`/users/${req.user.handle}`)
        .update({ imageUrl });

      res
        .status(200)
        .json({ success: true, msg: "Image uploaded successfully" });
      req.busboy.end(req.rawBody);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: err.code });
  }
});

module.exports = router;
