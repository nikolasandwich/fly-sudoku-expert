import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Board,
  copyBoard,
  generatePuzzle,
  parseBoardString,
  getCandidates,
  isValidPlacement,
  isBoardComplete,
  isBoardValid,
  solveWithSteps,
  getHint
} from './solver';
import {
  createReservoir,
  ReservoirState,
  getFlyModeHint,
  getReservoirVisualization
} from './flyReservoir';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type GameMode = 'classical' | 'fly';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [initialBoard, setInitialBoard] = useState<Board>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Board>(() => copyBoard(initialBoard));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [flySuggestionCell, setFlySuggestionCell] = useState<[number, number] | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('classical');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [explanations, setExplanations] = useState<Array<{ text: string; flyMode: boolean }>>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [animatingCell, setAnimatingCell] = useState<[number, number] | null>(null);
  
  const [reservoir] = useState<ReservoirState>(() => createReservoir(42));
  const [reservoirViz, setReservoirViz] = useState(() => getReservoirVisualization(reservoir));

  const showToast = useCallback((message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filledCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] !== null) count++;
      }
    }
    return count;
  }, [board]);

  const progress = useMemo(() => Math.round((filledCount / 81) * 100), [filledCount]);

  const handleNewGame = useCallback((diff: Difficulty) => {
    const newBoard = generatePuzzle(diff);
    setInitialBoard(newBoard);
    setBoard(copyBoard(newBoard));
    setDifficulty(diff);
    setSelectedCell(null);
    setErrorCells(new Set());
    setHintCell(null);
    setFlySuggestionCell(null);
    setExplanations([]);
    showToast('新游戏开始！', 'info');
  }, [showToast]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell([row, col]);
    setHintCell(null);
    setFlySuggestionCell(null);
  }, []);

  const handleNumberInput = useCallback((num: number | null) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    
    if (initialBoard[row][col] !== null) {
      showToast('不能修改初始数字', 'error');
      return;
    }

    const newBoard = copyBoard(board);
    
    if (num === null) {
      newBoard[row][col] = null;
      setBoard(newBoard);
      setErrorCells(prev => {
        const next = new Set(prev);
        next.delete(`${row},${col}`);
        return next;
      });
      return;
    }

    if (!isValidPlacement(newBoard, row, col, num)) {
      setErrorCells(prev => new Set(prev).add(`${row},${col}`));
      newBoard[row][col] = num;
      setBoard(newBoard);
      showToast(`${num} 在此位置与其他数字冲突`, 'error');
      return;
    }

    newBoard[row][col] = num;
    setBoard(newBoard);
    setErrorCells(prev => {
      const next = new Set(prev);
      next.delete(`${row},${col}`);
      return next;
    });

    if (isBoardComplete(newBoard) && isBoardValid(newBoard)) {
      showToast('🎉 恭喜！你成功完成了数独！', 'success');
    }
  }, [selectedCell, initialBoard, board, showToast]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;

    if (e.key >= '1' && e.key <= '9') {
      handleNumberInput(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      handleNumberInput(null);
    } else if (e.key === 'ArrowUp' && row > 0) {
      setSelectedCell([row - 1, col]);
    } else if (e.key === 'ArrowDown' && row < 8) {
      setSelectedCell([row + 1, col]);
    } else if (e.key === 'ArrowLeft' && col > 0) {
      setSelectedCell([row, col - 1]);
    } else if (e.key === 'ArrowRight' && col < 8) {
      setSelectedCell([row, col + 1]);
    }
  }, [selectedCell, handleNumberInput]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleHint = useCallback(() => {
    if (gameMode === 'fly') {
      const result = getFlyModeHint(reservoir, board, getCandidates);
      if (result) {
        setFlySuggestionCell([result.step.row, result.step.col]);
        setReservoirViz(result.visualization);
        setExplanations(prev => [...prev, { text: result.step.explanation, flyMode: true }]);
        showToast('果蝇神经网络已分析并建议', 'info');
      } else {
        showToast('没有可用的提示', 'error');
      }
    } else {
      const hint = getHint(board);
      if (hint) {
        setHintCell([hint.row, hint.col]);
        const explanation = `💡 ${hint.technique}: ${hint.explanation}`;
        setExplanations(prev => [...prev, { text: explanation, flyMode: false }]);
        showToast(`提示: R${hint.row + 1}C${hint.col + 1} = ${hint.value}`, 'info');
      } else {
        showToast('没有可用的提示', 'error');
      }
    }
  }, [gameMode, reservoir, board, showToast]);

  const handleApplyHint = useCallback(() => {
    if (gameMode === 'fly' && flySuggestionCell) {
      const result = getFlyModeHint(reservoir, board, getCandidates);
      if (result) {
        const newBoard = copyBoard(board);
        newBoard[result.step.row][result.step.col] = result.step.value;
        setBoard(newBoard);
        setFlySuggestionCell(null);
        showToast(`已应用果蝇建议: ${result.step.value}`, 'success');
      }
    } else if (hintCell) {
      const hint = getHint(board);
      if (hint) {
        const newBoard = copyBoard(board);
        newBoard[hint.row][hint.col] = hint.value;
        setBoard(newBoard);
        setHintCell(null);
        showToast(`已填入: ${hint.value}`, 'success');
      }
    }
  }, [gameMode, flySuggestionCell, hintCell, reservoir, board, showToast]);

  const handleCheck = useCallback(() => {
    const { solution } = solveWithSteps(initialBoard);
    if (!solution) {
      showToast('无法验证 - 题目可能无解', 'error');
      return;
    }

    const errors = new Set<string>();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== null && 
            initialBoard[row][col] === null && 
            board[row][col] !== solution[row][col]) {
          errors.add(`${row},${col}`);
        }
      }
    }

    setErrorCells(errors);
    if (errors.size === 0) {
      showToast('目前所有填入的数字都正确！', 'success');
    } else {
      showToast(`发现 ${errors.size} 个错误`, 'error');
    }
  }, [initialBoard, board, showToast]);

  const handleAutoSolve = useCallback(async () => {
    if (isSolving) return;
    setIsSolving(true);
    
    const { solution, steps } = solveWithSteps(initialBoard);
    
    if (!solution) {
      showToast('此题无解', 'error');
      setIsSolving(false);
      return;
    }

    let currentBoard = copyBoard(initialBoard);
    const relevantSteps = steps.filter(s => s.type !== 'backtrack');
    
    for (let i = 0; i < relevantSteps.length; i++) {
      const step = relevantSteps[i];
      if (currentBoard[step.row][step.col] !== null) continue;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      currentBoard = copyBoard(currentBoard);
      currentBoard[step.row][step.col] = step.value;
      setBoard(currentBoard);
      setAnimatingCell([step.row, step.col]);
      setSelectedCell([step.row, step.col]);
      
      if (i < 10 || i % 5 === 0) {
        setExplanations(prev => {
          const newExplanations = [...prev, { 
            text: `${step.technique}: ${step.explanation}`, 
            flyMode: false 
          }];
          return newExplanations.slice(-20);
        });
      }
    }
    
    setAnimatingCell(null);
    setIsSolving(false);
    showToast('🎉 数独已解决！', 'success');
  }, [initialBoard, isSolving, showToast]);

  const handlePaste = useCallback(() => {
    const parsed = parseBoardString(pasteInput);
    if (parsed) {
      setInitialBoard(parsed);
      setBoard(copyBoard(parsed));
      setSelectedCell(null);
      setErrorCells(new Set());
      setHintCell(null);
      setFlySuggestionCell(null);
      setExplanations([]);
      setShowPasteModal(false);
      setPasteInput('');
      showToast('题目已导入！', 'success');
    } else {
      showToast('无效的数独格式。请输入81个数字（0或.表示空格）', 'error');
    }
  }, [pasteInput, showToast]);

  const handleReset = useCallback(() => {
    setBoard(copyBoard(initialBoard));
    setSelectedCell(null);
    setErrorCells(new Set());
    setHintCell(null);
    setFlySuggestionCell(null);
    setExplanations([]);
    showToast('已重置', 'info');
  }, [initialBoard, showToast]);

  const getCellClass = (row: number, col: number) => {
    const classes = ['sudoku-cell'];
    
    if (col === 2 || col === 5) classes.push('border-right');
    if (row === 2 || row === 5) classes.push('border-bottom');
    
    if (initialBoard[row][col] !== null) {
      classes.push('fixed');
    } else if (board[row][col] !== null) {
      classes.push('user-input');
    }
    
    if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
      classes.push('selected');
    }
    
    if (selectedCell && board[row][col] !== null && 
        board[row][col] === board[selectedCell[0]][selectedCell[1]] &&
        !(row === selectedCell[0] && col === selectedCell[1])) {
      classes.push('same-number');
    }
    
    if (errorCells.has(`${row},${col}`)) {
      classes.push('error');
    }
    
    if (hintCell && hintCell[0] === row && hintCell[1] === col) {
      classes.push('hint');
    }
    
    if (flySuggestionCell && flySuggestionCell[0] === row && flySuggestionCell[1] === col) {
      classes.push('fly-suggestion');
    }
    
    if (animatingCell && animatingCell[0] === row && animatingCell[1] === col) {
      classes.push('animating');
    }
    
    return classes.join(' ');
  };

  const getNeuronColor = (activation: number) => {
    const intensity = Math.abs(activation);
    if (activation > 0) {
      return `rgba(72, 187, 120, ${Math.min(intensity, 1)})`;
    } else {
      return `rgba(245, 101, 101, ${Math.min(intensity, 1)})`;
    }
  };

  return (
    <div className={`app ${isSolving ? 'solving' : ''}`}>
      <header className="header">
        <h1>🪰 果蝇数独专家</h1>
        <p className="subtitle">Fly Sudoku Expert — 受 MaleCNS 果蝇连接组启发的数独求解器</p>
      </header>

      <div className="main-content">
        <div className="card">
          <div className="sudoku-container">
            <div className="sudoku-board">
              {board.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={getCellClass(rowIdx, colIdx)}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>

            <div className="number-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  className="number-btn"
                  onClick={() => handleNumberInput(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="number-btn erase"
                onClick={() => handleNumberInput(null)}
              >
                ✕
              </button>
            </div>

            <div className="controls">
              <button className="btn btn-primary" onClick={handleHint}>
                💡 提示
              </button>
              {(hintCell || flySuggestionCell) && (
                <button className="btn btn-success" onClick={handleApplyHint}>
                  ✓ 应用提示
                </button>
              )}
              <button className="btn btn-warning" onClick={handleCheck}>
                🔍 检查
              </button>
              <button 
                className="btn btn-fly" 
                onClick={handleAutoSolve}
                disabled={isSolving}
              >
                {isSolving ? '求解中...' : '🚀 自动求解'}
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                ↺ 重置
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPasteModal(true)}>
                📋 导入题目
              </button>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="card">
            <h3 className="card-title">🎮 游戏模式</h3>
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${gameMode === 'classical' ? 'active' : ''}`}
                onClick={() => setGameMode('classical')}
              >
                经典模式
              </button>
              <button 
                className={`mode-btn ${gameMode === 'fly' ? 'active' : ''}`}
                onClick={() => setGameMode('fly')}
              >
                🪰 果蝇模式
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">📊 游戏统计</h3>
            <div className="stats">
              <div className="stat-item">
                <div className="stat-value">{filledCount}/81</div>
                <div className="stat-label">已填格数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{progress}%</div>
                <div className="stat-label">完成进度</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">🎯 选择难度</h3>
            <div className="difficulty-selector">
              {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => (
                <button
                  key={diff}
                  className={`difficulty-btn ${difficulty === diff ? 'active' : ''}`}
                  onClick={() => handleNewGame(diff)}
                >
                  {{ easy: '简单', medium: '中等', hard: '困难', expert: '专家' }[diff]}
                </button>
              ))}
            </div>
          </div>

          {gameMode === 'fly' && (
            <div className="card fly-info">
              <h3 className="card-title">🪰 果蝇神经网络</h3>
              <p className="fly-description">
                此模式使用一个小型稀疏有向图作为"储液池"来辅助分析候选数字。
                这是对 <a href="https://ai.google/discover/malecns/" target="_blank" rel="noopener noreferrer">MaleCNS 果蝇连接组</a> 社区演示（如 Doomfly、nftechie/flm）的致敬，
                <strong>并非真正的生物果蝇在解数独</strong>。经典求解器仍负责合法性检查。
              </p>
              <div className="reservoir-viz">
                <div className="reservoir-title">储液池状态 ({reservoirViz.totalSynapses} 突触)</div>
                <div>活跃神经元: {reservoirViz.activeNeurons} / {81 + 64 + 9}</div>
                <div style={{ marginTop: '8px' }}>中间神经元活动:</div>
                <div className="neuron-activity">
                  {reservoirViz.interneuron.map((activation, i) => (
                    <div 
                      key={i} 
                      className="neuron"
                      style={{ backgroundColor: getNeuronColor(activation) }}
                      title={`神经元 ${i}: ${activation.toFixed(3)}`}
                    />
                  ))}
                </div>
                <div style={{ marginTop: '8px' }}>运动输出 (1-9):</div>
                <div className="neuron-activity">
                  {reservoirViz.motor.map((activation, i) => (
                    <div 
                      key={i} 
                      className="neuron"
                      style={{ 
                        backgroundColor: getNeuronColor(activation),
                        width: '16px',
                        height: '16px'
                      }}
                      title={`数字 ${i + 1}: ${activation.toFixed(3)}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card explanation-panel">
            <h3 className="card-title">📝 解题步骤</h3>
            {explanations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                点击"提示"或"自动求解"查看详细解题步骤
              </p>
            ) : (
              explanations.slice(-10).map((exp, i) => (
                <div key={i} className={`explanation-item ${exp.flyMode ? 'fly-mode' : ''}`}>
                  {exp.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showPasteModal && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📋 导入数独题目</h2>
            <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
              输入81个数字（使用0或.表示空格），可以有换行或空格：
            </p>
            <textarea
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              placeholder="例如:
530070000
600195000
098000060
800060003
400803001
700020006
060000280
000419005
000080079"
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPasteModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handlePaste}>
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <footer className="footer">
        <p>
          🪰 <strong>Fly Sudoku Expert</strong> — 灵感来自 
          <a href="https://ai.google/discover/malecns/" target="_blank" rel="noopener noreferrer"> Google/Janelia MaleCNS </a>
          果蝇连接组 (~166,700 神经元, ~125M 突触)
        </p>
        <p style={{ marginTop: '4px' }}>
          社区演示: Doomfly, Minecraft fly, 
          <a href="https://github.com/nftechie/flm" target="_blank" rel="noopener noreferrer"> nftechie/flm </a>
          (Fly Language Model)
        </p>
      </footer>
    </div>
  );
}

export default App;
