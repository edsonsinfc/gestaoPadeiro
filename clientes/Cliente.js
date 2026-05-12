const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  numero: { type: mongoose.Schema.Types.Mixed },
  nome: { type: String, required: true },
  endereco: { type: String, default: '' },
  cidade: { type: String, default: '' },
  estado: { type: String, default: '' },
  cep: { type: String, default: '' },
  latitude: { type: mongoose.Schema.Types.Mixed, default: null },
  longitude: { type: mongoose.Schema.Types.Mixed, default: null },
  horarioAbertura: { type: String, default: '' },
  horarioFechamento: { type: String, default: '' },
  diasFuncionamento: { type: String, default: '' },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

// Transform virtual id
clienteSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Cliente', clienteSchema);
