# Naveen Gadugina — Portfolio

Personal portfolio website hosted on GitHub Pages at **[naveengadugina678.github.io](https://naveengadugina678.github.io)**.

Built with plain HTML, CSS, and vanilla JavaScript — no frameworks or build step required.

## Live Site

- **Portfolio:** https://naveengadugina678.github.io
- **Projects Archive:** https://naveengadugina678.github.io/projects.html
- **Interests:** https://naveengadugina678.github.io/interests.html

## Featured Projects

| Project | Stack | Summary | Links |
| :--- | :--- | :--- | :--- |
| **Tensora** | C++20, OpenMP, pybind11 | From-scratch strided tensor and reverse-mode autograd engine with cache-tiled, multi-threaded GEMM (`10.6x`–`14.3x` faster than naive matmul). | [GitHub](https://github.com/NaveenGadugina678/tensora-cpp-autograd) |
| **PulseBoard** | Python, FastAPI, SQLite, WebSockets | Real-time cached backend service with Single-Flight stampede protection and token-bucket rate limiting (`-91.3%` p99 latency, `98%` DB load saved under cold stampede). | [GitHub](https://github.com/NaveenGadugina678/pulseboard-realtime-backend) |
| **VeriRank** | Python, FastAPI, NumPy, SciPy | Hybrid BM25 + dense SVD retrieval pipeline with a learned pairwise re-ranker and claim-level self-verification gate (`1.00` F1 on adversarial checks). | [GitHub](https://github.com/NaveenGadugina678/verirank-hybrid-rag) |
| **QuantLoRA** | Python, PyTorch, NumPy, FastAPI | From-scratch LoRA fine-tuning (`r=2..16`) and post-training INT8/INT4 weight quantization (`6.25x` memory compression with zero Macro-F1 drop). | [GitHub](https://github.com/NaveenGadugina678/quantlora-finetune-quantize) |
| **Monkey Language Interpreter** | Go | Tree-walking interpreter for the Monkey programming language with a custom lexer, parser, and AST evaluator. | [GitHub](https://github.com/NaveenGadugina678/Monkey-Programming-Language) |
| **Stock Price Direction Predictor** | Python, scikit-learn | Machine learning model predicting next-day stock price direction from historical market data and technical indicators. | [GitHub](https://github.com/NaveenGadugina678/Stock-Price-Direction-Predictor) |
| **Space Invaders** | C++, raylib | Object-oriented Space Invaders arcade game compiled to the web. | [GitHub](https://github.com/NaveenGadugina678/Space-Invaders) · [Play](https://naveengadugina678.github.io/Space-Invaders/) |
| **Chess** | C++, raylib | Desktop chess game built in C++ with raylib. | [GitHub](https://github.com/NaveenGadugina678/Chess-Game) |

## Repository Structure

```text
.
├── index.html          # Home page (hero, about, tech stack, featured projects, contact)
├── projects.html       # Full project archive
├── interests.html      # Personal interests page
├── style.css           # Layout, responsive styles, and CSS hero artwork
└── assets/
    ├── cv/
    │   └── cv.pdf      # Downloadable CV
    └── photos/
        └── Dopamine_structure.svg
