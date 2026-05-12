const fs = require('fs');
const path = require('path');
const { 
  Padeiro, Produto, Cliente, Colaborador, Admin, 
  Meta, Atividade, Avaliacao, Cronograma, Criterio 
} = require('./models');

const DATA_DIR = __dirname;

// Utility to generate IDs similar to MongoDB
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

class JsonCollection {
  constructor(name, model, filename) {
    this.name = name;
    this.model = model;
    this.filepath = path.join(DATA_DIR, filename);
    this.data = [];
    this.load();
  }

  load() {
    // If .db doesn't exist, try to migrate from .json
    if (!fs.existsSync(this.filepath)) {
      const jsonPath = this.filepath.replace('.db', '.json');
      if (fs.existsSync(jsonPath)) {
        console.log(`📦 Migrando ${this.name} de .json para .db...`);
        try {
          this.data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          this.save(); // Create the .db file
        } catch (e) {
          console.error(`Erro na migração de ${this.name}:`, e);
        }
      }
    }

    if (fs.existsSync(this.filepath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filepath, 'utf-8'));
      } catch (e) {
        console.error(`Error loading ${this.name}:`, e);
        this.data = [];
      }
    }
  }

  save() {
    fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
  }

  // Helper to make plain objects look like Mongoose documents
  wrapDoc(doc) {
    if (!doc) return null;
    if (Array.isArray(doc)) return doc.map(d => this.wrapDoc(d));
    
    return {
      ...doc,
      toJSON: function() { return this; },
      toObject: function() { return this; }
    };
  }

  find(query = {}) {
    let results = [...this.data];
    
    // Simple query support
    for (const key in query) {
      const val = query[key];
      if (val instanceof RegExp) {
        results = results.filter(item => val.test(item[key]));
      } else if (typeof val === 'object' && val !== null) {
        if (val.$gte) results = results.filter(item => item[key] >= val.$gte);
        if (val.$lte) results = results.filter(item => item[key] <= val.$lte);
        if (val.$in) results = results.filter(item => val.$in.includes(item[key]));
      } else {
        results = results.filter(item => {
          const itemVal = String(item[key] || '').trim().toLowerCase();
          const targetVal = String(val || '').trim().toLowerCase();
          return itemVal === targetVal;
        });
      }
    }
    
    const self = this;
    const chain = {
      results: this.wrapDoc(results),
      sort: (options) => {
        const key = Object.keys(options)[0];
        const dir = options[key];
        chain.results.sort((a, b) => {
          if (a[key] < b[key]) return - dir;
          if (a[key] > b[key]) return dir;
          return 0;
        });
        return chain;
      },
      select: () => chain,
      limit: (n) => {
        chain.results = chain.results.slice(0, n);
        return chain;
      },
      then: (resolve) => resolve(chain.results),
      catch: (reject) => reject()
    };

    return chain;
  }

  async findOne(query = {}) {
    const res = await this.find(query);
    return res[0] || null;
  }

  async findById(id) {
    const doc = this.data.find(item => item.id === id || item._id === id);
    return this.wrapDoc(doc);
  }

  async create(doc) {
    const newDoc = { ...doc };
    if (!newDoc.id && !newDoc._id) newDoc.id = generateId();
    if (!newDoc._id) newDoc._id = newDoc.id;
    
    this.data.push(newDoc);
    this.save();
    
    // Backup to MongoDB (Async)
    this.model.create(newDoc).catch(err => console.log(`Backup error (${this.name}):`, err.message));
    
    return this.wrapDoc(newDoc);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const index = this.data.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;
    
    this.data[index] = { ...this.data[index], ...update };
    this.save();
    
    // Backup to MongoDB (Async)
    this.model.findByIdAndUpdate(id, update).catch(err => console.log(`Backup error (${this.name}):`, err.message));
    
    return this.wrapDoc(this.data[index]);
  }

  async findByIdAndDelete(id) {
    const index = this.data.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;
    
    const removed = this.data.splice(index, 1)[0];
    this.save();
    
    // Backup to MongoDB (Async)
    this.model.findByIdAndDelete(id).catch(err => console.log(`Backup error (${this.name}):`, err.message));
    
    return this.wrapDoc(removed);
  }

  async deleteMany(query = {}) {
    // Only support empty query for reset all
    if (Object.keys(query).length === 0) {
      this.data = [];
      this.save();
      await this.model.deleteMany({});
    }
  }

  async countDocuments(query = {}) {
    const res = await this.find(query);
    return res.length;
  }

  async insertMany(docs) {
    docs.forEach(doc => {
      if (!doc.id && !doc._id) doc.id = generateId();
      if (!doc._id) doc._id = doc.id;
      this.data.push(doc);
    });
    this.save();
    await this.model.insertMany(docs);
  }

  // To support 'new Model(data)' syntax
  modelProxy(docData) {
    const parent = this;
    const doc = { ...docData };
    if (!doc.id && !doc._id) doc.id = generateId();
    if (!doc._id) doc._id = doc.id;

    return {
      ...doc,
      save: async function() {
        const index = parent.data.findIndex(item => item.id === doc.id || item._id === doc.id);
        if (index === -1) {
          parent.data.push(this);
        } else {
          parent.data[index] = { ...this };
        }
        parent.save();
        // Backup
        parent.model.create(this).catch(() => {});
        return this;
      },
      toObject: function() {
        const obj = { ...this };
        delete obj.save;
        delete obj.toObject;
        return obj;
      }
    };
  }
}

// Wrap classes to support constructor
function createProxy(dbInstance) {
  const proxy = function(data) { return dbInstance.modelProxy(data); };
  
  // Attach methods
  const methods = [
    'find', 'findOne', 'findById', 'create', 
    'findByIdAndUpdate', 'findByIdAndDelete', 
    'deleteMany', 'countDocuments', 'insertMany'
  ];
  
  methods.forEach(m => {
    proxy[m] = dbInstance[m].bind(dbInstance);
  });
  
  return proxy;
}

module.exports = {
  Padeiro: createProxy(new JsonCollection('Padeiro', Padeiro, 'padeiros.db')),
  Produto: createProxy(new JsonCollection('Produto', Produto, 'produtos.db')),
  Cliente: createProxy(new JsonCollection('Cliente', Cliente, 'clientes.db')),
  Colaborador: createProxy(new JsonCollection('Colaborador', Colaborador, 'colaboradores.db')),
  Admin: createProxy(new JsonCollection('Admin', Admin, 'admin.db')),
  Meta: createProxy(new JsonCollection('Meta', Meta, 'metas.db')),
  Atividade: createProxy(new JsonCollection('Atividade', Atividade, 'atividades.db')),
  Avaliacao: createProxy(new JsonCollection('Avaliacao', Avaliacao, 'avaliacoes.db')),
  Cronograma: createProxy(new JsonCollection('Cronograma', Cronograma, 'cronograma.db')),
  Criterio: createProxy(new JsonCollection('Criterio', Criterio, 'criterios.db'))
};
