/**
 * Fly-Inspired Reservoir Computing Module
 * 
 * This is a toy demonstration inspired by the MaleCNS fruit fly connectome.
 * It uses a small fixed sparse directed graph to process Sudoku board states.
 * 
 * NOT a biological simulation - this is an analogy to community MaleCNS demos
 * like Doomfly, Minecraft fly, and nftechie/flm (Fly Language Model).
 * 
 * The reservoir provides an alternative way to score candidate numbers by:
 * 1. Encoding the board state as sensory input
 * 2. Propagating signals through a fixed sparse network
 * 3. Reading out activations to bias candidate selection
 * 
 * The classical solver still handles legality checking.
 */

export interface Neuron {
  id: number;
  type: 'sensory' | 'interneuron' | 'motor';
  activation: number;
}

export interface Synapse {
  from: number;
  to: number;
  weight: number;
}

export interface ReservoirState {
  neurons: Neuron[];
  synapses: Synapse[];
  iteration: number;
}

const NUM_SENSORY = 81;
const NUM_INTERNEURONS = 64;
const NUM_MOTOR = 9;
const TOTAL_NEURONS = NUM_SENSORY + NUM_INTERNEURONS + NUM_MOTOR;

const SPARSITY = 0.15;
const DECAY = 0.9;
const GAIN = 0.3;

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function createReservoir(seed: number = 42): ReservoirState {
  const random = seededRandom(seed);
  
  const neurons: Neuron[] = [];
  
  for (let i = 0; i < NUM_SENSORY; i++) {
    neurons.push({ id: i, type: 'sensory', activation: 0 });
  }
  
  for (let i = 0; i < NUM_INTERNEURONS; i++) {
    neurons.push({ 
      id: NUM_SENSORY + i, 
      type: 'interneuron', 
      activation: 0 
    });
  }
  
  for (let i = 0; i < NUM_MOTOR; i++) {
    neurons.push({ 
      id: NUM_SENSORY + NUM_INTERNEURONS + i, 
      type: 'motor', 
      activation: 0 
    });
  }
  
  const synapses: Synapse[] = [];
  
  for (let i = 0; i < NUM_SENSORY; i++) {
    for (let j = 0; j < NUM_INTERNEURONS; j++) {
      if (random() < SPARSITY) {
        synapses.push({
          from: i,
          to: NUM_SENSORY + j,
          weight: (random() * 2 - 1) * 0.5
        });
      }
    }
  }
  
  for (let i = 0; i < NUM_INTERNEURONS; i++) {
    for (let j = 0; j < NUM_INTERNEURONS; j++) {
      if (i !== j && random() < SPARSITY * 0.5) {
        synapses.push({
          from: NUM_SENSORY + i,
          to: NUM_SENSORY + j,
          weight: (random() * 2 - 1) * 0.3
        });
      }
    }
  }
  
  for (let i = 0; i < NUM_INTERNEURONS; i++) {
    for (let j = 0; j < NUM_MOTOR; j++) {
      if (random() < SPARSITY * 2) {
        synapses.push({
          from: NUM_SENSORY + i,
          to: NUM_SENSORY + NUM_INTERNEURONS + j,
          weight: (random() * 2 - 1) * 0.4
        });
      }
    }
  }
  
  return { neurons, synapses, iteration: 0 };
}

function tanh(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e2x = Math.exp(2 * x);
  return (e2x - 1) / (e2x + 1);
}

export function encodeBoard(
  board: (number | null)[][], 
  targetRow: number, 
  targetCol: number,
  candidates: Set<number>
): number[] {
  const input = new Array(NUM_SENSORY).fill(0);
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const idx = row * 9 + col;
      const value = board[row][col];
      
      if (value !== null) {
        input[idx] = value / 9;
      } else if (row === targetRow && col === targetCol) {
        input[idx] = -0.5;
      } else {
        input[idx] = 0;
      }
    }
  }
  
  const targetIdx = targetRow * 9 + targetCol;
  input[targetIdx] = candidates.size > 0 ? -candidates.size / 9 : 0;
  
  return input;
}

export function stepReservoir(state: ReservoirState, input: number[]): ReservoirState {
  const newNeurons = state.neurons.map(n => ({ ...n }));
  
  for (let i = 0; i < NUM_SENSORY; i++) {
    newNeurons[i].activation = input[i];
  }
  
  const incoming = new Array(TOTAL_NEURONS).fill(0);
  
  for (const synapse of state.synapses) {
    incoming[synapse.to] += state.neurons[synapse.from].activation * synapse.weight;
  }
  
  for (let i = NUM_SENSORY; i < TOTAL_NEURONS; i++) {
    const decayed = newNeurons[i].activation * DECAY;
    const newInput = incoming[i] * GAIN;
    newNeurons[i].activation = tanh(decayed + newInput);
  }
  
  return {
    neurons: newNeurons,
    synapses: state.synapses,
    iteration: state.iteration + 1
  };
}

export function runReservoir(
  state: ReservoirState, 
  input: number[], 
  steps: number = 5
): ReservoirState {
  let current = state;
  for (let i = 0; i < steps; i++) {
    current = stepReservoir(current, input);
  }
  return current;
}

export function readMotorOutput(state: ReservoirState): number[] {
  const motorStart = NUM_SENSORY + NUM_INTERNEURONS;
  return state.neurons
    .slice(motorStart, motorStart + NUM_MOTOR)
    .map(n => n.activation);
}

export function scoreCandidates(
  state: ReservoirState,
  board: (number | null)[][],
  row: number,
  col: number,
  candidates: Set<number>
): Map<number, number> {
  if (candidates.size === 0) {
    return new Map();
  }
  
  const input = encodeBoard(board, row, col, candidates);
  const finalState = runReservoir(state, input, 5);
  const motorOutput = readMotorOutput(finalState);
  
  const scores = new Map<number, number>();
  let maxScore = -Infinity;
  let minScore = Infinity;
  
  for (const candidate of candidates) {
    const rawScore = motorOutput[candidate - 1];
    scores.set(candidate, rawScore);
    maxScore = Math.max(maxScore, rawScore);
    minScore = Math.min(minScore, rawScore);
  }
  
  const range = maxScore - minScore || 1;
  for (const [candidate, score] of scores) {
    scores.set(candidate, (score - minScore) / range);
  }
  
  return scores;
}

export function getFlySuggestion(
  reservoir: ReservoirState,
  board: (number | null)[][],
  row: number,
  col: number,
  candidates: Set<number>
): { value: number; confidence: number; explanation: string } | null {
  if (candidates.size === 0) {
    return null;
  }
  
  const scores = scoreCandidates(reservoir, board, row, col, candidates);
  
  let bestCandidate = 0;
  let bestScore = -Infinity;
  
  for (const [candidate, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }
  
  const candidateList = [...candidates].map(c => 
    `${c}(${(scores.get(c)! * 100).toFixed(0)}%)`
  ).join(', ');
  
  return {
    value: bestCandidate,
    confidence: bestScore,
    explanation: `🪰 果蝇储液池分析 R${row + 1}C${col + 1}：候选数评分 [${candidateList}]。神经网络建议 ${bestCandidate}（置信度 ${(bestScore * 100).toFixed(0)}%）。`
  };
}

export function getReservoirVisualization(state: ReservoirState): {
  sensory: number[];
  interneuron: number[];
  motor: number[];
  totalSynapses: number;
  activeNeurons: number;
} {
  const sensory = state.neurons
    .filter(n => n.type === 'sensory')
    .map(n => n.activation);
  
  const interneuron = state.neurons
    .filter(n => n.type === 'interneuron')
    .map(n => n.activation);
  
  const motor = state.neurons
    .filter(n => n.type === 'motor')
    .map(n => n.activation);
  
  const activeNeurons = state.neurons.filter(n => Math.abs(n.activation) > 0.1).length;
  
  return {
    sensory,
    interneuron,
    motor,
    totalSynapses: state.synapses.length,
    activeNeurons
  };
}

export interface FlyModeResult {
  step: {
    row: number;
    col: number;
    value: number;
    explanation: string;
  };
  reservoirState: ReservoirState;
  visualization: ReturnType<typeof getReservoirVisualization>;
}

export function getFlyModeHint(
  reservoir: ReservoirState,
  board: (number | null)[][],
  getCandidatesFn: (board: (number | null)[][], row: number, col: number) => Set<number>
): FlyModeResult | null {
  let bestResult: FlyModeResult | null = null;
  let bestScore = -Infinity;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== null) continue;
      
      const candidates = getCandidatesFn(board, row, col);
      if (candidates.size === 0) continue;
      
      const suggestion = getFlySuggestion(reservoir, board, row, col, candidates);
      if (suggestion && suggestion.confidence > bestScore) {
        bestScore = suggestion.confidence;
        
        const input = encodeBoard(board, row, col, candidates);
        const finalState = runReservoir(reservoir, input, 5);
        
        bestResult = {
          step: {
            row,
            col,
            value: suggestion.value,
            explanation: suggestion.explanation
          },
          reservoirState: finalState,
          visualization: getReservoirVisualization(finalState)
        };
      }
    }
  }
  
  return bestResult;
}
