# 🪰 Fly Sudoku Expert | 果蝇数独专家

A polished browser-based Sudoku application with a classical constraint-propagation solver and an optional "fly-inspired" reservoir computing mode — paying homage to community demos built on the [MaleCNS fruit fly connectome](https://ai.google/discover/malecns/).

![Fly Sudoku Expert](https://img.shields.io/badge/Sudoku-Expert-blue)
![MaleCNS Inspired](https://img.shields.io/badge/MaleCNS-Inspired-orange)
![Vite + React](https://img.shields.io/badge/Vite-React-blueviolet)

## 🧠 Background: MaleCNS Connectome

In September 2026, Google Research and HHMI Janelia released **MaleCNS v1.0** — the complete adult male fruit fly (*Drosophila melanogaster*) central nervous system connectome:

- **~166,700 neurons**
- **~125 million synapses**
- Complete wiring diagram of a biological brain

This landmark dataset has inspired a wave of community projects wiring the fixed connectome graph to practical tasks:

| Project | Description |
|---------|-------------|
| [Google MaleCNS](https://ai.google/discover/malecns/) | Official dataset and documentation |
| **Doomfly** | Fly connectome playing DOOM |
| **Minecraft Fly** | Fly navigation in Minecraft |
| [nftechie/flm](https://github.com/nftechie/flm) | Fly Language Model — sensory drive → connectome dynamics → readout |

**This project is a practical demonstration in the same spirit** — not a biological fly solving Sudoku, but a toy reservoir network inspired by connectome-based computing.

## ✨ Features

### Classical Sudoku Solver
- **Constraint Propagation**: Naked singles, hidden singles
- **Backtracking Search**: For harder puzzles
- **Step-by-Step Explanations**: Learn solving techniques in Chinese/English
- **Hint System**: Get the next logical step with detailed reasoning

### Fly-Inspired Mode 🪰
- **Toy Reservoir Network**: Small fixed sparse directed graph (~800 synapses)
  - 81 sensory neurons (board state)
  - 64 interneurons (recurrent processing)
  - 9 motor neurons (candidate scores for digits 1-9)
- **Sensory Encoding**: Board state → neural activation patterns
- **Candidate Scoring**: Reservoir dynamics bias candidate selection
- **Classical Fallback**: Still uses constraint solver for legality checking
- **Honest Labeling**: Clearly marked as an analogy, not biological simulation

### User Experience
- 🎨 **Polished Modern UI**: Gradient accents, smooth animations
- 🇨🇳 **Chinese-Friendly**: Full Chinese interface with English labels
- ⌨️ **Keyboard Support**: Arrow keys + number keys
- 📋 **Paste Puzzles**: Import puzzles from strings (81 digits)
- 🔍 **Error Checking**: Validate current progress
- 🚀 **Auto-Solve Animation**: Watch the solver work step-by-step
- 📊 **Live Statistics**: Progress tracking, difficulty levels

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/fly-sudoku-expert.git
cd fly-sudoku-expert

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture

```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application component
├── index.css         # Global styles
├── solver.ts         # Classical Sudoku solver
│   ├── Constraint propagation (naked/hidden singles)
│   ├── Backtracking search
│   ├── Candidate computation
│   └── Step explanation generation
└── flyReservoir.ts   # Fly-inspired reservoir computing
    ├── Fixed sparse directed graph
    ├── Sensory encoding (board → activations)
    ├── Reservoir dynamics (tanh activation, decay)
    └── Motor readout (candidate scoring)
```

### Classical Solver (`solver.ts`)

The solver implements standard Sudoku techniques:

1. **Naked Single**: Cell has only one possible candidate
2. **Hidden Single**: Digit can only go in one cell within a row/column/box
3. **Backtracking**: Try candidates and recurse; backtrack on contradiction

Each step generates a Chinese explanation for learning.

### Fly Reservoir (`flyReservoir.ts`)

A toy demonstration of reservoir computing:

```
Board State (81 cells)
        ↓
[Sensory Layer: 81 neurons]
        ↓ (sparse connections, ~15% density)
[Interneuron Layer: 64 neurons] ←→ (recurrent, ~7.5% density)
        ↓ (sparse connections, ~30% density)
[Motor Layer: 9 neurons → scores for digits 1-9]
```

- **Fixed Graph**: Weights determined by seed, never trained
- **Reservoir Dynamics**: 5 timesteps of signal propagation
- **Candidate Bias**: Motor outputs bias which candidate to try first
- **Not ML**: No training or optimization — pure fixed dynamics

## 📦 Tech Stack

- **Vite** — Fast build tooling
- **React 18** — UI framework
- **TypeScript** — Type safety
- **Pure CSS** — No CSS framework dependencies

No API keys required. Fully static, deployable anywhere.

## 🌐 Deployment

### Vercel (Recommended)

```bash
npm run build
# Deploy dist/ folder to Vercel
```

Or connect your GitHub repo for automatic deployments.

### Netlify

```bash
npm run build
# Deploy dist/ folder
```

### GitHub Pages

```bash
npm run build
# Push dist/ to gh-pages branch
```

## 🎮 How to Play

1. **Select a cell** by clicking or using arrow keys
2. **Enter a number** (1-9) using keyboard or number pad
3. **Use hints** to learn solving techniques:
   - Classical mode: constraint-based reasoning
   - Fly mode: reservoir network suggestions
4. **Check progress** to find errors
5. **Auto-solve** to watch the algorithm work
6. **Import puzzles** using the paste feature (81 digits, 0 or . for blanks)

## 🔬 Technical Notes

### Why "Fly-Inspired"?

The MaleCNS connectome represents a complete biological neural network. Community projects like Doomfly and nftechie/flm demonstrate that:

1. Fixed network topology can produce useful computation
2. Sensory encoding → network dynamics → motor readout is a general pattern
3. You don't need training if the graph structure itself encodes computation

Our toy reservoir follows this pattern at tiny scale (~154 neurons vs 166,700), serving as an accessible demonstration rather than a biological simulation.

### Reservoir Computing Basics

Reservoir computing uses a fixed recurrent network (the "reservoir") to transform inputs into a high-dimensional space where linear readout can solve tasks. Key properties:

- **Echo State Property**: Reservoir dynamics fade over time
- **Separation Property**: Different inputs produce different trajectories
- **Approximation Property**: Linear readout can approximate desired outputs

Our implementation is a simplified demonstration without the formal guarantees of trained reservoirs.

## 📚 References

### MaleCNS Connectome
- [Google AI Blog: MaleCNS](https://ai.google/discover/malecns/)
- [Janelia FlyEM Project](https://www.janelia.org/project-team/flyem)
- [bioRxiv Preprint](https://www.biorxiv.org/) (search "MaleCNS")

### Community Projects
- [nftechie/flm](https://github.com/nftechie/flm) — Fly Language Model
- Doomfly — Fly connectome playing DOOM
- Minecraft Fly — Fly navigation demos

### Reservoir Computing
- Jaeger, H. (2001). The "echo state" approach to analysing and training recurrent neural networks.
- Maass, W., Natschläger, T., & Markram, H. (2002). Real-time computing without stable states.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Google Research & HHMI Janelia for the MaleCNS dataset
- The connectome community for inspiring demonstrations
- Sudoku enthusiasts worldwide

---

<p align="center">
  <strong>🪰 Not a real fly solving Sudoku — just a fun tribute to connectome computing! 🧩</strong>
</p>
