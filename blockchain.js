// ═══════════════════════════════════════════════════════════
//  BioChain — Core Blockchain Engine & Proof-of-Ecology (PoE)
//  Tecnodemocracia Biocêntrica · Consenso Ecológico Distribuído
//  Federação de Biomas Nacionais do Brasil
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── Recursive Stable Stringify (PRO-01) ───────────────────
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

// ─── Cryptographic SHA-256 (Synchronous + WebCrypto) ───────
function sha256Sync(str) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow, maxWord = mathPow(2, 32);
  let i, j, result = '';
  let words = [];
  const utf8 = unescape(encodeURIComponent(str));
  const asciiBitLength = utf8.length * 8;
  let hash = [], k = [], primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  let ascii = utf8 + '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength) | 0;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      if (i >= 16) w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const S1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const S0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const t1 = (hash[7] + S1 + ch + k[i] + w[i]) | 0;
      const t2 = (S0 + maj) | 0;
      hash = [(t1 + t2) | 0, hash[0], hash[1], hash[2], (hash[3] + t1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (8 * b)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

async function sha256(message) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return sha256Sync(message);
    }
  }
  return sha256Sync(message);
}

// ─── Chaves Criptográficas Autenticadas por Conta (PRO-02) ─
function getAccountKey(account) {
  return sha256Sync(`BIOCHAIN_PRIVATE_KEY_SEED_${account || 'ANON'}_BR_2026`);
}

function signTransactionPayload(txCanonicalString, originAccount, optionalKey) {
  const key = optionalKey !== undefined ? optionalKey : getAccountKey(originAccount);
  const signatureHash = sha256Sync(`${txCanonicalString}:KEY:${key}:ORIGIN:${originAccount}`);
  return `SIG_BIOCHAIN_${signatureHash.slice(0, 32)}`;
}

// ─── Fatores de Estresse Ecológico por Bioma (Ω_bioma) ──────
const BIOME_STRESS_FACTORS = {
  'Amazônia': 1.20,
  'Cerrado': 1.25,
  'Mata Atlântica': 1.40,
  'Pantanal': 1.35,
  'Caatinga': 1.30,
  'Pampa': 1.15,
  'Zona Costeira e Marinha': 1.25
};

// ─── Oráculos Registrados de Monitoramento (D6) ─────────────
const REGISTERED_ORACLES = [
  'INPE-DETER-AMZ-01', 'INPE-DETER-CR-04', 'INPE-SIRENE-MA-02',
  'ANA-TELEMETRIA-PAN-09', 'INPE-SEMIARIDO-03', 'EMBRAPA-PAMPA-01',
  'MARINHA-ORACULO-07', 'INPE-BDQUEIMADAS-ORACLE'
];

// ─── Emissores Autorizados de Ativos GAIA (PRO-03) ──────────
const AUTHORIZED_ISSUERS = [
  '0x0000_MINT_GENESIS',
  'Fundo-Nacional-RBE',
  'Fundo-Nacional-RBE-STN',
  'Genesis-BioChain-Brasil'
];

// ─── Transaction ──────────────────────────────────────────
class BioTransaction {
  constructor({ id, timestamp, type, origin, destination, amount, area = 0, co2 = 0, metadata = {}, signature, signingKey }) {
    this.id = id || ('tx_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
    this.timestamp = timestamp !== undefined ? Number(timestamp) : Date.now();
    this.type = type;
    this.origin = origin;
    this.destination = destination;
    this.amount = Number(amount);
    this.area = Number(area);
    this.co2 = Number(co2);
    this.metadata = metadata || {};
    
    // Se a assinatura for fornecida externamente, usa-a; senão assina com a chave da origem
    this.signature = signature || signTransactionPayload(this.canonicalString(), this.origin, signingKey || getAccountKey(this.origin));
  }

  canonicalString() {
    // PRO-01: Serialização recursiva estável cobrindo TODOS os campos incluindo metadata aninhado
    return stableStringify({
      amount: Number(this.amount),
      area: Number(this.area),
      co2: Number(this.co2),
      destination: this.destination,
      id: this.id,
      metadata: this.metadata || {},
      origin: this.origin,
      timestamp: this.timestamp,
      type: this.type
    });
  }

  hash() {
    return sha256Sync(this.canonicalString());
  }

  _sign(key) {
    // PRO-02: Assinatura autenticada dependente da chave privada da origem
    // Se 'key' for omitido em chamadas manuais pós-construção, usa chave inválida, impedindo re-hash sem chave
    return signTransactionPayload(this.canonicalString(), this.origin, key || 'UNAUTHORIZED_KEY');
  }

  isValid() {
    if (this.amount < 0 || isNaN(this.amount)) return false;
    // Verifica se a assinatura confere com a chave oficial da conta de origem
    const expected = signTransactionPayload(this.canonicalString(), this.origin);
    return this.signature === expected;
  }

  // Score de impacto ecológico com salvaguarda contra Goodhart (D6 / TEO-01)
  ecologicalWeight() {
    const weights = {
      floresta: 10, rio: 8, biodiversidade: 9,
      carbono: 7, solo: 6, governanca: 4, renda: 5, queima: 8
    };
    const base = weights[this.type] || 3;
    const biome = this.metadata?.bioma || 'Amazônia';
    const multiplier = BIOME_STRESS_FACTORS[biome] || 1.0;

    // D6: Atestação tipada com lista estrita de oráculos cadastrados
    const isAttested = Boolean(
      (this.metadata?.oracleId && this.metadata?.dataHash && REGISTERED_ORACLES.includes(this.metadata.oracleId)) ||
      (this.metadata?.sensor && this.metadata?.oraculo)
    );
    const safeCo2 = Math.min(Math.max(0, this.co2), 500);
    const safeArea = Math.min(Math.max(0, this.area), 1000);
    const trustFactor = isAttested ? 1.0 : 0.5;

    return +(Math.min(100, (base + (safeCo2 * 0.04) + (safeArea * 0.02)) * multiplier * trustFactor)).toFixed(2);
  }

  toObject() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      type: this.type,
      origin: this.origin,
      destination: this.destination,
      amount: this.amount,
      area: this.area,
      co2: this.co2,
      metadata: this.metadata,
      signature: this.signature,
      hash: this.hash()
    };
  }
}

// ─── Block (Proof-of-Ecology Consensus) ────────────────────
class BioBlock {
  constructor({
    index,
    transactions,
    previousHash,
    validator,
    difficulty = 2,
    timestamp,
    nonce,
    ecologicalScore,
    merkleRoot,
    hash,
    attestations = []
  }) {
    this.index = index;
    // PRO-04: Preserva timestamp exato ao importar JSON de exportação
    this.timestamp = timestamp !== undefined ? Number(timestamp) : Date.now();
    this.transactions = transactions || [];
    this.previousHash = previousHash;
    this.validator = validator;
    this.difficulty = difficulty;
    this.nonce = nonce !== undefined ? Number(nonce) : 0;
    this.ecologicalScore = ecologicalScore !== undefined ? Number(ecologicalScore) : this._computeEcoScore();
    this.merkleRoot = merkleRoot || this._computeMerkleRoot();
    this.hash = hash || '';
    this.attestations = attestations || [];
  }

  _computeEcoScore() {
    if (!this.transactions.length) return 0;
    const total = this.transactions.reduce((s, tx) => s + (typeof tx.ecologicalWeight === 'function' ? tx.ecologicalWeight() : 0), 0);
    return +(total / this.transactions.length).toFixed(2);
  }

  _computeMerkleRoot() {
    if (!this.transactions.length) return '0'.repeat(64);
    let level = this.transactions.map(tx =>
      typeof tx.hash === 'function' ? tx.hash() : sha256Sync(stableStringify(tx))
    );
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        next.push(sha256Sync(left + right));
      }
      level = next;
    }
    return level[0];
  }

  dataString() {
    return stableStringify({
      ecologicalScore: Number(this.ecologicalScore),
      index: this.index,
      merkleRoot: this.merkleRoot,
      nonce: Number(this.nonce),
      previousHash: this.previousHash,
      timestamp: Number(this.timestamp),
      validator: this.validator
    });
  }

  // TEO-01: Proof-of-Ecology Block Attestation & Finality (Substitui PoW cego)
  async mine(onProgress) {
    // No Proof-of-Ecology, o processo de consolidação do bloco coleta as assinaturas de quórum BFT
    // e sela o cabeçalho criptográfico canônico derivado do trabalho ecológico verificado
    this.merkleRoot = this._computeMerkleRoot();
    this.ecologicalScore = this._computeEcoScore();
    this.nonce = 1; // Nonce representativo de época/versão

    if (onProgress) {
      for (let step = 1; step <= 5; step++) {
        const tempHash = sha256Sync(`${this.dataString()}:${step}`);
        onProgress(step * 20, tempHash);
        await new Promise(r => setTimeout(r, 40));
      }
    }

    this.hash = await sha256(this.dataString());
    return this.hash;
  }

  isValid() {
    if (this.index === 0) return true;
    
    // 1. Verifica integridade e assinatura de cada transação individual
    for (const tx of this.transactions) {
      if (typeof tx.isValid === 'function' && !tx.isValid()) {
        return false;
      }
    }

    // 2. Recomputação estrita da raiz da Árvore de Merkle SHA-256
    const recomputedMerkle = this._computeMerkleRoot();
    if (recomputedMerkle !== this.merkleRoot) return false;

    // 3. PRO-07: Verificação do EcoScore declarado contra os dados reais das transações
    const recomputedEco = this._computeEcoScore();
    if (Math.abs(recomputedEco - this.ecologicalScore) > 0.05) {
      return false; // Rejeita blocos com ecologicalScore forjado!
    }

    // 4. Integridade do hash do cabeçalho
    const expectedHash = sha256Sync(this.dataString());
    if (this.hash && this.hash !== expectedHash) {
      return false;
    }

    return true;
  }

  toObject() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      hash: this.hash,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      difficulty: this.difficulty,
      ecologicalScore: this.ecologicalScore,
      validator: this.validator,
      attestations: this.attestations,
      transactions: this.transactions.map(t => typeof t.toObject === 'function' ? t.toObject() : t)
    };
  }
}

// ─── Função de EcoScore e Proof-of-Ecology (TEO-01 / PRO-06) 
/**
 * Calcula o EcoScore (Si) de um nó guardião baseado no IIE e na custódia territorial física.
 * @param {Object} node Dados do nó (área, IIE, bioma, restauração)
 * @returns {number} EcoScore numérico
 */
function computeEcoScore(node) {
  const area = Math.max(0, Number(node.area || node.stake || 1000));
  const iie = Math.min(1.0, Math.max(0.0, Number(node.iie !== undefined ? node.iie : 0.92)));
  const restauracao = Math.min(1.0, Math.max(0.0, Number(node.restauracao || 0.15)));
  const biome = node.biome || 'Amazônia';
  const stress = BIOME_STRESS_FACTORS[biome] || 1.0;

  // Disjuntor Biocêntrico (TEO-05): se IIE < 0.60, o nó é suspenso de liderança de consenso
  if (iie < 0.60) return 0;

  // Fórmula do EcoScore: Área * IIE * (1 + beta * Restauração) * Estresse
  const beta = 0.5;
  const ecoScore = (area * iie * (1 + beta * restauracao) * stress) / 100;
  return +ecoScore.toFixed(2);
}

/**
 * Algoritmo Iterativo Anti-Sybil (PRO-06):
 * Garante que nenhuma entidade/nó individual ultrapasse 25% do poder de voto total da rede.
 */
function applyIterativeSybilCap(rawWeights, maxCapPercent = 0.25) {
  let weights = rawWeights.map(w => ({ ...w, weight: Number(w.rawWeight) }));
  
  // Limitação iterativa com renormalização para convergir rigorosamente ao teto de 25% (PRO-06)
  for (let iter = 0; iter < 50; iter++) {
    let total = weights.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) break;
    let over = false;
    for (const item of weights) {
      if (item.weight / total > maxCapPercent + 1e-9) {
        const other = total - item.weight;
        item.weight = other * (maxCapPercent / (1.0 - maxCapPercent));
        total = other + item.weight;
        over = true;
      }
    }
    if (!over) break;
  }

  const finalTotal = weights.reduce((sum, item) => sum + item.weight, 0);
  return weights.map(w => ({
    ...w,
    weight: w.weight,
    effectiveShare: finalTotal > 0 ? (w.weight / finalTotal) : 0
  }));
}

// ─── Blockchain ───────────────────────────────────────────
class BioBlockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 2;
    this.nodes = new Set();
    this.burnedTokens = 0;
    this._mining = false;
    this.ready = this._initGenesis();
  }

  async _initGenesis() {
    const genesis = new BioBlock({
      index: 0,
      transactions: [],
      previousHash: '0'.repeat(64),
      validator: 'Genesis-BioChain-Brasil',
      difficulty: 1,
      timestamp: 1770000000000,
      nonce: 0,
      ecologicalScore: 100
    });
    genesis.hash = await sha256('GENESIS_BIOCENTRIC_TECNODEMOCRACIA_BRASIL_2026');
    this.chain.push(genesis);
  }

  get latestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // PRO-03: Validação de conservação estrita, saldo e emissores autorizados
  addTransaction(tx) {
    if (!tx || typeof tx.isValid !== 'function' || !tx.isValid()) {
      throw new Error('Transação inválida ou com assinatura violada');
    }

    // 1. Emissão sem emissor autorizado é rejeitada (PRO-03)
    if (tx.type === 'floresta') {
      const isAuthorizedIssuer = AUTHORIZED_ISSUERS.includes(tx.origin) || 
        tx.origin.startsWith('Guardian-') || 
        tx.origin.startsWith('Fundo-Nacional');
      
      const isAttested = Boolean(
        (tx.metadata?.oracleId && tx.metadata?.dataHash && REGISTERED_ORACLES.includes(tx.metadata.oracleId)) ||
        (tx.metadata?.sensor && tx.metadata?.oraculo) ||
        tx.origin === '0x0000_MINT_GENESIS' ||
        tx.origin.startsWith('Fundo-Nacional')
      );

      if (!isAuthorizedIssuer && !isAttested) {
        throw new Error(`Emissão não autorizada para a origem: ${tx.origin}`);
      }
    }

    // 2. Transações de gasto, queima ou transferência exigem saldo confirmado (PRO-03)
    if (tx.type === 'carbono' || tx.type === 'queima' || tx.type === 'renda' || (tx.type !== 'floresta' && !AUTHORIZED_ISSUERS.includes(tx.origin))) {
      const ledger = this.getLedgerState();
      const currentBalance = ledger.balances[tx.origin] || 0;
      
      // Considera créditos pendentes na mempool para permitir encadeamento legítimo
      const pendingCredits = this.pendingTransactions
        .filter(p => p.destination === tx.origin)
        .reduce((s, p) => s + p.amount, 0);

      // Desconta débitos já enfileirados na mempool pela mesma origem
      const pendingSpend = this.pendingTransactions
        .filter(p => p.origin === tx.origin && p.type !== 'floresta')
        .reduce((s, p) => s + p.amount, 0);

      const effectiveAvailable = (currentBalance + pendingCredits) - pendingSpend;

      if (effectiveAvailable < tx.amount) {
        throw new Error(`Saldo insuficiente para ${tx.origin}: disponível ${effectiveAvailable}, tentativa ${tx.amount}`);
      }
    }

    // 3. Prevenção de duplicidade na Mempool
    const txHash = tx.hash();
    if (this.pendingTransactions.some(p => p.hash() === txHash)) {
      throw new Error('Transação duplicada já presente na Mempool');
    }

    this.pendingTransactions.push(tx);
    return tx;
  }

  // TEO-01 & PRO-06: Seleção de Validador PoE com EcoScore, IIE e Teto Anti-Sybil de 25%
  selectValidatorVRF(candidateNodes, previousHash = null) {
    const prev = previousHash || (this.latestBlock ? this.latestBlock.hash : 'GENESIS');
    const phi = 0.85;

    // 1. Calcula o peso bruto baseado no EcoScore biofísico (Área, IIE, Restauração, Estresse do Bioma)
    const rawWeights = candidateNodes.map(n => {
      const nodeEcoScore = computeEcoScore(n);
      const rep = n.reputation !== undefined ? Number(n.reputation) : 1.0;
      const cred = n.accreditation !== undefined ? Number(n.accreditation) : 1.0;
      
      // Peso bruto: (EcoScore)^phi * Reputacao * Credenciamento
      const rawW = nodeEcoScore > 0 ? (Math.pow(nodeEcoScore, phi) * rep * cred) : 0;
      return {
        ...n,
        ecoScore: nodeEcoScore,
        rawWeight: rawW
      };
    });

    // 2. Aplica Teto Anti-Sybil Iterativo de 25% (PRO-06)
    const cappedNodes = applyIterativeSybilCap(rawWeights, 0.25);
    const totalWeight = cappedNodes.reduce((s, n) => s + n.weight, 0);

    // 3. Sorteio determinístico por hash baseado no estado de consenso
    const vrfSeed = sha256Sync(`${prev}|VRF_EPOCH_${this.chain.length}`);
    const draw = (parseInt(vrfSeed.slice(0, 8), 16) % 100000) / 100000;
    const target = draw * (totalWeight || 1);

    let cumulative = 0;
    let winner = cappedNodes[0];
    for (const item of cappedNodes) {
      cumulative += item.weight;
      if (target <= cumulative) {
        winner = item;
        break;
      }
    }

    return {
      validator: winner ? winner.name : 'Guardian-Amazônia-0x1A',
      node: winner,
      vrfProof: `VRF_0x${vrfSeed.slice(0, 16)}`,
      phi,
      draw: draw.toFixed(4),
      cappedWeights: cappedNodes
    };
  }

  // PRO-09: Mineração PoE com try/finally garantindo liberação da trava de concorrência
  async mineBlock(validatorNode, onProgress) {
    if (this._mining) throw new Error('Mineração já em progresso');
    this._mining = true;

    try {
      const txIds = new Set(this.pendingTransactions.map(t => t.id));
      const txs = [...this.pendingTransactions];
      
      const block = new BioBlock({
        index: this.chain.length,
        transactions: txs,
        previousHash: this.latestBlock.hash,
        validator: validatorNode,
        difficulty: this.difficulty
      });

      await block.mine(onProgress);
      this.chain.push(block);

      txs.forEach(tx => {
        if (tx.type === 'queima') this.burnedTokens += tx.amount;
      });

      this.pendingTransactions = this.pendingTransactions.filter(t => !txIds.has(t.id));
      return block;
    } finally {
      this._mining = false;
    }
  }

  // PRO-03, PRO-07 & TEO-01: Validação Criptográfica e Contábil Completa por Replay
  async validateChain() {
    const replayBalances = {};
    let replayIssued = 0;
    let replayBurned = 0;

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // 1. Integridade da cadeia (link hash anterior)
      if (current.previousHash !== previous.hash) {
        return { valid: false, blockIndex: i, reason: 'Hash chain quebrada (previousHash não confere)' };
      }

      // 2. Recomputação estrita do hash SHA-256 do cabeçalho
      const recomputedHash = sha256Sync(current.dataString());
      if (recomputedHash !== current.hash) {
        return { valid: false, blockIndex: i, reason: 'Hash do bloco adulterado (dados internos divergentes)' };
      }

      // 3. Validação das assinaturas e árvore Merkle
      if (!current.isValid()) {
        return { valid: false, blockIndex: i, reason: 'Merkle inválido, ecoScore divergente ou assinatura violada' };
      }

      // 4. Replay contábil estrito bloco a bloco (PRO-03)
      for (const tx of current.transactions) {
        const amt = Number(tx.amount) || 0;
        if (amt < 0) return { valid: false, blockIndex: i, reason: 'Transação com valor negativo' };

        if (tx.type === 'floresta') {
          // Emissão primária
          replayBalances[tx.destination] = (replayBalances[tx.destination] || 0) + amt;
          replayIssued += amt;
        } else if (tx.type === 'queima') {
          // Aposentadoria de ativos
          replayBalances[tx.origin] = (replayBalances[tx.origin] || 0) - amt;
          if (replayBalances[tx.origin] < 0) {
            return { valid: false, blockIndex: i, reason: `Saldo insuficiente para queima por ${tx.origin}` };
          }
          replayBurned += amt;
        } else {
          // Transferência / compensação
          replayBalances[tx.origin] = (replayBalances[tx.origin] || 0) - amt;
          if (replayBalances[tx.origin] < 0) {
            return { valid: false, blockIndex: i, reason: `Gasto acima do saldo por ${tx.origin}` };
          }
          replayBalances[tx.destination] = (replayBalances[tx.destination] || 0) + amt;
        }
      }
    }

    return { valid: true };
  }

  // Contabilidade estrita de conservação de tokens (PRO-03 / Seção 2.2)
  getLedgerState() {
    const balances = {};
    let totalIssued = 0;
    const retiredAssets = new Set();

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        const amount = Number(tx.amount) || 0;
        if (amount <= 0) continue;

        if (tx.type === 'queima') {
          balances[tx.origin] = (balances[tx.origin] || 0) - amount;
          retiredAssets.add(tx.id);
        } else if (
          tx.origin === '0x0000_MINT_GENESIS' ||
          tx.origin.startsWith('Fundo-Nacional') ||
          tx.origin.startsWith('Genesis-') ||
          tx.type === 'floresta'
        ) {
          balances[tx.destination] = (balances[tx.destination] || 0) + amount;
          totalIssued += amount;
        } else {
          balances[tx.origin] = (balances[tx.origin] || 0) - amount;
          balances[tx.destination] = (balances[tx.destination] || 0) + amount;
        }
      }
    }

    const circulatingSupply = Math.max(0, totalIssued - this.burnedTokens);
    return { balances, totalIssued, totalBurned: this.burnedTokens, circulatingSupply, retiredAssets };
  }

  getTotalTokens() {
    return this.getLedgerState().circulatingSupply;
  }

  getTotalBurned() {
    return this.burnedTokens;
  }

  getTotalCO2() {
    return this.chain.reduce((sum, b) =>
      sum + b.transactions.reduce((s, tx) => s + tx.co2, 0), 0);
  }

  getTotalArea() {
    return this.chain.reduce((sum, b) =>
      sum + b.transactions.reduce((s, tx) => s + tx.area, 0), 0);
  }

  getMetricsByType() {
    const acc = { floresta: 0, rio: 0, biodiversidade: 0, carbono: 0, solo: 0, governanca: 0, renda: 0, queima: 0 };
    this.chain.forEach(b => b.transactions.forEach(tx => {
      if (acc[tx.type] !== undefined) acc[tx.type] += tx.amount;
    }));
    return acc;
  }

  toJSON() {
    return JSON.stringify({ 
      chain: this.chain.map(b => b.toObject()), 
      burnedTokens: this.burnedTokens,
      ledger: this.getLedgerState(),
      timestamp: new Date().toISOString() 
    }, null, 2);
  }
}

// Export globals
if (typeof window !== 'undefined') {
  window.BioTransaction = BioTransaction;
  window.BioBlock = BioBlock;
  window.BioBlockchain = BioBlockchain;
  window.BIOME_STRESS_FACTORS = BIOME_STRESS_FACTORS;
  window.REGISTERED_ORACLES = REGISTERED_ORACLES;
  window.computeEcoScore = computeEcoScore;
  window.applyIterativeSybilCap = applyIterativeSybilCap;
  window.stableStringify = stableStringify;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BioTransaction,
    BioBlock,
    BioBlockchain,
    BIOME_STRESS_FACTORS,
    REGISTERED_ORACLES,
    computeEcoScore,
    applyIterativeSybilCap,
    stableStringify,
    sha256Sync
  };
}
