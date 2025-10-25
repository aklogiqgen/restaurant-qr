const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Initialize PostgreSQL database by running schema.sql
 * This will create all tables, indexes, triggers, and views
 */
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('[INFO] Starting database initialization...');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('[OK] Database schema created successfully');

    // Check if menu items exist
    const result = await client.query('SELECT COUNT(*) FROM menu_items');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log('[INFO] No menu items found. Run seed script to populate data.');
    } else {
      console.log(`[OK] Found ${count} menu items in database`);
    }

    return true;
  } catch (error) {
    console.error('[ERROR] Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed menu items from seedData.js
 */
async function seedMenuItems() {
  const client = await pool.connect();

  try {
    console.log('[INFO] Starting menu items seeding...');

    // Clear existing menu items
    await client.query('TRUNCATE TABLE menu_items RESTART IDENTITY CASCADE');

    // Load seed data
    const menuData = require('../seedData');

    // Insert each menu item
    const insertQuery = `
      INSERT INTO menu_items (
        name, description, price, category, image, available,
        rating, prep_time, is_veg, spice_level, popular, chef_special
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    for (const item of menuData) {
      await client.query(insertQuery, [
        item.name,
        item.description,
        item.price,
        item.category,
        item.image,
        item.available !== undefined ? item.available : true,
        item.rating || 4.5,
        item.prepTime || 15,
        item.isVeg !== undefined ? item.isVeg : true,
        item.spiceLevel || 0,
        item.popular || false,
        item.chefSpecial || false
      ]);
    }

    console.log(`[OK] Successfully seeded ${menuData.length} menu items`);
    return true;
  } catch (error) {
    console.error('[ERROR] Menu seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[OK] Database connection successful');
    console.log('[INFO] Current timestamp:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[ERROR] Database connection failed:', error);
    return false;
  }
}

// If run directly, execute initialization
if (require.main === module) {
  (async () => {
    try {
      await testConnection();
      await initializeDatabase();
      await seedMenuItems();
      console.log('\n[SUCCESS] Database initialization completed!');
      process.exit(0);
    } catch (error) {
      console.error('\n[FAILED] Database initialization failed!');
      process.exit(1);
    }
  })();
}

module.exports = {
  initializeDatabase,
  seedMenuItems,
  testConnection
};
