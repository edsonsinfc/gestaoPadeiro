/**
 * SQLite Database Wrapper - BRAGO Sistema Padeiro
 * Professional SQL implementation that doesn't require a server
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'sistema.sqlite');
const db = new sqlite3.Database(dbPath);

// Professional Config: Increase timeout to avoid 'database is locked'
db.configure('busyTimeout', 10000);

// Promisify SQLite methods
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

class SqliteCollection {
  constructor(name, tableName) {
    this.name = name;
    this.tableName = tableName;
    this.initTable();
  }

  async initTable() {
    // Tables are created in a separate init script, but we ensure they exist
  }

  wrapDoc(doc) {
    if (!doc) return null;
    if (Array.isArray(doc)) return doc.map(d => this.wrapDoc(d));
    return {
      ...doc,
      toJSON: function() { return this; },
      toObject: function() { return this; }
    };
  }

  buildWhere(query) {
    const keys = Object.keys(query);
    if (keys.length === 0) return { sql: '', values: [], postFilters: [] };
    const parts = [];
    const values = [];
    const postFilters = [];
    keys.forEach(key => {
      const val = query[key];
      if (val instanceof RegExp) {
        // SQLite doesn't support REGEXP natively, we'll filter in JS
        postFilters.push({ key, regex: val });
      } else if (typeof val === 'object' && val !== null) {
        if (val.$gte) { parts.push(`\`${key}\` >= ?`); values.push(val.$gte); }
        if (val.$lte) { parts.push(`\`${key}\` <= ?`); values.push(val.$lte); }
        if (val.$in) { 
          const placeholders = val.$in.map(() => '?').join(',');
          parts.push(`\`${key}\` IN (${placeholders})`); 
          values.push(...val.$in); 
        }
      } else {
        parts.push(`\`${key}\` = ?`);
        values.push(val);
      }
    });
    return { 
      sql: parts.length > 0 ? ' WHERE ' + parts.join(' AND ') : '', 
      values,
      postFilters
    };
  }

  find(query = {}) {
    let sql = `SELECT * FROM \`${this.tableName}\``;
    let where = this.buildWhere(query);
    let orderBy = '';
    let limitClause = '';
    const chain = {
      sort: (options) => {
        const key = Object.keys(options)[0];
        const dir = options[key] === -1 ? 'DESC' : 'ASC';
        orderBy = ` ORDER BY \`${key}\` ${dir}`;
        return chain;
      },
      select: () => chain,
      limit: (n) => {
        limitClause = ` LIMIT ${n}`;
        return chain;
      },
      then: async (resolve) => {
        // If we have post-filters, we can't apply LIMIT/ORDER BY in SQL reliably
        const finalSql = sql + where.sql + (where.postFilters.length > 0 ? '' : orderBy + limitClause);
        let rows = await all(finalSql, where.values);
        
        // Apply post-filters (RegExp)
        if (where.postFilters.length > 0) {
          rows = rows.filter(row => {
            return where.postFilters.every(f => {
              const val = row[f.key];
              if (val === null || val === undefined) return false;
              return f.regex.test(val.toString());
            });
          });

          // Apply sort and limit in JS if they were skipped in SQL
          if (orderBy) {
            const match = orderBy.match(/ORDER BY `(.+?)` (ASC|DESC)/);
            if (match) {
              const [_, key, dir] = match;
              rows.sort((a, b) => {
                if (a[key] < b[key]) return dir === 'ASC' ? -1 : 1;
                if (a[key] > b[key]) return dir === 'ASC' ? 1 : -1;
                return 0;
              });
            }
          }
          if (limitClause) {
            const match = limitClause.match(/LIMIT (\d+)/);
            if (match) {
              const limit = parseInt(match[1]);
              rows = rows.slice(0, limit);
            }
          }
        }
        
        resolve(this.wrapDoc(rows.map(r => this.parseRow(r))));
      }
    };
    return chain;
  }

  async findOne(query = {}) {
    const res = await this.find(query).limit(1);
    return res[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async getColumns() {
    if (this._columns) return this._columns;
    const rows = await all(`PRAGMA table_info(\`${this.tableName}\`)`);
    this._columns = rows.map(r => r.name);
    return this._columns;
  }

  async create(doc) {
    const columns = await this.getColumns();
    const id = doc.id || doc._id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const newDoc = { ...doc, id };
    delete newDoc._id;

    // Filter only existing columns
    const filteredKeys = Object.keys(newDoc).filter(k => columns.includes(k));
    const values = filteredKeys.map(k => typeof newDoc[k] === 'object' ? JSON.stringify(newDoc[k]) : newDoc[k]);
    const placeholders = filteredKeys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO \`${this.tableName}\` (\`${filteredKeys.join('`, `')}\`) VALUES (${placeholders})`;
    await run(sql, values);
    return this.wrapDoc(newDoc);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const columns = await this.getColumns();
    const updateData = { ...update };
    delete updateData._id;
    delete updateData.id;

    const filteredKeys = Object.keys(updateData).filter(k => columns.includes(k));
    if (filteredKeys.length === 0) return this.findById(id);

    const values = filteredKeys.map(k => typeof updateData[k] === 'object' ? JSON.stringify(updateData[k]) : updateData[k]);
    const setClause = filteredKeys.map(k => `\`${k}\` = ?`).join(', ');
    
    const sql = `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`id\` = ?`;
    const result = await run(sql, [...values, id]);
    
    if (result.changes === 0 && options.upsert) {
      return this.create({ ...updateData, id });
    }
    
    return this.findById(id);
  }

  async findByIdAndDelete(id) {
    const doc = await this.findById(id);
    if (!doc) return null;
    await run(`DELETE FROM \`${this.tableName}\` WHERE \`id\` = ?`, [id]);
    return doc;
  }

  async deleteMany(query = {}) {
    const where = this.buildWhere(query);
    const sql = `DELETE FROM \`${this.tableName}\`${where.sql}`;
    const result = await run(sql, where.values);
    return { deletedCount: result.changes };
  }

  async countDocuments(query = {}) {
    const where = this.buildWhere(query);
    const row = await get(`SELECT COUNT(*) as count FROM \`${this.tableName}\`${where.sql}`, where.values);
    return row.count;
  }

  parseRow(row) {
    if (!row) return null;
    const newRow = { ...row };
    for (const key in newRow) {
      if (typeof newRow[key] === 'string' && (newRow[key].startsWith('{') || newRow[key].startsWith('['))) {
        try { newRow[key] = JSON.parse(newRow[key]); } catch (e) {}
      }
    }
    return newRow;
  }
}

function createProxy(instance) {
  // Create a constructor function that supports `new Model(doc)`
  function ModelConstructor(doc = {}) {
    const self = {
      ...doc,
      save: async function() {
        if (this.id || this._id) {
          const updated = await instance.findByIdAndUpdate(this.id || this._id, this);
          if (updated) Object.assign(this, updated);
          return this;
        }
        const created = await instance.create(this);
        Object.assign(this, created);
        return this;
      },
      toJSON: function() {
        const copy = { ...this };
        delete copy.save; delete copy.toJSON; delete copy.toObject;
        return copy;
      },
      toObject: function() {
        const copy = { ...this };
        delete copy.save; delete copy.toJSON; delete copy.toObject;
        return copy;
      }
    };
    return self;
  }

  // Copy all static methods from the instance to the constructor
  ModelConstructor.find = (...args) => instance.find(...args);
  ModelConstructor.findOne = (...args) => instance.findOne(...args);
  ModelConstructor.findById = (...args) => instance.findById(...args);
  ModelConstructor.findByIdAndUpdate = (...args) => instance.findByIdAndUpdate(...args);
  ModelConstructor.findByIdAndDelete = (...args) => instance.findByIdAndDelete(...args);
  ModelConstructor.deleteMany = (...args) => instance.deleteMany(...args);
  ModelConstructor.countDocuments = (...args) => instance.countDocuments(...args);
  ModelConstructor.create = (...args) => instance.create(...args);

  return ModelConstructor;
}

module.exports = {
  Padeiro: createProxy(new SqliteCollection('Padeiro', 'padeiros')),
  Produto: createProxy(new SqliteCollection('Produto', 'produtos')),
  Cliente: createProxy(new SqliteCollection('Cliente', 'clientes')),
  Colaborador: createProxy(new SqliteCollection('Colaborador', 'colaboradores')),
  Admin: createProxy(new SqliteCollection('Admin', 'admins')),
  Meta: createProxy(new SqliteCollection('Meta', 'metas')),
  Atividade: createProxy(new SqliteCollection('Atividade', 'atividades')),
  Avaliacao: createProxy(new SqliteCollection('Avaliacao', 'avaliacoes')),
  Cronograma: createProxy(new SqliteCollection('Cronograma', 'cronogramas')),
  Criterio: createProxy(new SqliteCollection('Criterio', 'criterios')),
  Localizacao: createProxy(new SqliteCollection('Localizacao', 'localizacoes'))
};
