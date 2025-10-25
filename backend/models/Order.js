const { query, getClient } = require('../config/database');

class Order {
  /**
   * Create new order with items
   * @param {Object} orderData - Order data (tableNo, items, total, estimatedTime)
   * @returns {Object} Created order with items
   */
  static async create(orderData) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Insert order
      const orderQuery = `
        INSERT INTO orders (table_no, total, status, estimated_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderData.tableNo,
        orderData.total,
        orderData.status || 'pending',
        orderData.estimatedTime || 20
      ]);

      const order = orderResult.rows[0];

      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const itemQuery = `
          INSERT INTO order_items (order_id, name, price, quantity, category, image, prep_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const items = [];
        for (const item of orderData.items) {
          const itemResult = await client.query(itemQuery, [
            order.id,
            item.name,
            item.price,
            item.quantity || 1,
            item.category,
            item.image,
            item.prepTime || item.prep_time || 15
          ]);
          items.push(itemResult.rows[0]);
        }

        order.items = items;
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Order.create:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find order by ID with items
   * @param {number} id - Order ID
   * @returns {Object|null} Order with items or null
   */
  static async findById(id) {
    try {
      // Get order
      const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
        [id]
      );

      order.items = itemsResult.rows;
      return order;
    } catch (error) {
      console.error('[ERROR] Order.findById:', error);
      throw error;
    }
  }

  /**
   * Find all orders with optional filtering
   * @param {Object} filters - Filter options (status, tableNo)
   * @returns {Array} Array of orders with items
   */
  static async findAll(filters = {}) {
    try {
      let queryText = 'SELECT * FROM orders WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.status) {
        queryText += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters.tableNo) {
        queryText += ` AND table_no = $${paramCount}`;
        params.push(filters.tableNo);
        paramCount++;
      }

      queryText += ' ORDER BY created_at DESC';

      const ordersResult = await query(queryText, params);
      const orders = ordersResult.rows;

      // Get items for each order
      for (const order of orders) {
        const itemsResult = await query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );
        order.items = itemsResult.rows;
      }

      return orders;
    } catch (error) {
      console.error('[ERROR] Order.findAll:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {number} id - Order ID
   * @param {string} status - New status
   * @returns {Object} Updated order
   */
  static async updateStatus(id, status) {
    try {
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const queryText = `
        UPDATE orders
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await query(queryText, [status, id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('[ERROR] Order.updateStatus:', error);
      throw error;
    }
  }

  /**
   * Update order
   * @param {number} id - Order ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated order
   */
  static async update(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramCount = 1;

      if (data.tableNo !== undefined) {
        fields.push(`table_no = $${paramCount++}`);
        params.push(data.tableNo);
      }
      if (data.total !== undefined) {
        fields.push(`total = $${paramCount++}`);
        params.push(data.total);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        params.push(data.status);
      }
      if (data.estimatedTime !== undefined) {
        fields.push(`estimated_time = $${paramCount++}`);
        params.push(data.estimatedTime);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);
      const queryText = `
        UPDATE orders
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      console.error('[ERROR] Order.update:', error);
      throw error;
    }
  }

  /**
   * Delete order
   * @param {number} id - Order ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Order items will be deleted automatically due to CASCADE
      const result = await query('DELETE FROM orders WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('[ERROR] Order.delete:', error);
      throw error;
    }
  }

  /**
   * Get orders by table number
   * @param {number} tableNo - Table number
   * @returns {Array} Orders for the table
   */
  static async findByTable(tableNo) {
    try {
      return await this.findAll({ tableNo });
    } catch (error) {
      console.error('[ERROR] Order.findByTable:', error);
      throw error;
    }
  }

  /**
   * Get recent orders (last N orders)
   * @param {number} limit - Number of orders to fetch
   * @returns {Array} Recent orders
   */
  static async getRecent(limit = 10) {
    try {
      const ordersResult = await query(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      const orders = ordersResult.rows;

      // Get items for each order
      for (const order of orders) {
        const itemsResult = await query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );
        order.items = itemsResult.rows;
      }

      return orders;
    } catch (error) {
      console.error('[ERROR] Order.getRecent:', error);
      throw error;
    }
  }

  /**
   * Count orders
   * @param {Object} filters - Filter options
   * @returns {number} Total count
   */
  static async count(filters = {}) {
    try {
      let queryText = 'SELECT COUNT(*) FROM orders WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.status) {
        queryText += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters.tableNo) {
        queryText += ` AND table_no = $${paramCount}`;
        params.push(filters.tableNo);
      }

      const result = await query(queryText, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('[ERROR] Order.count:', error);
      throw error;
    }
  }
}

module.exports = Order;
