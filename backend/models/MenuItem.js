const { query } = require('../config/database');

class MenuItem {
  /**
   * Get all menu items with optional filtering
   * @param {Object} filters - Filter options (category, available)
   * @returns {Array} Array of menu items
   */
  static async findAll(filters = {}) {
    try {
      let queryText = 'SELECT * FROM menu_items WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.category) {
        queryText += ` AND category = $${paramCount}`;
        params.push(filters.category);
        paramCount++;
      }

      if (filters.available !== undefined) {
        queryText += ` AND available = $${paramCount}`;
        params.push(filters.available);
        paramCount++;
      }

      queryText += ' ORDER BY popular DESC, rating DESC, name ASC';

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('[ERROR] MenuItem.findAll:', error);
      throw error;
    }
  }

  /**
   * Get menu item by ID
   * @param {number} id - Menu item ID
   * @returns {Object|null} Menu item or null
   */
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM menu_items WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[ERROR] MenuItem.findById:', error);
      throw error;
    }
  }

  /**
   * Create new menu item
   * @param {Object} data - Menu item data
   * @returns {Object} Created menu item
   */
  static async create(data) {
    try {
      const queryText = `
        INSERT INTO menu_items (
          name, description, price, category, image, available,
          rating, prep_time, is_veg, spice_level, popular, chef_special
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const params = [
        data.name,
        data.description,
        data.price,
        data.category,
        data.image,
        data.available !== undefined ? data.available : true,
        data.rating || 4.5,
        data.prepTime || 15,
        data.isVeg !== undefined ? data.isVeg : true,
        data.spiceLevel || 0,
        data.popular || false,
        data.chefSpecial || false
      ];

      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      console.error('[ERROR] MenuItem.create:', error);
      throw error;
    }
  }

  /**
   * Update menu item
   * @param {number} id - Menu item ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated menu item
   */
  static async update(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramCount = 1;

      // Dynamically build update query based on provided fields
      if (data.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        params.push(data.name);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        params.push(data.description);
      }
      if (data.price !== undefined) {
        fields.push(`price = $${paramCount++}`);
        params.push(data.price);
      }
      if (data.category !== undefined) {
        fields.push(`category = $${paramCount++}`);
        params.push(data.category);
      }
      if (data.image !== undefined) {
        fields.push(`image = $${paramCount++}`);
        params.push(data.image);
      }
      if (data.available !== undefined) {
        fields.push(`available = $${paramCount++}`);
        params.push(data.available);
      }
      if (data.rating !== undefined) {
        fields.push(`rating = $${paramCount++}`);
        params.push(data.rating);
      }
      if (data.prepTime !== undefined) {
        fields.push(`prep_time = $${paramCount++}`);
        params.push(data.prepTime);
      }
      if (data.isVeg !== undefined) {
        fields.push(`is_veg = $${paramCount++}`);
        params.push(data.isVeg);
      }
      if (data.spiceLevel !== undefined) {
        fields.push(`spice_level = $${paramCount++}`);
        params.push(data.spiceLevel);
      }
      if (data.popular !== undefined) {
        fields.push(`popular = $${paramCount++}`);
        params.push(data.popular);
      }
      if (data.chefSpecial !== undefined) {
        fields.push(`chef_special = $${paramCount++}`);
        params.push(data.chefSpecial);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);
      const queryText = `
        UPDATE menu_items
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      console.error('[ERROR] MenuItem.update:', error);
      throw error;
    }
  }

  /**
   * Delete menu item
   * @param {number} id - Menu item ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      const result = await query('DELETE FROM menu_items WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('[ERROR] MenuItem.delete:', error);
      throw error;
    }
  }

  /**
   * Count total menu items
   * @returns {number} Total count
   */
  static async count(filters = {}) {
    try {
      let queryText = 'SELECT COUNT(*) FROM menu_items WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.category) {
        queryText += ` AND category = $${paramCount}`;
        params.push(filters.category);
        paramCount++;
      }

      if (filters.available !== undefined) {
        queryText += ` AND available = $${paramCount}`;
        params.push(filters.available);
      }

      const result = await query(queryText, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('[ERROR] MenuItem.count:', error);
      throw error;
    }
  }
}

module.exports = MenuItem;
