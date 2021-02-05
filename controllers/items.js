const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const fbAuth = require("../utils/fbAuth");

// @desc    Get all items
// @route   GET /api/items
// @access  Protected
router.get("/", fbAuth, async (req, res, next) => {
  try {
    const data = await admin
      .firestore()
      .collection("items")
      .orderBy("createdAt", "desc")
      .where("userId", "==", req.user.userId)
      .get();
    const items = [];
    data.forEach(doc => {
      items.push({
        itemId: doc.id,
        userId: doc.data().userId,
        body: doc.data().body,
        createdAt: doc.data().createdAt,
      });
    });

    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.code });
  }
});

// @desc    Add item
// @route   POST /api/items
// @access  Protected
router.post("/", fbAuth, async (req, res, next) => {
  try {
    const { body } = req.body;

    const newItem = {
      body,
      userId: req.user.userId,
      createdAt: new Date().toISOString(),
    };

    const doc = await admin.firestore().collection("items").add(newItem);

    const resItem = newItem;
    resItem.itemId = doc.id;

    return res.status(201).json({
      success: true,
      data: resItem,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.code });
  }
});

// @desc    Update item
// @route   PUT /api/items/:postId
// @access  Protected
router.put("/:itemId", fbAuth, async (req, res, next) => {
  try {
    const { body } = req.body;

    const doc = await admin
      .firestore()
      .doc(`/items/${req.params.itemId}`)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, msg: "Post not found." });
    }

    await admin.firestore().doc(`/items/${req.params.itemId}`).update({ body });

    return res.status(200).json({
      success: true,
      msg: `Post ${req.params.itemId} updated successfully!`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.code });
  }
});

// @desc    Delete item
// @route   GET /api/items/:itemId
// @access  Protected
router.delete("/:itemId", fbAuth, async (req, res, next) => {
  const doc = await admin.firestore().doc(`/items/${req.params.itemId}`).get();

  if (!doc.exists) {
    return res.status(404).json({ success: false, msg: "Item not found." });
  }

  if (doc.data().userId !== req.user.userId) {
    return res.status(403).json({ success: false, msg: "Unauthorised." });
  }

  await admin.firestore().doc(`/items/${req.params.itemId}`).delete();

  res.status(200).json({ success: true, msg: "Item deleted successfully." });
});

module.exports = router;
