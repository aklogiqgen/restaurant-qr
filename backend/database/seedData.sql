-- Seed Data for Hotel Restaurant Database
-- Clear existing data
TRUNCATE TABLE menu_items RESTART IDENTITY CASCADE;

-- Insert Menu Items
-- APPETIZERS
INSERT INTO menu_items (name, description, price, category, image, available, rating, prep_time, is_veg, spice_level, popular, chef_special) VALUES
('Caesar Salad', 'Crisp romaine lettuce, parmesan cheese, croutons, and creamy Caesar dressing', 249.00, 'appetizer', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=500&q=80', true, 4.5, 8, true, 0, true, false),
('Crispy Spring Rolls', 'Golden fried rolls filled with fresh vegetables and aromatic herbs', 199.00, 'appetizer', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&q=80', true, 4.3, 10, true, 1, false, false),
('Garlic Bread Sticks', 'Freshly baked bread sticks with garlic butter and herbs', 149.00, 'appetizer', 'https://images.unsplash.com/photo-1573140401552-3fab0b24f5c6?w=500&q=80', true, 4.6, 6, true, 0, true, false),
('Chicken Wings', 'Spicy buffalo wings served with ranch dip and celery sticks', 329.00, 'appetizer', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500&q=80', true, 4.7, 12, false, 2, true, false),
('Bruschetta', 'Toasted bread topped with fresh tomatoes, basil, and mozzarella', 229.00, 'appetizer', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=500&q=80', true, 4.4, 8, true, 0, false, false);

-- MAIN COURSE
INSERT INTO menu_items (name, description, price, category, image, available, rating, prep_time, is_veg, spice_level, popular, chef_special) VALUES
('Margherita Pizza', 'Classic Italian pizza with fresh tomatoes, mozzarella, and basil', 349.00, 'main', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80', true, 4.8, 18, true, 0, true, true),
('BBQ Chicken Pizza', 'Smoky BBQ sauce, grilled chicken, onions, and melted cheese', 429.00, 'main', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', true, 4.7, 20, false, 1, true, false),
('Vegetable Biryani', 'Fragrant basmati rice cooked with mixed vegetables and aromatic spices', 299.00, 'main', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', true, 4.6, 22, true, 2, true, false),
('Chicken Tikka Masala', 'Tender chicken in creamy tomato-based curry with aromatic spices', 389.00, 'main', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', true, 4.9, 25, false, 2, true, true),
('Paneer Butter Masala', 'Cottage cheese cubes in rich, creamy tomato gravy', 329.00, 'main', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80', true, 4.7, 20, true, 1, true, false),
('Grilled Salmon', 'Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables', 599.00, 'main', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=80', true, 4.8, 22, false, 0, false, true),
('Pasta Alfredo', 'Creamy fettuccine pasta with parmesan and garlic', 319.00, 'main', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&q=80', true, 4.5, 16, true, 0, false, false),
('Lamb Rogan Josh', 'Slow-cooked lamb in aromatic Kashmiri curry', 499.00, 'main', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80', true, 4.8, 28, false, 3, false, true);

-- DESSERTS
INSERT INTO menu_items (name, description, price, category, image, available, rating, prep_time, is_veg, spice_level, popular, chef_special) VALUES
('Chocolate Lava Cake', 'Warm chocolate cake with molten chocolate center, served with vanilla ice cream', 199.00, 'dessert', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=80', true, 4.9, 12, true, 0, true, false),
('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 229.00, 'dessert', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80', true, 4.7, 8, true, 0, true, false),
('Gulab Jamun', 'Soft milk dumplings soaked in sweet rose-flavored syrup', 129.00, 'dessert', 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500&q=80', true, 4.6, 5, true, 0, false, false),
('Cheesecake', 'Creamy New York style cheesecake with berry compote', 249.00, 'dessert', 'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=500&q=80', true, 4.8, 10, true, 0, false, true),
('Ice Cream Sundae', 'Three scoops of premium ice cream with toppings and hot fudge', 179.00, 'dessert', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80', true, 4.5, 6, true, 0, false, false);

-- BEVERAGES
INSERT INTO menu_items (name, description, price, category, image, available, rating, prep_time, is_veg, spice_level, popular, chef_special) VALUES
('Fresh Lime Soda', 'Refreshing lime juice with soda and mint', 89.00, 'beverage', 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80', true, 4.4, 4, true, 0, false, false),
('Mango Smoothie', 'Thick and creamy mango smoothie made with fresh mangoes', 129.00, 'beverage', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=500&q=80', true, 4.7, 5, true, 0, true, false),
('Cappuccino', 'Classic Italian coffee with steamed milk foam', 119.00, 'beverage', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&q=80', true, 4.6, 5, true, 0, false, false),
('Iced Tea', 'Chilled black tea with lemon and fresh mint', 99.00, 'beverage', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80', true, 4.3, 4, true, 0, false, false),
('Chocolate Milkshake', 'Rich and creamy chocolate milkshake topped with whipped cream', 149.00, 'beverage', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80', true, 4.8, 6, true, 0, true, false),
('Fresh Orange Juice', 'Freshly squeezed orange juice, no added sugar', 109.00, 'beverage', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80', true, 4.5, 4, true, 0, false, false),
('Masala Chai', 'Traditional Indian spiced tea with milk', 69.00, 'beverage', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80', true, 4.6, 5, true, 1, false, false);

-- Verify insertion
SELECT category, COUNT(*) as count FROM menu_items GROUP BY category ORDER BY category;
