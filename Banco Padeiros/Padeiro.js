const mongoose = require('mongoose');

const padeiroSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  cargo: { type: String, default: '' },
  funcao: { type: String, default: '' },
  filial: { type: String, default: '' },
  localTrabalho: { type: String, default: '' },
  dataNascimento: { type: String, default: '' },
  cpf: { type: String, default: '' },
  rg: { type: String, default: '' },
  pis: { type: String, default: '' },
  carteiraTrabalho: { type: String, default: '' },
  numSerie: { type: String, default: '' },
  email: { type: String, default: '' },
  emailPessoal: { type: String, default: '' },
  emailCorporativo: { type: String, default: '' },
  telefone: { type: String, default: '' },
  estado: { type: String, default: '' },
  codigoExterno: { type: String, default: '' },
  desligado: { type: String, default: 'NÃO' },
  codTec: { type: String, index: true },
  dataAdmissao: { type: String, default: '' },
  fusoHorario: { type: String, default: 'SAO_PAULO' },
  passwordHash: { type: String, default: null },
  firstAccessToken: { type: String, default: null },
  firstAccessExpiry: { type: String, default: null },
  ativo: { type: Boolean, default: true },
  role: { type: String, default: 'padeiro', enum: ['padeiro', 'gestor'] },
  criadoEm: { type: String, default: () => new Date().toISOString() },
  atualizadoEm: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

// Transform virtual id
padeiroSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Padeiro', padeiroSchema);
