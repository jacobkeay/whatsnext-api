const admin = require("firebase-admin");

module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ success: false, msg: "Unauthorized." });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      return admin
        .firestore()
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle;
      req.user.userId = data.docs[0].data().userId;
      return next();
    })
    .catch(err => {
      console.error("Error while verifying token ", err);
      if (err.code === "auth/id-token-expired") {
        res.status(403).json({
          success: false,
          msg: "Your ID Token has expired, please log back in.",
        });
      }
      return res.status(403).json(err);
    });
};
