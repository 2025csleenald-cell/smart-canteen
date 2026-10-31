const router = require('express').Router();
const { MenuItem } = require('../models');
const { ah } = require('../middleware/auth');

router.get('/', ah(async (req, res) => {
  const filter = { available: true };
  if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
  res.json(await MenuItem.find(filter).sort({ category: 1, name: 1 }));
}));
module.exports = router;
