-- Hotel Restaurant Database Schema for PostgreSQL
-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;

-- Create Menu Items Table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage')),
    image VARCHAR(500),
    available BOOLEAN DEFAULT true,
    rating DECIMAL(3, 2) DEFAULT 4.5,
    prep_time INTEGER, -- in minutes
    is_veg BOOLEAN DEFAULT true,
    spice_level INTEGER DEFAULT 0 CHECK (spice_level >= 0 AND spice_level <= 5),
    popular BOOLEAN DEFAULT false,
    chef_special BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    table_no INTEGER NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
    estimated_time INTEGER DEFAULT 20, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items Table (for order items relationship)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(50),
    image VARCHAR(500),
    prep_time INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(available);
CREATE INDEX idx_orders_table_no ON orders(table_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for orders with items (optional - for easier querying)
CREATE OR REPLACE VIEW orders_with_items AS
SELECT
    o.id,
    o.table_no,
    o.total,
    o.status,
    o.estimated_time,
    o.created_at,
    o.updated_at,
    json_agg(
        json_build_object(
            'id', oi.id,
            'name', oi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'category', oi.category,
            'image', oi.image,
            'prepTime', oi.prep_time
        )
    ) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.table_no, o.total, o.status, o.estimated_time, o.created_at, o.updated_at;

COMMENT ON TABLE menu_items IS 'Restaurant menu items with details';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE order_items IS 'Individual items in each order';
COMMENT ON VIEW orders_with_items IS 'Complete order information with all items';
