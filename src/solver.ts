export type Board = (number | null)[][];
export type Candidates = Set<number>[][];

export interface SolveStep {
  type: 'naked_single' | 'hidden_single' | 'elimination' | 'backtrack' | 'guess';
  row: number;
  col: number;
  value: number;
  explanation: string;
  technique?: string;
}

export function createEmptyBoard(): Board {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

export function copyBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
  }
  
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) return false;
  }
  
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRow + i][boxCol + j] === num) return false;
    }
  }
  
  return true;
}

export function getCandidates(board: Board, row: number, col: number): Set<number> {
  if (board[row][col] !== null) return new Set();
  
  const candidates = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  for (let i = 0; i < 9; i++) {
    if (board[row][i] !== null) candidates.delete(board[row][i]!);
    if (board[i][col] !== null) candidates.delete(board[i][col]!);
  }
  
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const val = board[boxRow + i][boxCol + j];
      if (val !== null) candidates.delete(val);
    }
  }
  
  return candidates;
}

export function getAllCandidates(board: Board): Candidates {
  return board.map((row, i) => 
    row.map((_, j) => getCandidates(board, i, j))
  );
}

function findNakedSingle(board: Board, candidates: Candidates): SolveStep | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null && candidates[row][col].size === 1) {
        const value = [...candidates[row][col]][0];
        return {
          type: 'naked_single',
          row,
          col,
          value,
          technique: '唯一候选数 (Naked Single)',
          explanation: `单元格 R${row + 1}C${col + 1} 只有一个候选数 ${value}，因为该行、列和宫内其他数字已被占用。`
        };
      }
    }
  }
  return null;
}

function findHiddenSingleInUnit(
  board: Board, 
  candidates: Candidates, 
  cells: [number, number][],
  unitName: string
): SolveStep | null {
  for (let num = 1; num <= 9; num++) {
    const possibleCells = cells.filter(([r, c]) => 
      board[r][c] === null && candidates[r][c].has(num)
    );
    
    if (possibleCells.length === 1) {
      const [row, col] = possibleCells[0];
      return {
        type: 'hidden_single',
        row,
        col,
        value: num,
        technique: '隐性唯一数 (Hidden Single)',
        explanation: `在${unitName}中，数字 ${num} 只能放在 R${row + 1}C${col + 1}，因为其他位置都不符合条件。`
      };
    }
  }
  return null;
}

function findHiddenSingle(board: Board, candidates: Candidates): SolveStep | null {
  for (let i = 0; i < 9; i++) {
    const rowCells: [number, number][] = Array.from({ length: 9 }, (_, j) => [i, j]);
    const result = findHiddenSingleInUnit(board, candidates, rowCells, `第 ${i + 1} 行`);
    if (result) return result;
  }
  
  for (let j = 0; j < 9; j++) {
    const colCells: [number, number][] = Array.from({ length: 9 }, (_, i) => [i, j]);
    const result = findHiddenSingleInUnit(board, candidates, colCells, `第 ${j + 1} 列`);
    if (result) return result;
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCells: [number, number][] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          boxCells.push([boxRow * 3 + i, boxCol * 3 + j]);
        }
      }
      const boxNum = boxRow * 3 + boxCol + 1;
      const result = findHiddenSingleInUnit(board, candidates, boxCells, `第 ${boxNum} 宫`);
      if (result) return result;
    }
  }
  
  return null;
}

export function findNextStep(board: Board): SolveStep | null {
  const candidates = getAllCandidates(board);
  
  const nakedSingle = findNakedSingle(board, candidates);
  if (nakedSingle) return nakedSingle;
  
  const hiddenSingle = findHiddenSingle(board, candidates);
  if (hiddenSingle) return hiddenSingle;
  
  let minCandidates = 10;
  let bestCell: [number, number] | null = null;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        const count = candidates[row][col].size;
        if (count === 0) return null;
        if (count < minCandidates) {
          minCandidates = count;
          bestCell = [row, col];
        }
      }
    }
  }
  
  if (bestCell) {
    const [row, col] = bestCell;
    const value = [...candidates[row][col]][0];
    return {
      type: 'guess',
      row,
      col,
      value,
      technique: '试数法 (Backtracking)',
      explanation: `R${row + 1}C${col + 1} 有 ${candidates[row][col].size} 个候选数 (${[...candidates[row][col]].join(', ')})，尝试 ${value}。`
    };
  }
  
  return null;
}

export function isBoardComplete(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== null));
}

export function isBoardValid(board: Board): boolean {
  for (let i = 0; i < 9; i++) {
    const rowNums = new Set<number>();
    const colNums = new Set<number>();
    
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== null) {
        if (rowNums.has(board[i][j]!)) return false;
        rowNums.add(board[i][j]!);
      }
      if (board[j][i] !== null) {
        if (colNums.has(board[j][i]!)) return false;
        colNums.add(board[j][i]!);
      }
    }
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxNums = new Set<number>();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const val = board[boxRow * 3 + i][boxCol * 3 + j];
          if (val !== null) {
            if (boxNums.has(val)) return false;
            boxNums.add(val);
          }
        }
      }
    }
  }
  
  return true;
}

export function solveWithSteps(board: Board): { solution: Board | null; steps: SolveStep[] } {
  const steps: SolveStep[] = [];
  const workingBoard = copyBoard(board);
  
  function solve(): boolean {
    if (isBoardComplete(workingBoard)) {
      return true;
    }
    
    const step = findNextStep(workingBoard);
    if (!step) return false;
    
    if (step.type === 'guess') {
      const candidates = getCandidates(workingBoard, step.row, step.col);
      for (const value of candidates) {
        const guessStep: SolveStep = {
          ...step,
          value,
          explanation: `R${step.row + 1}C${step.col + 1} 有 ${candidates.size} 个候选数，尝试 ${value}。`
        };
        steps.push(guessStep);
        workingBoard[step.row][step.col] = value;
        
        if (solve()) return true;
        
        workingBoard[step.row][step.col] = null;
        steps.push({
          type: 'backtrack',
          row: step.row,
          col: step.col,
          value,
          technique: '回溯',
          explanation: `${value} 在 R${step.row + 1}C${step.col + 1} 导致矛盾，回溯并尝试下一个候选数。`
        });
      }
      return false;
    }
    
    steps.push(step);
    workingBoard[step.row][step.col] = step.value;
    return solve();
  }
  
  if (solve()) {
    return { solution: workingBoard, steps };
  }
  return { solution: null, steps };
}

export function getHint(board: Board): SolveStep | null {
  return findNextStep(board);
}

export function checkErrors(board: Board, initialBoard: Board): [number, number][] {
  const errors: [number, number][] = [];
  const { solution } = solveWithSteps(initialBoard);
  
  if (!solution) return errors;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== null && 
          initialBoard[row][col] === null && 
          board[row][col] !== solution[row][col]) {
        errors.push([row, col]);
      }
    }
  }
  
  return errors;
}

export function parseBoardString(input: string): Board | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  
  if (cleaned.length !== 81) return null;
  
  const board = createEmptyBoard();
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const char = cleaned[i];
    board[row][col] = char === '0' || char === '.' ? null : parseInt(char);
  }
  
  return isBoardValid(board) ? board : null;
}

export function boardToString(board: Board): string {
  return board.map(row => 
    row.map(cell => cell === null ? '.' : cell.toString()).join('')
  ).join('\n');
}

const SAMPLE_PUZZLES = {
  easy: [
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    '003020600900305001001806400008102900700000008006708200002609500800203009005010300'
  ],
  medium: [
    '000000680000073009309000020000900800100702006007004000090000308200810000086000000',
    '070000043040009610800634900094052000358460020000800530080070091902100005007040080'
  ],
  hard: [
    '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
    '000006000059000008200008000045000000003000000006003054000325006000000000000000000'
  ],
  expert: [
    '000000012000035000000600070700000300000400800100000000000120000080000040050000600',
    '000000039000001005003050800008090006000000000400060000009020100050000007700000000'
  ]
};

export function generatePuzzle(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): Board {
  const puzzles = SAMPLE_PUZZLES[difficulty];
  const puzzleStr = puzzles[Math.floor(Math.random() * puzzles.length)];
  return parseBoardString(puzzleStr)!;
}
