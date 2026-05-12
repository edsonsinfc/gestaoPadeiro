const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descricao: { type: String, default: '' },
  fornecedor: { type: String, default: '' },
  fotoPath: { type: String, default: '' },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

// Transform virtual id
produtoSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Produto', produtoSchema);
