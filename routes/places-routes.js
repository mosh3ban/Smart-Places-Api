const { check } = require('express-validator');
const {
  getPlaceByID,
  postNewPlace,
  getPlacesByCreatorID,
  updatePlaceByID,
  deletePlaceByID,
} = require('../controllers/place-controllers');
const auth = require('../middleware/auth');
const fileUpload = require('../middleware/file-upload');
const placesRouter = require('express').Router();

// find place by place id
placesRouter.get('/:pid', getPlaceByID);

// find places by user id
placesRouter.get('/user/:uid', getPlacesByCreatorID);

placesRouter.use(auth);
// create new place
placesRouter.post(
  '/',
  fileUpload.single('image'),
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').not().isEmpty(),
  ],
  postNewPlace
);

// update place by id

placesRouter.patch(
  '/:pid',
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('image').not().isEmpty(),
  ],
  updatePlaceByID
);

// delete place by id

placesRouter.delete('/:pid', deletePlaceByID);

module.exports = placesRouter;
