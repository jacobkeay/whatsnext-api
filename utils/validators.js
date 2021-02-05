const isEmpty = string => {
  return string.trim() === "";
};

const isEmail = string => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return string.match(emailRegEx);
};

exports.validateSignupData = data => {
  console.log("Validating signup data");
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty.";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(data.password)) {
    errors.password = "Must not be empty";
  } else if (data.password.length < 6) {
    errors.password = "Must be at least 6 characters long";
  }

  if (isEmpty(data.handle)) {
    errors.handle = "Must not be empty";
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords must match";
  }

  return {
    errors,
    valid: Object.keys(errors).length > 0 ? false : true,
  };
};

exports.validateLoginData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty.";
  }

  if (isEmpty(data.password)) {
    errors.password = "Must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length > 0 ? false : true,
  };
};

exports.reduceUserDetails = data => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;

  if (!isEmpty(data.website.trim())) {
    // https://website.com
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;

    if (!isEmpty(data.location.trim())) userDetails.location = data.location;

    return userDetails;
  }
};
