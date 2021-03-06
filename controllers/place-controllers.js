const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const placeModel = require('../models/placeModel');
const userModel = require('../models/userModel');
const { validationResult } = require('express-validator');
const fs = require('fs');

// get place by id function
const getPlaceByID = async (req, res, next) => {
  let place;
  try {
    const placeID = req.params.pid;
    place = await placeModel.findById(placeID);
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, Please try again later.',
      500
    );
    return next(error);
  }

  if (!place) {
    return next(
      new HttpError('Could not find a place with the provided id', 404)
    );
  }
  res.status(200).send(place);
};

// creating new place function
const postNewPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid Inputs, Please Check Your Data.', 422));
  }
  const { title, description, address, location } = req.body;
  const place = new placeModel({
    title,
    description,
    image: req.file.path,
    address,
    location,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await userModel.findById(creator);
  } catch (error) {
    return next(
      new HttpError('Could not add new place, please try again later', 500)
    );
  }
  if (!user) {
    return next(
      new HttpError('Could not find a user with the provided id', 404)
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.save({ session: sess });
    user.places.push(place);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'creating place failed, Please try again later.',
      500
    );
    return next(error);
  }
  res.status(200).send();
};

// getting place by creator id function
const getPlacesByCreatorID = async (req, res, next) => {
  let userWithPlaces;

  try {
    const userID = req.params.uid;
    userWithPlaces = await userModel.findById(userID).populate('places');
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, Please try again later.',
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError('Could not find a place with the provided id', 404)
    );
  }
  res.status(200).json({ places: userWithPlaces.places });
};

// update place by it's id function

const updatePlaceByID = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid Inputs, Please Check Your Data.', 422));
  }
  const pid = req.params.pid;
  const availableUpdates = ['title', 'description', 'image', 'address'];
  const requestKeys = Object.keys(req.body);
  const isValid = requestKeys.every((update) =>
    availableUpdates.includes(update)
  );
  if (!isValid) {
    return next(
      new HttpError('Invalid Updates, Please Valid it, Then update', 422)
    );
  }
  let place;

  try {
    place = await placeModel.findById(pid);
    requestKeys.forEach((update) => {
      place[update] = req.body[update];
    });
    if (place.creator.toString() !== req.userData.userId) {
      return next(new HttpError('You are not Allowed to edit this place', 401));
    }
    await place.save();
  } catch (err) {
    const error = new HttpError('error', 400);
    return next(error);
  }
  if (!place) {
    return next(
      new HttpError('Could not find a place with the provided id', 404)
    );
  }
  res.status(200).json(place);
};

// delete place by id function

const deletePlaceByID = async (req, res, next) => {
  let place;
  try {
    place = await placeModel.findById(req.params.pid).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Some thing Went Wrong, Please try again later.',
      500
    );
    return next(error);
  }
  if (!place) {
    return next(
      new HttpError('Could not find a place with the provided id', 404)
    );
  }
  if (place.creator.id !== req.userData.userId) {
    return next(new HttpError('You are not Allowed to edit this place', 401));
  }
  const imagePath = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError('Some thing Went Wrong, Please try again later.', 500)
    );
  }
  fs.unlink(imagePath);
  res.status(200).json({ message: 'Place Deleted.' });
};
module.exports = {
  getPlaceByID,
  postNewPlace,
  getPlacesByCreatorID,
  updatePlaceByID,
  deletePlaceByID,
};
