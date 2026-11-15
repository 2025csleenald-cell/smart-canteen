const ALL = ['morning', 'afternoon', 'evening'];
const d = (name, price, category, emoji, prepTimeMins, stationType, slots) => ({ name, price, category, emoji, prepTimeMins, stationType, slots });

// Sample Indian canteen menu. Prices are examples: change them in the admin Menu page.
module.exports = [
  // Morning
  d('Idli vada', 35, 'Meals', '🍚', 5, 'general', ['morning']),
  d('Masala dosa', 50, 'Meals', '🥞', 8, 'grill', ['morning']),
  d('Poori sagu', 45, 'Meals', '🫓', 7, 'general', ['morning']),
  d('Upma', 30, 'Meals', '🥣', 5, 'general', ['morning']),
  d('Khara bath and kesari bath', 40, 'Meals', '🥣', 5, 'general', ['morning']),
  d('Pongal', 35, 'Meals', '🥣', 5, 'general', ['morning']),
  d('Filter coffee', 25, 'Drinks', '☕', 3, 'juice', ['morning', 'evening']),
  d('Tea', 15, 'Drinks', '🍵', 3, 'juice', ALL),
  // Afternoon
  d('Veg thali', 110, 'Meals', '🍱', 10, 'general', ['afternoon']),
  d('Bisibele bath', 60, 'Meals', '🍛', 8, 'general', ['afternoon']),
  d('Curd rice', 40, 'Meals', '🍚', 5, 'general', ['afternoon']),
  d('Lemon rice', 45, 'Meals', '🍋', 6, 'general', ['afternoon']),
  d('Chapati with curry', 55, 'Meals', '🫓', 8, 'general', ['afternoon']),
  d('Paneer rice bowl', 90, 'Meals', '🍛', 12, 'general', ['afternoon']),
  d('Veg fried rice', 70, 'Meals', '🍛', 10, 'grill', ['afternoon']),
  d('Buttermilk', 20, 'Drinks', '🥛', 2, 'juice', ['afternoon']),
  d('Fresh juice', 40, 'Drinks', '🍹', 4, 'juice', ['afternoon', 'evening']),
  // Evening
  d('Samosa (2 pcs)', 20, 'Snacks', '🥟', 4, 'grill', ['evening']),
  d('Mirchi bajji', 25, 'Snacks', '🌶️', 5, 'grill', ['evening']),
  d('Gobi manchurian', 60, 'Snacks', '🥦', 8, 'grill', ['evening']),
  d('Masala fries', 50, 'Snacks', '🍟', 6, 'grill', ['evening']),
  d('Veg burger', 60, 'Snacks', '🍔', 8, 'grill', ['evening']),
  d('Veg puff', 20, 'Snacks', '🥐', 2, 'general', ['evening']),
  d('Masala chai', 15, 'Drinks', '🍵', 3, 'juice', ['evening']),
  d('Chocolate brownie', 45, 'Desserts', '🍰', 2, 'general', ['afternoon', 'evening'])
];